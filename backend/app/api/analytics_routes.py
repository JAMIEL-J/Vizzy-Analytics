"""
Analytics API routes.

Belongs to: API layer
Responsibility: Provide real-time analytics and statistics for user dashboards
Restrictions: Returns computed metrics from actual dataset data

Version: 3.0 - Dynamic Analytics Engine with Domain Detection
"""

from typing import Dict, Any, Optional, List
from uuid import UUID
import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.deps import DBSession, AuthenticatedUser
from app.models.dataset import Dataset
from app.services.dataset_version_service import get_latest_version
from app.services.analytics import (
    detect_domain,
    get_domain_confidence,
    filter_columns,
    generate_kpis,
    recommend_charts,
    DomainType
)
from app.services.analytics.pivot_generator import generate_pivot_config, generate_pivot_data
import pandas as pd
import numpy as np
import os
from functools import lru_cache


def _safe_read_csv_impl(file_path: str) -> pd.DataFrame:
    """
    Load a CSV and safely coerce object columns that are actually numeric.
    Phase 1 Expert Sanitizer: strips currency symbols, commas, percentage signs,
    and whitespace before attempting numeric conversion.
    """
    import re
    df = pd.read_csv(file_path, low_memory=False)
    for col in df.select_dtypes(include=["object"]).columns:
        try:
            # Phase 1: Strip common non-numeric symbols ($, commas, %, spaces)
            series = df[col].astype(str).str.replace(r'[$,% ]', '', regex=True)
            converted = pd.to_numeric(series, errors="coerce")
            total_non_null = df[col].notna().sum()
            if total_non_null > 0 and (converted.notna().sum() / total_non_null) > 0.8:
                df[col] = converted
        except Exception:
            pass
    return df


@lru_cache(maxsize=8)
def _cached_read_csv(file_path: str, mtime: float) -> pd.DataFrame:
    """LRU-cached CSV reader keyed by (path, mtime). Auto-invalidates on file change."""
    return _safe_read_csv_impl(file_path)


def _safe_read_csv(file_path: str) -> pd.DataFrame:
    """Read CSV with automatic caching. Cache busts when file is modified."""
    try:
        mtime = os.path.getmtime(file_path)
    except OSError:
        mtime = 0.0
    return _cached_read_csv(file_path, mtime).copy()



router = APIRouter()


# =============================================================================
# Response Schemas
# =============================================================================


class DashboardAnalyticsResponse(BaseModel):
    """Response containing dashboard analytics data."""
    dataset_name: str
    total_rows: int
    domain: str
    domain_confidence: str
    kpis: Dict[str, Any]
    charts: Dict[str, Any]
    columns: Dict[str, List[str]]
    target_column: Optional[str] = None
    target_values: List[str] = []
    geo_filters: Dict[str, List[str]] = {}
    raw_data: List[Dict[str, Any]] = []
    chart_configs: Dict[str, Any] = {}
    data_quality: List[Dict[str, Any]] = []


class DashboardStateRequest(BaseModel):
    """Request payload containing the full dashboard state from Zustand."""
    dataset_id: UUID
    target_value: Optional[str] = None
    active_filters: Dict[str, List[str]] = {}
    chart_overrides: Dict[str, Any] = {}
    classification_overrides: Dict[str, str] = {}
    selected_domain: Optional[str] = None


# =============================================================================
# Helper Functions
# =============================================================================


def _find_target_column(df: pd.DataFrame) -> Optional[str]:
    """Find the most likely target column."""
    target_keywords = ['churn', 'outcome', 'status', 'default', 'converted', 'target', 'label']
    categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
    
    for col in categorical_cols:
        col_lower = col.lower()
        if any(kw in col_lower for kw in target_keywords):
            if df[col].nunique() <= 5:
                return col
    
    # Fallback: any binary categorical
    for col in categorical_cols:
        if df[col].nunique() == 2:
            return col
    
    return None


def _currency_symbol_from_code(code: Optional[str]) -> str:
    mapping = {
        "USD": "$",
        "GBP": "£",
        "EUR": "€",
        "INR": "₹",
        "JPY": "¥",
        "CNY": "¥",
        "KRW": "₩",
        "AUD": "A$",
        "CAD": "C$",
        "SGD": "S$",
        "NZD": "NZ$",
        "BRL": "R$",
        "MXN": "Mex$",
    }
    return mapping.get((code or "").upper(), "$")


