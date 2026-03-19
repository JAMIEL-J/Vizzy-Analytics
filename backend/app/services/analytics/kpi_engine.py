"""
KPI Engine - Generates calculated KPIs based on domain and data.

Provides domain-specific KPIs with calculated metrics (rates, ratios, comparisons).
"""

import logging
import re
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import warnings
import pandas as pd
from .domain_detector import DomainType
from .column_filter import ColumnClassification

logger = logging.getLogger(__name__)


def _safe_to_datetime(series: pd.Series) -> pd.Series:
    """Parse mixed date formats without noisy parser warnings."""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        try:
            return pd.to_datetime(series, errors='coerce', format='mixed', dayfirst=True)
        except (TypeError, ValueError):
            return pd.to_datetime(series, errors='coerce', dayfirst=True)


def _beautify_column_name(col: str) -> str:
    """Convert column name to professional business term."""
    # Basic cleanup: totalcharges -> Total Charges, monthly_charges -> Monthly Charges
    # This is a local copy of the formatter to avoid circular imports
    return col.replace('_', ' ').replace('-', ' ').title()


@dataclass
class KPI:
    """Represents a single KPI."""
    key: str
    title: str
    value: Any
    format: str  # number, currency, percent, text
    icon: str    # icon type for frontend
    confidence: str  # HIGH, MEDIUM, LOW
    reason: str
    trend: Optional[float] = None  # percentage change (e.g., 14.5 for +14.5%)
    trend_label: Optional[str] = None  # e.g., "vs Last Month"
    subtitle: Optional[str] = None  # e.g., "209 unique orders"


def _find_column(df: pd.DataFrame, keywords: List[str], classification: ColumnClassification, search_excluded: bool = False) -> Optional[str]:
    """Find a column matching any of the keywords using fuzzy semantic matching."""
    all_cols = classification.metrics + classification.dimensions + classification.targets
    if search_excluded:
        all_cols = all_cols + classification.excluded

    # Primary: semantic resolver (handles abbreviations, CamelCase, fuzzy)
    try:
        from .semantic_resolver import find_column as semantic_find
        result = semantic_find(keywords, all_cols, threshold=0.55)
        if result:
            return result
    except ImportError:
        pass

    # Fallback: simple substring matching
    for keyword in keywords:
        for col in all_cols:
            if keyword.lower() in col.lower().replace("_", ""):
                return col
    return None


def _safe_sum(df: pd.DataFrame, col: str) -> float:
    """Safely sum a column with numeric coercion."""
    if col and col in df.columns:
        return float(pd.to_numeric(df[col], errors='coerce').sum())
    return 0.0


def _safe_mean(df: pd.DataFrame, col: str) -> float:
    """Safely calculate mean of a column with numeric coercion."""
    if col and col in df.columns:
        return float(pd.to_numeric(df[col], errors='coerce').mean())
    return 0.0


def _normalized_col(col: str) -> str:
    return str(col).lower().replace("_", "").replace("-", "").strip()


def _is_effectively_numeric(series: pd.Series) -> bool:
    """Treat numeric-like string columns as numeric if enough values coerce."""
    if pd.api.types.is_numeric_dtype(series):
        return True
    coerced = pd.to_numeric(series, errors='coerce')
    return coerced.notna().mean() >= 0.5


def _is_lifecycle_column(col: str) -> bool:
    normalized_words = re.sub(r'[^a-z0-9]+', ' ', str(col).lower()).strip()
    compact_name = _normalized_col(col)

    explicit_compound_fields = {
        'accountage',
        'yearsatcompany',
        'totalworkingyears',
        'lengthofstay',
        'monthsofservice',
        'monthstenure',
        'tenuremonths',
    }
    if compact_name in explicit_compound_fields:
        return True

    # Word-boundary matching avoids false positives like "monthlycharges".
    lifecycle_pattern = re.compile(
        r'\b(age|tenure|duration|experience|seniority|vintage|months?|years?|days?)\b'
    )
    if lifecycle_pattern.search(normalized_words):
        return True

    return bool(re.search(r'\b(account age|length of stay)\b', normalized_words))


def _is_financial_column(col: str) -> bool:
    name = _normalized_col(col)
    financial_tokens = [
        'revenue', 'sales', 'amount', 'charge', 'charges', 'monthlycharge',
        'billing', 'bill', 'income', 'salary', 'balance', 'limit', 'cost',
        'fee', 'spend', 'payment', 'mrr', 'arr', 'arpu', 'ltv', 'clv'
    ]
    return any(tok in name for tok in financial_tokens)


def _count_target_positive(df: pd.DataFrame, target_col: str) -> int:
    """Count positive cases in target column."""
    if not target_col or target_col not in df.columns:
        return 0
    
    positive_keywords = ['yes', 'true', '1', 'churned', 'converted', 'active', 'positive']
    
    for val in df[target_col].dropna().unique():
        if str(val).lower() in positive_keywords:
            return int((df[target_col].astype(str).str.lower() == str(val).lower()).sum())
    
    # No recognized positive keyword found — return 0 instead of guessing
    logger.warning(
        "Could not detect positive class for column '%s' (unique values: %s). Returning 0.",
        target_col,
        list(df[target_col].dropna().unique()[:10]),
    )
    return 0


