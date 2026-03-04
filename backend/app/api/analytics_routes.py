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
    geo_filters: Dict[str, List[str]] = {}  # {"customer_state": ["CA", "TX", ...], ...}


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


# =============================================================================
# API Endpoints
# =============================================================================


@router.get(
    "/analytics/dashboard",
    response_model=DashboardAnalyticsResponse,
    summary="Get dashboard analytics",
)
def get_dashboard_analytics(
    session: DBSession,
    current_user: AuthenticatedUser,
    dataset_id: Optional[UUID] = None,
    target_value: Optional[str] = None,
    filters: str = "{}",  # JSON: {"Region": ["East"], "Segment": ["Consumer"]}
) -> DashboardAnalyticsResponse:
    """
    Get analytics data for user dashboard.
    
    Uses intelligent domain detection to generate appropriate KPIs and charts.
    """
    try:
        if not dataset_id:
            raise HTTPException(status_code=400, detail="Please provide a dataset_id")
        
        # Load dataset
        latest_version = get_latest_version(session=session, dataset_id=dataset_id)
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
        confidence = get_domain_confidence(scores)
        
        # Classify columns
        classification = filter_columns(df, domain)
        
        # Find target column for filtering
        target_col = classification.targets[0] if classification.targets else _find_target_column(df)
        target_values = []
        if target_col:
            target_values = [str(x) for x in df[target_col].dropna().unique()]
        
        # Apply target filter if specified
        df_filtered = df.copy()
        if target_value and target_value.lower() != 'all' and target_col:
            positive_keywords = ['yes', 'true', '1']
            negative_keywords = ['no', 'false', '0']
            
            if target_value.lower() in positive_keywords:
                search_vals = positive_keywords + ['Yes', 'True', 1, True]
            elif target_value.lower() in negative_keywords:
                search_vals = negative_keywords + ['No', 'False', 0, False]
            else:
                search_vals = [target_value]
            
            df_filtered = df[df[target_col].astype(str).str.lower().isin([str(x).lower() for x in search_vals])].copy()
        
        # Parse and apply multi-column filters
        try:
            active_filters: Dict[str, List[str]] = json.loads(filters)
        except (json.JSONDecodeError, TypeError):
            active_filters = {}
        
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
        charts_full = recommend_charts(df, domain, classification)

        is_filtered = len(df_filtered) < len(df)
        if is_filtered:
            charts_filtered = recommend_charts(df_filtered, domain, classification)

            # Build a title → filtered chart lookup.
            # Title is STABLE across runs (derived from column names, not data cardinality).
            # Slot numbers are NOT stable — they are re-assigned after deduplication
            # on every call, so slot_1 in the full run ≠ slot_1 in the filtered run.
            filtered_by_title: Dict[str, Any] = {
                v["title"]: v for v in charts_filtered.values()
            }

            charts: Dict[str, Any] = {}
            for slot, full_chart in charts_full.items():
                title = full_chart["title"]
                flt = filtered_by_title.get(title)

                if flt and flt.get("data"):
                    # Correct match: same chart title found in filtered run.
                    # Use full-df structure (type, title, meta) + filtered data values.
                    charts[slot] = {**full_chart, "data": flt["data"]}
                else:
                    # Chart didn't make it through filtering (e.g. only 1 category left
                    # after filter, or all rows excluded). Keep the slot so layout stays
                    # stable, but send empty data → frontend shows "No data for current filter".
                    charts[slot] = {**full_chart, "data": []}
        else:
            charts = charts_full


        
        dataset = session.get(Dataset, dataset_id)
        dataset_name = dataset.name if dataset else latest_version.source_reference.split('/')[-1]

        return DashboardAnalyticsResponse(
            dataset_name=dataset_name,
            total_rows=len(df_filtered),
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
            geo_filters=geo_filters
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