def _is_currency_label(text: str) -> bool:
    label = (text or "").lower()
    keywords = [
        "revenue", "profit", "income", "earnings", "cost", "expense",
        "price", "charges", "payment", "budget", "salary", "wage",
        "fee", "sales", "discount", "amount", "value",
    ]
    return any(kw in label for kw in keywords)


def _format_narrative_value(value: Any, is_currency: bool = False, currency_symbol: str = "$") -> str:
    if not isinstance(value, (int, float, np.integer, np.floating)):
        return str(value)

    num = float(value)
    abs_num = abs(num)
    sign = "-" if num < 0 else ""

    if abs_num >= 1_000_000_000:
        base = f"{sign}{abs_num / 1_000_000_000:.2f}".rstrip("0").rstrip(".") + "B"
    elif abs_num >= 1_000_000:
        base = f"{sign}{abs_num / 1_000_000:.2f}".rstrip("0").rstrip(".") + "M"
    elif abs_num >= 1_000:
        base = f"{sign}{abs_num / 1_000:.2f}".rstrip("0").rstrip(".") + "K"
    else:
        if num.is_integer():
            base = f"{int(num):,}"
        else:
            base = f"{num:,.2f}".rstrip("0").rstrip(".")

    return f"{currency_symbol}{base}" if is_currency else base


# =============================================================================
# API Endpoints
# =============================================================================