# =============================================================================
# Domain-Specific KPI Generators
# =============================================================================


def _generate_sales_kpis(df: pd.DataFrame, classification: ColumnClassification) -> List[KPI]:
    """Generate KPIs for Sales domain - answers key business questions."""
    kpis = []
    
    # Find key columns
    revenue_col = _find_column(df, ['revenue', 'sales', 'amount', 'total_sales', 'totalsales'], classification)
    profit_col = _find_column(df, ['profit', 'gross_profit', 'net_profit'], classification)
    quantity_col = _find_column(df, ['quantity', 'qty', 'units', 'volume', 'order_quantity', 'ordered'], classification)
    discount_col = _find_column(df, ['discount', 'discount_amount', 'discount_percent'], classification)
    customer_col = _find_column(df, ['customer', 'customerid', 'customer_id', 'client'], classification)
    
    # Improved Order Identifier Logic:
    # 1. Search for explicit ID/Number columns first
    order_col = _find_column(df, ['orderid', 'order_id', 'invoiceid', 'invoice_no', 'invoiceno', 'orderno', 'order_number', 'transaction_id', 'transactionid'], classification, search_excluded=True)
    
    # 2. Fallback to broader terms if no explicit ID found
    if not order_col:
        order_col = _find_column(df, ['order', 'invoice', 'transaction', 'ref'], classification, search_excluded=True)

    # 3. False Positive Check (Line Item IDs vs Grouping IDs):
    # If the column is unique for every row (cardinality 1:1), it's likely a Line ID.
    # We should prefer a column that has SOME duplicates (grouping items into orders).
    if order_col:
        nunique = df[order_col].nunique()
        if nunique == len(df) and len(df) > 1:
            # This is a Line ID. Try to find a Grouping ID (Invoice/OrderNo)
            # We search for the same keywords but exclude the current 1:1 column
            broader_keywords = ['orderid', 'invoice', 'orderno', 'parent_id', 'transactionid']
            # Create a temporary classification with the current col removed
            temp_classification = ColumnClassification(
                metrics=[m for m in classification.metrics if m != order_col],
                dimensions=[d for d in classification.dimensions if d != order_col],
                excluded=[e for e in classification.excluded if e != order_col],
                targets=classification.targets
            )
            broader_col = _find_column(df, broader_keywords, temp_classification, search_excluded=True)
            if broader_col and broader_col != order_col:
                # Only switch if the broader col isn't also 1:1
                if df[broader_col].nunique() < len(df):
                    order_col = broader_col

    # 4. Cardinality Guard: Still reject extremely low cardinality (likely categories)
    if order_col:
        nunique = df[order_col].nunique()
        if len(df) > 50 and nunique < 5:
            order_col = None
    
    total_orders = df[order_col].nunique() if order_col else len(df)
    product_col = None
    region_col = None
    for dim in classification.dimensions:
        dim_lower = dim.lower().replace('_', '')
        if not product_col and any(kw in dim_lower for kw in ['product', 'item', 'sku', 'category']):
            product_col = dim
        if not region_col and any(kw in dim_lower for kw in ['region', 'state', 'city', 'country', 'market']):
            region_col = dim
    
    total_orders = df[order_col].nunique() if order_col else len(df)
    total_customers = df[customer_col].nunique() if customer_col else None
    
    # =========================================================================
    # TIME-SERIES PREPARATION (for MoM / Comparative KPIs)
    # =========================================================================
    date_col = classification.dates[0] if classification.dates else None
    
    # We create two dataframes: df_curr (last 30 days of data footprint) and df_prev (prior 30 days)
    df_curr = df
    df_prev = None
    has_trend = False
    
    # YTD Dataframes
    df_ytd_curr = None
    df_ytd_prev = None
    df_full_prev_year = None
    
    if date_col and date_col in df.columns:
        try:
            # Safely coercing to datetime just for the bounding box
            dates = _safe_to_datetime(df[date_col])
            if not dates.isna().all():
                max_date = dates.max()
                
                # Slicing blocks
                curr_start = max_date - pd.Timedelta(days=30)
                prev_start = curr_start - pd.Timedelta(days=30)
                
                mask_curr = (dates > curr_start) & (dates <= max_date)
                mask_prev = (dates > prev_start) & (dates <= curr_start)
                
                df_curr_slice = df[mask_curr]
                df_prev_slice = df[mask_prev]
                
                # Only activate trend logic if we actually captured data in both windows
                if len(df_curr_slice) > 0 and len(df_prev_slice) > 0:
                    df_curr = df_curr_slice
                    df_prev = df_prev_slice
                    has_trend = True
                    
                # YTD DataFrames — apples-to-apples comparison
                # Both years filtered to same month-day window
                try:
                    df_ts = df.copy()
                    df_ts['__year'] = dates.dt.year
                    df_ts['__month_day'] = dates.dt.strftime('%m%d')
                    
                    max_md = max_date.strftime('%m%d')
                    curr_yr = max_date.year
                    prev_yr = curr_yr - 1
                    
                    # YTD: Jan 1 to current date equivalent in each year
                    df_ytd_curr = df_ts[(df_ts['__year'] == curr_yr) & (df_ts['__month_day'] <= max_md)]
                    df_ytd_prev = df_ts[(df_ts['__year'] == prev_yr) & (df_ts['__month_day'] <= max_md)]
                    
                    # Full previous year (for reference KPI only)
                    df_full_prev_year = df_ts[df_ts['__year'] == prev_yr]
                except Exception as e:
                    logger.warning(f"YoY/YTD prep failed: {e}")
                    pass
        except Exception as e:
            logger.warning(f"Time-series scoping failed: {e}")
            pass
            
    def _calc_trend(curr_val: float, prev_val: float) -> Optional[float]:
        """Calculates percentage shift natively"""
        if prev_val == 0 or prev_val is None or pd.isna(prev_val):
            return None
        return round(((curr_val - prev_val) / prev_val) * 100, 1)

    # =========================================================================
    # BUSINESS QUESTION: "Are we growing?"
    # =========================================================================
    
    # 1. Total Revenue (Primary KPI)
    total_revenue = 0
    if revenue_col:
        total_revenue = _safe_sum(df, revenue_col)
        
        # Calculate Trend (prefer YTD trend for executive view if available)
        trend = None
        trend_label = None
        
        if df_ytd_curr is not None and not df_ytd_curr.empty:
            ytd_curr_rev = _safe_sum(df_ytd_curr, revenue_col)
            ytd_prev_rev = _safe_sum(df_ytd_prev, revenue_col) if df_ytd_prev is not None else 0
            trend = _calc_trend(ytd_curr_rev, ytd_prev_rev)
            if trend is not None:
                trend_label = "YoY (YTD)"
        
        if trend is None and has_trend:
            curr_rev = _safe_sum(df_curr, revenue_col)
            prev_rev = _safe_sum(df_prev, revenue_col)
            trend = _calc_trend(curr_rev, prev_rev)
            if trend is not None:
                trend_label = "30d momentum"
            
        kpis.append(KPI(
            key="total_revenue",
            title="Total Revenue",
            value=total_revenue,
            format="currency",
            icon="dollar",
            confidence="HIGH",
            reason="Sum of all revenue in dataset",
            trend=trend,
            trend_label=trend_label
        ))
        
        # New KPIs for YTD and Last Year Revenue
        try:
            if df_ytd_curr is not None and not df_ytd_curr.empty:
                ytd_curr_rev = _safe_sum(df_ytd_curr, revenue_col)
                kpis.append(KPI(
                    key="ytd_revenue",
                    title="YTD Revenue",
                    value=ytd_curr_rev,
                    format="currency",
                    icon="activity",
                    confidence="HIGH",
                    reason=f"Revenue from Jan 1 to {max_date.strftime('%b %d') if 'max_date' in locals() else 'today'}"
                ))
                
            if df_full_prev_year is not None and not df_full_prev_year.empty:
                full_prev_rev = _safe_sum(df_full_prev_year, revenue_col)
                kpis.append(KPI(
                    key="prev_year_revenue",
                    title="Previous Year Revenue",
                    value=full_prev_rev,
                    format="currency",
                    icon="calendar",
                    confidence="HIGH",
                    reason="Total bottom-line from the complete previous year"
                ))
        except Exception as e:
            logger.warning(f"Failed to append YTD/YoY cards: {e}")
    
    # 2. Sales Volume (Quantity)
    if quantity_col:
        total_quantity = _safe_sum(df, quantity_col)
        
        trend = None
        if has_trend:
            curr_qty = _safe_sum(df_curr, quantity_col)
            prev_qty = _safe_sum(df_prev, quantity_col)
            trend = _calc_trend(curr_qty, prev_qty)
            
        kpis.append(KPI(
            key="sales_volume",
            title="Sales Volume",
            value=int(total_quantity),
            format="number",
            icon="package",
            confidence="HIGH",
            reason="Total units sold",
            trend=trend,
            trend_label="30d momentum" if trend is not None else None
        ))
    
    # 3. Average Order Value (AOV)
    if revenue_col and total_orders > 0:
        aov = total_revenue / total_orders
        
        trend = None
        if has_trend and df_prev is not None and df_curr is not None:
            curr_orders = df_curr[order_col].nunique() if order_col and order_col in df_curr.columns else len(df_curr)
            prev_orders = df_prev[order_col].nunique() if order_col and order_col in df_prev.columns else len(df_prev)
            
            curr_aov = _safe_sum(df_curr, revenue_col) / curr_orders if curr_orders > 0 else 0
            prev_aov = _safe_sum(df_prev, revenue_col) / prev_orders if prev_orders > 0 else 0
            trend = _calc_trend(curr_aov, prev_aov)
            
        kpis.append(KPI(
            key="aov",
            title="Avg Order Value",
            value=round(aov, 2),
            format="currency",
            icon="shopping-cart",
            confidence="HIGH",
            reason="Revenue / Orders",
            trend=trend,
            trend_label="30d momentum" if trend is not None else None
        ))
    
    # =========================================================================
    # BUSINESS QUESTION: "Where is revenue leaking?"
    # =========================================================================
    
    # 4. Gross Margin %
    if profit_col and revenue_col and total_revenue > 0:
        total_profit = _safe_sum(df, profit_col)
        margin = (total_profit / total_revenue) * 100
        kpis.append(KPI(
            key="gross_margin",
            title="Gross Margin",
            value=round(margin, 1),
            format="percent",
            icon="percent",
            confidence="HIGH",
            reason="Profit / Revenue × 100"
        ))
    
    # 5. Discount Impact %
    if discount_col and revenue_col and total_revenue > 0:
        total_discount = _safe_sum(df, discount_col)
        # Check if discount is a ratio (mean < 1 means values like 0.2, 0.15)
        col_mean = _safe_mean(df, discount_col)
        if col_mean < 1:  # It's a ratio/percentage column
            discount_impact = col_mean * 100  # Average discount rate
        else:
            discount_impact = (total_discount / total_revenue) * 100
        kpis.append(KPI(
            key="discount_impact",
            title="Discount Impact",
            value=round(discount_impact, 1),
            format="percent",
            icon="alert-triangle",
            confidence="HIGH",
            reason="Avg discount rate" if col_mean < 1 else "Discount / Revenue"
        ))
    
    # 6. Total Profit
    if profit_col:
        total_profit = _safe_sum(df, profit_col)
        kpis.append(KPI(
            key="total_profit",
            title="Total Profit",
            value=total_profit,
            format="currency",
            icon="trending-up",
            confidence="HIGH",
            reason="Sum of profit"
        ))
    
    # =========================================================================
    # BUSINESS QUESTION: "What drives performance?"
    # =========================================================================
    
    # 7. Revenue per Customer
    if revenue_col and total_customers and total_customers > 0:
        rev_per_customer = total_revenue / total_customers
        kpis.append(KPI(
            key="revenue_per_customer",
            title="Revenue/Customer",
            value=round(rev_per_customer, 2),
            format="currency",
            icon="users",
            confidence="HIGH",
            reason="Revenue / Unique Customers"
        ))
    
    # 8. Total Orders
    # Main value = total records (line items).
    # Subtitle = unique order identifiers (if found).
    total_records = len(df)
    order_subtitle = None
    order_reason = "Total transaction line items"
    
    if order_col:
        unique_count = df[order_col].nunique()
        order_subtitle = f"{unique_count:,} unique orders"
        order_reason = f"Line items grouped by {order_col} ({unique_count} distinct)"

    kpis.append(KPI(
        key="total_orders",
        title="Total Orders",
        value=total_records,
        format="number",
        icon="shopping-cart",
        confidence="HIGH",
        reason=order_reason,
        subtitle=order_subtitle
    ))
    
    # 9. Top Region (if region exists)
    if region_col and revenue_col:
        try:
            top_region = df.groupby(region_col)[revenue_col].sum().idxmax()
            if len(str(top_region)) > 20:
                top_region = str(top_region)[:17] + "..."
            kpis.append(KPI(
                key="top_region",
                title="Top Region",
                value=str(top_region),
                format="text",
                icon="map",
                confidence="HIGH",
                reason="Region with highest revenue"
            ))
        except:
            pass
    
    # 10. Best Seller (if product exists)
    if product_col and revenue_col:
        try:
            top_product = df.groupby(product_col)[revenue_col].sum().idxmax()
            if len(str(top_product)) > 20:
                top_product = str(top_product)[:17] + "..."
            kpis.append(KPI(
                key="best_seller",
                title="Best Seller",
                value=str(top_product),
                format="text",
                icon="star",
                confidence="HIGH",
                reason="Product with highest revenue"
            ))
        except:
            pass
    
    # =========================================================================
    # BUSINESS QUESTION: "Are customers buying more or just once?" (E-commerce)
    # =========================================================================
    
    # 11. Repeat Purchase Rate
    if customer_col and order_col:
        try:
            orders_per_customer = df.groupby(customer_col)[order_col].nunique()
            repeat_customers = (orders_per_customer > 1).sum()
            if total_customers and total_customers > 0:
                repeat_rate = (repeat_customers / total_customers) * 100
                kpis.append(KPI(
                    key="repeat_rate",
                    title="Repeat Rate",
                    value=round(repeat_rate, 1),
                    format="percent",
                    icon="refresh-cw",
                    confidence="HIGH",
                    reason="Customers with 2+ orders"
                ))
        except:
            pass
    
    # 12. Avg Orders per Customer (key customer behavior metric)
    if customer_col and total_customers and total_customers > 0:
        avg_orders = total_orders / total_customers
        kpis.append(KPI(
            key="avg_orders_per_customer",
            title="Orders/Customer",
            value=round(avg_orders, 1),
            format="number",
            icon="shopping-bag",
            confidence="HIGH",
            reason="Orders / Unique Customers"
        ))
    
    return kpis[:10]  # Allow up to 10 KPIs