@router.post(
    "/analytics/dashboard",
    response_model=DashboardAnalyticsResponse,
    summary="Get dashboard analytics",
)
def get_dashboard_analytics(
    state: DashboardStateRequest,
    session: DBSession,
    current_user: AuthenticatedUser,
) -> DashboardAnalyticsResponse:
    """
    Get analytics data for user dashboard.
    
    Uses intelligent domain detection to generate appropriate KPIs and charts.
    """
    try:
        if not state.dataset_id:
            raise HTTPException(status_code=400, detail="Please provide a dataset_id")
        
        # Load dataset
        latest_version = get_latest_version(session=session, dataset_id=state.dataset_id)
        if not latest_version:
            raise HTTPException(status_code=404, detail="Version not found")

        # Prefer cleaned data when available, fall back to raw
        file_path = (
            latest_version.cleaned_reference
            if latest_version.cleaned_reference
            else latest_version.source_reference
        )
        df = _safe_read_csv(file_path)
        
        # Detect domain
        domain, scores = detect_domain(df)
        
        # Apply manual domain override if provided
        if state.selected_domain and state.selected_domain.lower() != 'auto':
            try:
                # Validate the domain exists in DomainType
                domain = DomainType(state.selected_domain.lower())
            except ValueError:
                # Log warning and fall back to detected domain if invalid override provided
                print(f"Warning: Invalid domain override '{state.selected_domain}', falling back to detected: {domain}")
        
        confidence = get_domain_confidence(scores)
        
        # Classify columns
        classification = filter_columns(df, domain)
        
        # Apply classification overrides
        if state.classification_overrides:
            for col, role in state.classification_overrides.items():
                if col in df.columns:
                    # Remove from current lists
                    if col in classification.metrics: classification.metrics.remove(col)
                    if col in classification.dimensions: classification.dimensions.remove(col)
                    if col in classification.targets: classification.targets.remove(col)
                    if col in classification.dates: classification.dates.remove(col)
                    if col in classification.excluded: classification.excluded.remove(col)
                    
                    # Add to new list
                    role_lower = role.lower()
                    if role_lower.startswith('metric'):
                        classification.metrics.append(col)
                    elif role_lower == 'dimension':
                        classification.dimensions.append(col)
                    elif role_lower == 'target':
                        classification.targets.append(col)
                    elif role_lower == 'date':
                        classification.dates.append(col)
                    elif role_lower == 'excluded':
                        classification.excluded.append(col)
        
        # Find target column for filtering
        target_col = classification.targets[0] if classification.targets else _find_target_column(df)
        target_values = []
        if target_col:
            target_values = [str(x) for x in df[target_col].dropna().unique()]
        
        # Apply target filter if specified
        df_filtered = df.copy()
        if state.target_value and state.target_value.lower() != 'all' and target_col:
            positive_keywords = ['yes', 'true', '1']
            negative_keywords = ['no', 'false', '0']
            
            if state.target_value.lower() in positive_keywords:
                search_vals = positive_keywords + ['Yes', 'True', 1, True]
            elif state.target_value.lower() in negative_keywords:
                search_vals = negative_keywords + ['No', 'False', 0, False]
            else:
                search_vals = [state.target_value]
            
            df_filtered = df[df[target_col].astype(str).str.lower().isin([str(x).lower() for x in search_vals])].copy()
        
        # Parse and apply multi-column filters
        active_filters = state.active_filters or {}
        
        for col, values in active_filters.items():
            if col in df_filtered.columns and values:
                df_filtered = df_filtered[
                    df_filtered[col].astype(str).isin([str(v) for v in values])
                ]
        
        # Extract filter options for ALL dimension columns (not just geo)
        # This allows filtering by Category, Segment, Region, Product, etc.
        geo_filters = {}
        geo_filters_truncated: Dict[str, int] = {}  # {dim: total_count} for truncated dims
        for dim in classification.dimensions:
            unique_count = df[dim].nunique()
            if unique_count < 2:
                continue
            if unique_count <= 500:
                unique_vals = df[dim].dropna().unique()
                geo_filters[dim] = sorted([str(v) for v in unique_vals])
            elif unique_count <= 1000:
                # Include top 50 sorted values; mark as truncated
                unique_vals = df[dim].dropna().value_counts().head(50).index.tolist()
                geo_filters[dim] = sorted([str(v) for v in unique_vals])
                geo_filters_truncated[dim] = unique_count
        
        # Generate KPIs from filtered data (values should reflect filters)
        kpis = generate_kpis(df_filtered, domain, classification)

        # FIX: Chart STRUCTURE (which charts appear) is determined from the FULL dataset.
        # Only DATA values are recomputed from df_filtered.
        # This prevents new charts appearing / old ones disappearing when a filter is applied,
        # which is how Power BI / Tableau / Looker behave.
        charts_full = recommend_charts(df, domain, classification, overrides=state.chart_overrides)

        is_filtered = len(df_filtered) < len(df)
        if is_filtered:
            charts_filtered = recommend_charts(df_filtered, domain, classification, overrides=state.chart_overrides)

            # Build a title → filtered chart lookup.
            filtered_by_title: Dict[str, Any] = {
                v["title"]: v for v in charts_filtered.values()
            }

            from app.services.analytics.chart_recommender import (
                _smart_aggregate, _safe_groupby_sum, _safe_groupby_mean, 
                _get_time_trend, _get_churn_rate_by_segment, _get_value_at_risk,
                _get_stacked_churn_counts, _get_lifecycle_cohorts, _distribution_chart,
                _get_churn_count_by_segment, _get_churned_vs_retained_avg, _safe_value_counts
            )

            charts: Dict[str, Any] = {}
            for slot, full_chart in charts_full.items():
                title = full_chart["title"]
                flt = filtered_by_title.get(title)

                if flt and flt.get("data"):
                    # Correct match: same chart title found in filtered run.
                    charts[slot] = {**full_chart, "data": flt["data"]}
                elif full_chart.get("dimension"):
                    # Chart dropped by recommendation engine (e.g. due to nunique < 2).
                    # Manually re-aggregate if we have the metadata.
                    dim = full_chart["dimension"]
                    met = full_chart.get("metric")
                    agg = full_chart.get("aggregation", "sum")
                    ctype = full_chart["type"]
                    
                    try:
                        manual_data = []
                        # 1. Specialized Categorical Handling (Churn / Rates / Counts)
                        if met == target_col or (not met and 'Churn' in title):
                            if ctype == 'stacked_bar' or ctype == 'stacked':
                                manual_data = _get_stacked_churn_counts(df_filtered, target_col, dim)
                            elif agg == 'count' or 'Volume' in title or 'Count' in title:
                                manual_data = _get_churn_count_by_segment(df_filtered, target_col, dim)
                            else:
                                # Default to Rate for Churn targets
                                if pd.api.types.is_numeric_dtype(df[dim]) and df[dim].nunique() > 10:
                                    manual_data = _get_lifecycle_cohorts(df_filtered, dim, target_col)
                                else:
                                    manual_data = _get_churn_rate_by_segment(df_filtered, target_col, dim)
                        
                        # 2. Financial / Time / Numeric Handling
                        elif ctype in ('line', 'area', 'area_bounds'):
                            if dim in classification.dates:
                                # Guard against empty metrics list
                                fallback_metric = classification.metrics[0] if classification.metrics else None
                                if met or fallback_metric:
                                    manual_data = _get_time_trend(df_filtered, dim, met or fallback_metric)
                            elif met:
                                manual_data = _safe_groupby_mean(df_filtered, dim, met)
                        
                        elif 'at Risk' in title and met:
                            manual_data = _get_value_at_risk(df_filtered, target_col, dim, met)
                        
                        # 3. Generic Fallback Re-aggregation (Numeric vs Distribution)
                        if not manual_data:
                            if met and pd.api.types.is_numeric_dtype(df[met]):
                                if agg == 'mean':
                                    manual_data = _safe_groupby_mean(df_filtered, dim, met)
                                else:
                                    manual_data = _safe_groupby_sum(df_filtered, dim, met)
                            else:
                                # Distribution charts for categorical inputs or fallback
                                manual_data = _safe_value_counts(df_filtered, dim, limit=15)
                        
                        charts[slot] = {**full_chart, "data": manual_data or []}
                    except Exception as e:
                        print(f"Error in manual re-aggregation for {title}: {e}")
                        # Final resort: raw value counts of the dimension
                        try:
                            fallback_counts = _safe_value_counts(df_filtered, dim, limit=15)
                            charts[slot] = {**full_chart, "data": fallback_counts}
                        except Exception as e:
                            print(f"Final resort failed for {title}: {e}")
                            charts[slot] = {**full_chart, "data": []}
                else:
                    charts[slot] = {**full_chart, "data": []}
        else:
            charts = charts_full


        
        dataset = session.get(Dataset, state.dataset_id)
        dataset_name = dataset.name if dataset else latest_version.source_reference.split('/')[-1]

        # Prepare raw data payload (50k limit) with Stratified Sampling
        max_raw_rows = 50000
        total_len = len(df)
        
        if total_len <= max_raw_rows:
            df_raw = df.copy()
        else:
            # Prefer primary dimension from recommendations for stratification
            primary_dim = None
            for chart in charts_full.values():
                d = chart.get("dimension")
                if d and d in df.columns and df[d].nunique() > 1:
                    primary_dim = d
                    break
            
            if primary_dim:
                # Sample proportionally per group, then take top/random to fill budget
                frac = max_raw_rows / total_len
                df_raw = df.groupby(primary_dim, group_keys=False).apply(
                    lambda x: x.sample(n=max(1, int(len(x) * frac)), random_state=42) if len(x) > 0 else x
                )
                # If we undersampled due to rounding, fill up with random sample from remainders
                if len(df_raw) < max_raw_rows:
                    remaining_indices = df.index.difference(df_raw.index)
                    if not remaining_indices.empty:
                        extra_n = min(max_raw_rows - len(df_raw), len(remaining_indices))
                        extra_df = df.loc[remaining_indices].sample(n=extra_n, random_state=42)
                        df_raw = pd.concat([df_raw, extra_df])
                elif len(df_raw) > max_raw_rows:
                    df_raw = df_raw.sample(n=max_raw_rows, random_state=42)
            else:
                df_raw = df.sample(n=max_raw_rows, random_state=42).reset_index(drop=True)
                
        # Final safety: Ensure no NaN/Infinity break the JSON response
        raw_data_payload = df_raw.replace([np.inf, -np.inf], np.nan).where(pd.notnull(df_raw), None).to_dict(orient="records")

        # Prepare chart configs (extract structural info from charts_full)
        chart_configs = {}
        for slot, chart in charts_full.items():
            dim = chart.get("dimension")
            chart_configs[slot] = {
                "title": chart["title"],
                "type": chart["type"],
                "dimension": dim,
                "metric": chart.get("metric"),
                "aggregation": chart.get("aggregation"),
                "granularity": chart.get("granularity"),
                "is_date": dim in classification.dates if dim else False
            }

        # Data quality: null % per column
        total = len(df)
        data_quality = []
        for col in df.columns:
            null_count = int(df[col].isna().sum())
            null_pct = round(null_count / total * 100, 1) if total > 0 else 0
            dtype = str(df[col].dtype)
            action = "coerced" if col in classification.metrics and df[col].dtype.name in ['float64', 'int64'] else "none"
            data_quality.append({"column": col, "null_pct": null_pct, "null_count": null_count, "dtype": dtype, "action": action})

        return DashboardAnalyticsResponse(
            dataset_name=dataset_name,
            total_rows=len(df),
            domain=domain.value,
            domain_confidence=confidence,
            kpis=kpis,
            charts=charts,
            columns={
                "dimensions": classification.dimensions,
                "metrics": classification.metrics,
                "targets": classification.targets,
                "dates": classification.dates,
                "excluded": classification.excluded
            },
            target_column=target_col,
            target_values=target_values,
            geo_filters=geo_filters,
            raw_data=raw_data_payload,
            chart_configs=chart_configs,
            data_quality=data_quality,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing dataset: {str(e)}"
        )


@router.get(
    "/analytics/pivot",
    summary="Get pivot table data",
)
def get_pivot_table(
    session: DBSession,
    current_user: AuthenticatedUser,
    dataset_id: Optional[UUID] = None,
) -> Dict[str, Any]:
    """
    Get auto-generated pivot table data for a dataset.
    
    Uses domain detection to generate the optimal pivot configuration.
    """
    try:
        if not dataset_id:
            raise HTTPException(status_code=400, detail="Please provide a dataset_id")
        
        # Load dataset
        latest_version = get_latest_version(session=session, dataset_id=dataset_id)
        if not latest_version:
            raise HTTPException(status_code=404, detail="Version not found")
            
        file_path = (
            latest_version.cleaned_reference
            if latest_version.cleaned_reference
            else latest_version.source_reference
        )
        df = _safe_read_csv(file_path)
        
        # Detect domain
        domain, _ = detect_domain(df)
        
        # Classify columns
        classification = filter_columns(df, domain)
        
        # Generate pivot configuration
        pivot_config = generate_pivot_config(df, classification, domain.value)
        
        # Generate pivot data
        pivot_data = generate_pivot_data(df, pivot_config)
        
        return {
            "success": True,
            "domain": domain.value,
            "pivot": pivot_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating pivot table: {str(e)}"
        )