def _generate_churn_kpis(df: pd.DataFrame, classification: ColumnClassification) -> List[KPI]:
    """Generate KPIs for Churn domain - works for Telco, Banking, SaaS, HR."""
    kpis = []
    
    # Find key columns using semantic hints
    target_col = classification.targets[0] if classification.targets else None
    
    # Build numeric candidate pool first, then apply strict semantic gates.
    numeric_candidates: List[str] = []
    for col in (classification.metrics + classification.dimensions):
        if col in df.columns and _is_effectively_numeric(df[col]):
            numeric_candidates.append(col)

    # Financial metric must be explicitly finance-like and not lifecycle/demographic.
    financial_candidates = [
        c for c in numeric_candidates
        if _is_financial_column(c) and not _is_lifecycle_column(c)
    ]
    value_col = financial_candidates[0] if financial_candidates else None

    # Lifecycle metric (used for "at churn" average) prefers tenure/duration over age.
    tenure_like = [
        c for c in numeric_candidates
        if any(tok in _normalized_col(c) for tok in ['tenure', 'month', 'duration', 'yearsatcompany', 'experience', 'seniority'])
    ]
    age_like = [c for c in numeric_candidates if 'age' in _normalized_col(c)]
    lifecycle_col = (tenure_like[0] if tenure_like else (age_like[0] if age_like else None))

    contract_col = _find_column(df, ['contract', 'subscription_type', 'membership'], classification)
    
    # Churn Mask Detection (Handles strings "Yes", booleans True, and numeric 1/0)
    positive_keywords = ['yes', 'true', '1', '1.0', 'churned', 'exited', 'left', 'positive']
    churned_mask = None
    if target_col:
        mask_series = df[target_col].astype(str).str.lower().str.strip()
        churned_mask = mask_series.isin(positive_keywords)
        
    total_customers = len(df)
    churned_count = churned_mask.sum() if churned_mask is not None else 0
    
    # ── PRIMARY KPIs ──────────────────────────────────────────────────────────
    
    # 1. Total Base
    kpis.append(KPI(
        key="total_base",
        title="Total Customers" if 'tenure' in str(lifecycle_col).lower() else "Total Employees" if 'yearsatcompany' in str(lifecycle_col).lower() else "Total Base",
        value=total_customers,
        format="number",
        icon="users",
        confidence="HIGH",
        reason="Total record count in dataset"
    ))
    
    # 2. Churn / Attrition Rate
    if target_col and total_customers > 0:
        churn_rate = (churned_count / total_customers) * 100
        label = "Attrition" if 'attrition' in target_col.lower() else "Left" if 'left' in target_col.lower() else "Churn"
        kpis.append(KPI(
            key="churn_rate",
            title=f"{label} Rate",
            value=round(churn_rate, 1),
            format="percent",
            icon="trending-down",
            confidence="HIGH",
            reason=f"Percentage of customers where {target_col} indicates departure"
        ))
    
    # 3. Value at Risk (The financial impact)
    if value_col and churned_mask is not None:
        vals = pd.to_numeric(df.loc[churned_mask, value_col], errors='coerce')
        val_at_risk = vals.sum() if not vals.isna().all() else 0
        if val_at_risk > 0:
            kpis.append(KPI(
                key="value_at_risk",
                title=f"{_beautify_column_name(value_col)} at Risk",
                value=float(val_at_risk),
                format="currency" if any(h in value_col.lower() for h in ['charge', 'balance', 'salary', 'income']) else "number",
                icon="alert-triangle",
                confidence="HIGH",
                reason=f"Sum of {value_col} for customers identified as churned"
            ))

    # 4. Average Tenure / Age
    if lifecycle_col and churned_mask is not None:
        avg_tenure_churned = pd.to_numeric(df.loc[churned_mask, lifecycle_col], errors='coerce').mean()
        if pd.notna(avg_tenure_churned):
            normalized_lifecycle = _normalized_col(lifecycle_col)
            is_age_metric = 'age' in normalized_lifecycle
            is_year_metric = is_age_metric or any(tok in normalized_lifecycle for tok in ['year', 'years', 'yearsatcompany', 'totalworkingyears'])
            is_month_metric = any(tok in normalized_lifecycle for tok in ['month', 'months', 'monthsofservice', 'monthstenure', 'tenuremonths'])

            if is_year_metric:
                unit = 'years'
            elif is_month_metric:
                unit = 'months'
            else:
                unit = 'units'

            title_base = "Avg Age at Churn" if is_age_metric else "Avg Tenure at Churn"
            title = title_base if unit == 'units' else f"{title_base} ({unit.title()})"
            value_rounded = round(float(avg_tenure_churned), 1)
            kpis.append(KPI(
                key="tenure_at_churn",
                title=title,
                value=value_rounded,
                format="number",
                icon="clock",
                confidence="HIGH",
                reason=f"Mean {lifecycle_col} for churned users",
                subtitle=f"{value_rounded} {unit}"
            ))

    # 5. Domain Specifics (Banking Risk)
    credit_col = _find_column(df, ['creditscore', 'credit_score'], classification)
    if credit_col and churned_mask is not None:
        avg_credit_churned = pd.to_numeric(df.loc[churned_mask, credit_col], errors='coerce').mean()
        if pd.notna(avg_credit_churned):
            kpis.append(KPI(
                key="credit_risk",
                title="Avg Credit Score (Churn)",
                value=int(avg_credit_churned),
                format="number",
                icon="briefcase",
                confidence="HIGH",
                reason=f"Average {credit_col} for exited customers"
            ))

    # 6. Retention Rate (Holistic view)
    if target_col and total_customers > 0:
        retention_rate = ((total_customers - churned_count) / total_customers) * 100
        kpis.append(KPI(
            key="retention_rate",
            title="Retention Rate",
            value=round(retention_rate, 1),
            format="percent",
            icon="trending-up",
            confidence="HIGH",
            reason="Inverse of the churn rate"
        ))

    # 7. ARPU (Average Revenue Per User)
    arpu = 0
    if value_col:
        arpu = _safe_mean(df, value_col)
        if arpu > 0:
            kpis.append(KPI(
                key="arpu",
                title="ARPU",
                value=round(float(arpu), 2),
                format="currency" if any(h in value_col.lower() for h in ['charge', 'balance', 'salary', 'income']) else "number",
                icon="user-plus",
                confidence="HIGH",
                reason=f"Average {_beautify_column_name(value_col)} per customer",
                subtitle="Avg Revenue Per User"
            ))

    # 8. Customer Lifetime Value (LTV)
    # LTV = ARPU / Churn Rate
    if arpu > 0 and 'churn_rate' in locals() and churn_rate > 0:
        ltv = arpu / (churn_rate / 100)
        kpis.append(KPI(
            key="ltv",
            title="Estimated LTV",
            value=round(float(ltv), 2),
            format="currency" if any(h in value_col.lower() for h in ['charge', 'balance', 'salary', 'income']) else "number",
            icon="trending-up",
            confidence="MEDIUM",
            reason="ARPU / Churn Rate",
            subtitle="Customer Lifetime Value"
        ))
    elif arpu > 0 and lifecycle_col:
        # Fallback LTV estimate based on tenure if no churn detected
        avg_tenure = _safe_mean(df, lifecycle_col)
        ltv = arpu * avg_tenure
        kpis.append(KPI(
            key="ltv",
            title="Projected LTV",
            value=round(float(ltv), 2),
            format="currency" if any(h in value_col.lower() for h in ['charge', 'balance', 'salary', 'income']) else "number",
            icon="trending-up",
            confidence="LOW",
            reason="ARPU × Avg Tenure",
            subtitle="Projected Lifetime Value"
        ))

    # 9. Support Intensity (Tickets/Calls)
    ticket_col = _find_column(df, ['ticket', 'complaint', 'incident', 'call', 'support', 'issue'], classification)
    if ticket_col:
        total_tickets = _safe_sum(df, ticket_col)
        avg_tickets = total_tickets / total_customers if total_customers > 0 else 0
        kpis.append(KPI(
            key="support_intensity",
            title="Avg Support Tickets",
            value=round(float(avg_tickets), 2),
            format="number",
            icon="help-circle",
            confidence="HIGH",
            reason=f"Mean of {ticket_col} per customer",
            subtitle=f"{int(total_tickets)} total tickets"
        ))

    # 10. High Value Churners (Count of churned customers above 75th percentile of value)
    if value_col and churned_mask is not None:
        try:
            q75 = df[value_col].quantile(0.75)
            high_value_churners = df[churned_mask & (df[value_col] > q75)]
            if len(high_value_churners) > 0:
                kpis.append(KPI(
                    key="hv_churners",
                    title="High Value Churners",
                    value=len(high_value_churners),
                    format="number",
                    icon="users",
                    confidence="MEDIUM",
                    reason=f"Count of churned users in top 25% of {value_col}",
                    subtitle=f"Above {round(q75, 0)} {value_col}"
                ))
        except:
            pass

    return kpis[:12] # Increased limit to accommodate new KPIs


def _generate_marketing_kpis(df: pd.DataFrame, classification: ColumnClassification) -> List[KPI]:
    """Generate KPIs for Marketing domain."""
    kpis = []
    
    # 1. Total Impressions
    imp_col = _find_column(df, ['impression', 'impressions', 'views'], classification)
    if imp_col:
        total_imp = _safe_sum(df, imp_col)
        kpis.append(KPI(
            key="impressions",
            title="Total Impressions",
            value=int(total_imp),
            format="number",
            icon="eye",
            confidence="HIGH",
            reason=f"Sum of {imp_col}"
        ))
    
    # 2. Total Clicks
    click_col = _find_column(df, ['click', 'clicks'], classification)
    if click_col:
        total_clicks = _safe_sum(df, click_col)
        kpis.append(KPI(
            key="clicks",
            title="Total Clicks",
            value=int(total_clicks),
            format="number",
            icon="mouse-pointer",
            confidence="HIGH",
            reason=f"Sum of {click_col}"
        ))
        
        # 3. CTR (Calculated)
        if imp_col and total_imp > 0:
            ctr = (total_clicks / total_imp) * 100
            kpis.append(KPI(
                key="ctr",
                title="Click-Through Rate",
                value=round(ctr, 2),
                format="percent",
                icon="target",
                confidence="HIGH",
                reason="Clicks / Impressions × 100"
            ))
    
    # 4. Conversion Rate
    conv_col = _find_column(df, ['conversion', 'conversions', 'converted'], classification)
    if conv_col and click_col:
        total_conv = _safe_sum(df, conv_col)
        total_clicks = _safe_sum(df, click_col)
        if total_clicks > 0:
            conv_rate = (total_conv / total_clicks) * 100
            kpis.append(KPI(
                key="conversion_rate",
                title="Conversion Rate",
                value=round(conv_rate, 2),
                format="percent",
                icon="check-circle",
                confidence="HIGH",
                reason="Conversions / Clicks × 100"
            ))
    
    return kpis[:4]