@router.get(
    "/analytics/correlation",
    summary="Get feature correlation matrix",
)
def get_correlation_matrix(
    session: DBSession,
    current_user: AuthenticatedUser,
    dataset_id: Optional[UUID] = None,
    max_cols: int = 10,
) -> Dict[str, Any]:
    """
    Compute Pearson correlation matrix for numeric columns.

    Returns:
        labels:        original column names
        displayLabels: truncated display names
        matrix:        2D list [row][col] of correlation values
        pairs:         flat [{row, col, rowLabel, colLabel, value}]
        n:             matrix size
    """
    try:
        if not dataset_id:
            raise HTTPException(status_code=400, detail="Please provide a dataset_id")

        latest_version = get_latest_version(session=session, dataset_id=dataset_id)
        if not latest_version:
            raise HTTPException(status_code=404, detail="Version not found")

        file_path = (
            latest_version.cleaned_reference
            if latest_version.cleaned_reference
            else latest_version.source_reference
        )
        df = _safe_read_csv(file_path)

        # Select numeric columns — drop constants, near-binary, sparse
        numeric = df.select_dtypes(include=["number"])
        numeric = numeric.loc[:, numeric.std() > 1e-6]
        numeric = numeric.loc[:, numeric.nunique() > 2]
        numeric = numeric.dropna(axis=1, thresh=int(len(df) * 0.5))

        # Limit to max_cols most-variant columns
        if len(numeric.columns) > max_cols:
            top_cols = numeric.std().nlargest(max_cols).index.tolist()
            numeric = numeric[top_cols]

        if len(numeric.columns) < 2:
            raise HTTPException(
                status_code=422,
                detail="Not enough numeric columns to compute correlation (need ≥2).",
            )

        corr = numeric.corr(method="pearson").round(3)
        labels = corr.columns.tolist()
        display_labels = [lbl if len(lbl) <= 14 else lbl[:13] + "…" for lbl in labels]
        matrix = corr.values.tolist()

        pairs = [
            {
                "row": ri,
                "col": ci,
                "rowLabel": labels[ri],
                "colLabel": labels[ci],
                "value": round(float(corr.iloc[ri, ci]), 3),
            }
            for ri in range(len(labels))
            for ci in range(len(labels))
        ]

        return {
            "labels": labels,
            "displayLabels": display_labels,
            "matrix": matrix,
            "pairs": pairs,
            "n": len(labels),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error computing correlation: {str(e)}",
        )