def _generate_finance_kpis(df: pd.DataFrame, classification: ColumnClassification) -> List[KPI]:
    """Generate KPIs for Finance domain."""
    kpis = []
    
    # 1. Total Income/Revenue
    income_col = _find_column(df, ['income', 'revenue', 'total', 'amount'], classification)
    if income_col:
        total_income = _safe_sum(df, income_col)
        kpis.append(KPI(
            key="total_income",
            title="Total Income",
            value=total_income,
            format="currency",
            icon="dollar",
            confidence="HIGH",
            reason=f"Sum of {income_col}"
        ))
    
    # 2. Total Expenses
    expense_col = _find_column(df, ['expense', 'cost', 'spending'], classification)
    if expense_col:
        total_expense = _safe_sum(df, expense_col)
        kpis.append(KPI(
            key="total_expenses",
            title="Total Expenses",
            value=total_expense,
            format="currency",
            icon="credit-card",
            confidence="HIGH",
            reason=f"Sum of {expense_col}"
        ))
        
        # 3. Net Income (Calculated)
        if income_col:
            net_income = total_income - total_expense
            kpis.append(KPI(
                key="net_income",
                title="Net Income",
                value=net_income,
                format="currency",
                icon="trending-up" if net_income >= 0 else "trending-down",
                confidence="HIGH",
                reason="Income - Expenses"
            ))
    
    # 4. Transaction Count
    kpis.append(KPI(
        key="transactions",
        title="Total Transactions",
        value=len(df),
        format="number",
        icon="list",
        confidence="HIGH",
        reason="Row count"
    ))
    
    return kpis[:4]


def _generate_healthcare_kpis(df: pd.DataFrame, classification: ColumnClassification) -> List[KPI]:
    """Generate operational/clinical KPIs for Healthcare domain."""
    kpis = []
    
    # Detect key columns
    patient_col = _find_column(df, ['patient', 'patientid', 'name'], classification)
    age_col = _find_column(df, ['age'], classification)
    condition_col = _find_column(df, ['condition', 'diagnosis', 'disease', 'medical_condition'], classification)
    insurance_col = _find_column(df, ['insurance', 'provider', 'insurance_provider'], classification)
    cost_col = _find_column(df, ['cost', 'charge', 'charges', 'bill', 'billing', 'billing_amount'], classification)
    
    total_patients = df[patient_col].nunique() if patient_col else len(df)
    
    # 1. Patient Volume
    kpis.append(KPI(
        key="patient_volume",
        title="Patient Volume",
        value=total_patients,
        format="number",
        icon="users",
        confidence="HIGH",
        reason="Unique patients" if patient_col else "Total records",
        subtitle=f"{len(df)} total visits"
    ))
    
    # 2. Average Age
    if age_col:
        avg_age = _safe_mean(df, age_col)
        kpis.append(KPI(
            key="avg_age",
            title="Avg Patient Age",
            value=round(avg_age, 1),
            format="number",
            icon="activity",
            confidence="HIGH",
            reason=f"Mean of {age_col}",
            subtitle="Demographic indicator"
        ))
    
    # 3. Condition Prevalence (Top 3 chronic conditions as % of total)
    if condition_col and condition_col in df.columns:
        try:
            top3 = df[condition_col].value_counts().head(3)
            top3_count = int(top3.sum())
            top3_pct = round((top3_count / len(df)) * 100, 1) if len(df) > 0 else 0
            top3_names = ", ".join(top3.index.tolist())
            kpis.append(KPI(
                key="condition_prevalence",
                title="Top 3 Conditions",
                value=top3_pct,
                format="percent",
                icon="alert-circle",
                confidence="HIGH",
                reason=f"Top 3 conditions cover {top3_pct}% of patients",
                subtitle=top3_names
            ))
        except Exception:
            pass
    
    # 4. Insurance Coverage Ratio
    if insurance_col and insurance_col in df.columns:
        try:
            total_rows = len(df)
            # Self-pay detection
            self_pay_keywords = ['self', 'self-pay', 'selfpay', 'none', 'no insurance', 'uninsured', 'cash']
            insured = df[~df[insurance_col].astype(str).str.lower().str.strip().isin(self_pay_keywords)]
            coverage_pct = round((len(insured) / total_rows) * 100, 1) if total_rows > 0 else 0
            kpis.append(KPI(
                key="insurance_coverage",
                title="Insurance Coverage",
                value=coverage_pct,
                format="percent",
                icon="shield",
                confidence="HIGH",
                reason=f"Patients with insurance coverage",
                subtitle=f"{len(insured)} of {total_rows} covered"
            ))
        except Exception:
            pass
    
    # 5. Total Billing
    if cost_col:
        total_cost = _safe_sum(df, cost_col)
        kpis.append(KPI(
            key="total_billing",
            title="Total Billing",
            value=total_cost,
            format="currency",
            icon="dollar",
            confidence="HIGH",
            reason=f"Sum of {cost_col}"
        ))
    
    return kpis[:5]