# =============================================================================
# Dashboard Insight Narrative
# =============================================================================

class NarrativeRequest(BaseModel):
    """Request payload for generating a dashboard insight narrative."""
    dataset_id: UUID
    kpis: Dict[str, Any]
    domain: str
    dataset_name: str
    charts: Optional[Dict[str, Any]] = None


NARRATIVE_SYSTEM_PROMPT = """You are a senior data analyst generating an executive insight brief for a BI dashboard.

Your job is to analyze ALL the KPIs AND chart breakdowns provided and write clear, factual insights.

Output format — write exactly 5-7 numbered points:
1. [Headline] The single most important finding from the overall data.
2. [Chart Insight] For EACH chart breakdown provided, write one point about its key pattern — which category dominates, which underperforms, concentration risk.
3. [Trend] If a trend chart is present, note the direction and rate of change.
4. [Risk] One area of concern or risk from the data.
5. [Action] One concrete recommendation or question worth investigating.

Example output format:
1. Total revenue stands at $2.3M with a 12.3% upward trend, driven by strong performance in Q4.
2. California dominates state revenue at $763K (33%), while Texas underperforms at a loss of $25.7K.
3. Month-to-month contracts account for 89% of churn, signaling a retention risk in short-term customers.
4. Revenue trend shows consistent growth from $28.7K in 2015 to $83.8K in 2017, a 191% increase.
5. Average order value declined 17.5% — investigate whether aggressive discounting (15.6% impact) is eroding margins.

Rules:
- Start each point with the point number followed by a period and space.
- Use actual numbers and percentages from the data provided.
- Reference specific categories, segments, or time periods by name.
- Every point must contain at least one data point from the provided data.
- Do NOT use markdown formatting, bold, headers, or special characters. Plain numbered text only.
- Do NOT invent data. Only reference what is explicitly provided.
- Write in third person ("The data shows..." not "You should...")."""


def _summarize_charts(charts: Dict[str, Any], max_charts: int = 8, currency_symbol: str = "$") -> str:
    """Build a concise text summary of chart data for the LLM prompt."""
    if not charts:
        return ""

    summaries = []
    count = 0

    for chart_id, chart in charts.items():
        if count >= max_charts:
            break

        title = chart.get("title", chart_id)
        chart_type = chart.get("type", "unknown")
        data = chart.get("data", [])

        if not isinstance(data, list) or len(data) == 0:
            continue

        first_row = data[0]
        if not isinstance(first_row, dict):
            continue

        keys = list(first_row.keys())
        # Identify dimension (string) and metric (number) columns
        dim_col = next((k for k in keys if isinstance(first_row.get(k), str)), keys[0])
        metric_col = next((k for k in keys if isinstance(first_row.get(k), (int, float))), None)

        if not metric_col:
            continue

        # Extract values
        rows = [(row.get(dim_col, "?"), row.get(metric_col, 0)) for row in data if row.get(metric_col) is not None]
        if not rows:
            continue

        values = [v for _, v in rows]
        total = sum(values) if values else 0
        metric_is_currency = _is_currency_label(f"{title} {metric_col}")

        # Build summary based on chart type
        if chart_type in ("pie", "donut", "doughnut"):
            # Show top 3 segments with percentages
            sorted_rows = sorted(rows, key=lambda x: x[1], reverse=True)
            top = sorted_rows[:3]
            parts = [
                f"{name}: {_format_narrative_value(val, metric_is_currency, currency_symbol)} ({val/total*100:.1f}%)"
                if total else f"{name}: {_format_narrative_value(val, metric_is_currency, currency_symbol)}"
                for name, val in top
            ]
            total_txt = _format_narrative_value(total, metric_is_currency, currency_symbol) if total else ""
            summaries.append(f"[{title}] Distribution — {', '.join(parts)}" + (f" (total: {total_txt})" if total else ""))

        elif chart_type in ("line", "area"):
            # Show start, end, direction
            if len(rows) >= 2:
                start_name, start_val = rows[0]
                end_name, end_val = rows[-1]
                direction = "increasing" if end_val > start_val else "decreasing" if end_val < start_val else "flat"
                pct = ((end_val - start_val) / start_val * 100) if start_val != 0 else 0
                start_txt = _format_narrative_value(start_val, metric_is_currency, currency_symbol)
                end_txt = _format_narrative_value(end_val, metric_is_currency, currency_symbol)
                summaries.append(f"[{title}] Trend — {direction} from {start_txt} ({start_name}) to {end_txt} ({end_name}), change: {pct:+.1f}%")

        else:
            # bar, hbar, etc — show top 3 and bottom 1
            sorted_rows = sorted(rows, key=lambda x: x[1], reverse=True)
            top3 = sorted_rows[:3]
            bottom1 = sorted_rows[-1] if len(sorted_rows) > 3 else None

            parts = [f"{name}: {_format_narrative_value(val, metric_is_currency, currency_symbol)}" for name, val in top3]
            line = f"[{title}] Top — {', '.join(parts)}"
            if bottom1:
                line += f" | Lowest — {bottom1[0]}: {_format_narrative_value(bottom1[1], metric_is_currency, currency_symbol)}"
            summaries.append(line)

        count += 1

    return "\n".join(summaries)


@router.post("/analytics/narrative")
async def generate_narrative(
    payload: NarrativeRequest,
    session: DBSession,
    current_user: AuthenticatedUser,
):
    """Generate an AI insight narrative for the current dashboard state."""
    from app.core.llm_client import get_llm_client
    from app.services.dataset_service import check_dataset_access

    try:
        # Authorization check
        if not check_dataset_access(session, payload.dataset_id, UUID(current_user.user_id), current_user.role):
            raise HTTPException(status_code=403, detail="Unauthorized access to dataset.")

        # Determine narrative currency symbol
        currency_symbol = _currency_symbol_from_code("USD")
        for _, kpi in payload.kpis.items():
            symbol = kpi.get("currency_symbol")
            if isinstance(symbol, str) and symbol.strip():
                currency_symbol = symbol.strip()
                break

        # Build KPI summary
        kpi_lines = []
        for key, kpi in payload.kpis.items():
            title = kpi.get("title", key)
            value = kpi.get("value", "N/A")
            fmt = kpi.get("format", "number")
            is_currency = str(fmt).lower() == "currency" or _is_currency_label(title)
            value_txt = _format_narrative_value(value, is_currency=is_currency, currency_symbol=currency_symbol)
            trend = kpi.get("trend")
            trend_str = ""
            if trend is not None:
                try:
                    trend_val = float(trend)
                    trend_str = f" (trend: {trend_val:+.1f}%)"
                except (ValueError, TypeError):
                    trend_str = " (trend: --)"
            kpi_lines.append(f"- {title}: {value_txt} [{fmt}]{trend_str}")

        kpi_summary = "\n".join(kpi_lines)

        # Build chart summary
        chart_summary = ""
        if payload.charts:
            chart_summary = _summarize_charts(payload.charts, currency_symbol=currency_symbol)

        # Compose user prompt
        user_prompt = f"""Dataset: {payload.dataset_name}
Domain: {payload.domain}

KPI Results:
{kpi_summary}"""

        if chart_summary:
            user_prompt += f"""

Chart Breakdowns:
{chart_summary}"""

        user_prompt += "\n\nAnalyze all the data above and write an executive insight brief."

        client = get_llm_client()
        response = await client.complete(
            system_prompt=NARRATIVE_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.3,
            max_tokens=512,
        )

        return {"narrative": response.content.strip()}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating narrative: {str(e)}",
        )