def _generate_generic_kpis(df: pd.DataFrame, classification: ColumnClassification) -> List[KPI]:
    """Generate generic KPIs when domain is unknown."""
    kpis = []
    
    # 1. Total Records
    kpis.append(KPI(
        key="total_records",
        title="Total Records",
        value=len(df),
        format="number",
        icon="database",
        confidence="HIGH",
        reason="Row count"
    ))
    
    # 2. Primary Metric Sum (first metric column)
    if classification.metrics:
        primary_metric = classification.metrics[0]
        total = _safe_sum(df, primary_metric)
        kpis.append(KPI(
            key="primary_total",
            title=f"Total {primary_metric.replace('_', ' ').title()}",
            value=total,
            format="currency" if any(kw in primary_metric.lower() for kw in ['amount', 'price', 'revenue', 'cost']) else "number",
            icon="bar-chart",
            confidence="MEDIUM",
            reason=f"Sum of {primary_metric}"
        ))
        
        # 3. Primary Metric Average
        avg = _safe_mean(df, primary_metric)
        kpis.append(KPI(
            key="primary_avg",
            title=f"Avg {primary_metric.replace('_', ' ').title()}",
            value=round(avg, 2),
            format="number",
            icon="trending-up",
            confidence="MEDIUM",
            reason=f"Mean of {primary_metric}"
        ))
    
    # 4. Target distribution if exists
    if classification.targets:
        target_col = classification.targets[0]
        positive_count = _count_target_positive(df, target_col)
        rate = (positive_count / len(df)) * 100 if len(df) > 0 else 0
        kpis.append(KPI(
            key="target_rate",
            title=f"{target_col.replace('_', ' ').title()} Rate",
            value=round(rate, 1),
            format="percent",
            icon="pie-chart",
            confidence="HIGH",
            reason=f"Positive / Total × 100"
        ))
    
    return kpis[:4]


# =============================================================================
# Main Entry Point
# =============================================================================


def generate_kpis(df: pd.DataFrame, domain: DomainType, classification: ColumnClassification) -> Dict[str, Any]:
    """
    Generate KPIs based on domain and data classification.
    
    Returns dict of KPIs for API response.
    """
    generators = {
        DomainType.SALES: _generate_sales_kpis,
        DomainType.CHURN: _generate_churn_kpis,
        DomainType.MARKETING: _generate_marketing_kpis,
        DomainType.FINANCE: _generate_finance_kpis,
        DomainType.HEALTHCARE: _generate_healthcare_kpis,
        DomainType.GENERIC: _generate_generic_kpis,
    }
    
    generator = generators.get(domain, _generate_generic_kpis)
    kpis = generator(df, classification)
    
    # Convert to dict format for API
    result = {}
    for i, kpi in enumerate(kpis):
        val = kpi.value
        fmt = kpi.format
        title_lower = kpi.title.lower()
        
        # Smart detection: if format is not set, look at title
        if not fmt:
            percentage_keywords = ["rate", "margin", "percent", "ratio", "proportion", "share"]
            if any(kw in title_lower for kw in percentage_keywords):
                fmt = "percent"
                
        # Smart scaling: if format is percent and value is a ratio (0-1), scale it
        if fmt == "percent" and isinstance(val, (int, float)) and -1.0 <= val <= 1.0:
            val = val * 100
            
        result[f"kpi_{i}"] = {
            "title": kpi.title,
            "value": val,
            "format": fmt,
            "is_percentage": fmt == "percent",
            "icon": kpi.icon,
            "confidence": kpi.confidence,
            "reason": kpi.reason
        }
        if getattr(kpi, 'trend', None) is not None:
            result[f"kpi_{i}"]["trend"] = kpi.trend
        if getattr(kpi, 'trend_label', None) is not None:
            result[f"kpi_{i}"]["trend_label"] = kpi.trend_label
        if getattr(kpi, 'subtitle', None) is not None:
            result[f"kpi_{i}"]["subtitle"] = kpi.subtitle
    
    return result
