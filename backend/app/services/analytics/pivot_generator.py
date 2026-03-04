"""
Pivot Table Generator
Automatically generates pivot table configurations based on domain and dataset characteristics.
"""
import pandas as pd
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

from .column_filter import ColumnClassification


@dataclass
class PivotConfig:
    """Configuration for a pivot table."""
    rows: List[str]           # Row dimension columns
    columns: Optional[str]    # Column dimension (optional, for cross-tab)
    values: List[Dict]        # Value columns with aggregation type
    filters: List[str]        # Available filter columns
    title: str                # Pivot table title


# Column name beautification (imported logic)
COLUMN_TO_DISPLAY_NAME = {
    # Shipping & Logistics
    'ship_mode': 'Shipping Method', 'shipmode': 'Shipping Method',
    'delivery_status': 'Delivery Status', 'late_delivery_risk': 'Late Delivery Risk',
    
    # Products
    'product_name': 'Product', 'productname': 'Product', 'product': 'Product',
    'category': 'Category', 'category_name': 'Category', 'sub_category': 'Subcategory',
    
    # Customers
    'customer_name': 'Customer', 'customer_segment': 'Segment', 'segment': 'Segment',
    
    # Geography
    'region': 'Region', 'country': 'Country', 'state': 'State', 'city': 'City',
    'market': 'Market',
    
    # Metrics
    'sales': 'Revenue', 'revenue': 'Revenue', 'profit': 'Profit',
    'quantity': 'Quantity', 'discount': 'Discount',
    
    # Churn/Telecom
    'tenure': 'Tenure', 'monthlycharges': 'Monthly Charges', 'monthly_charges': 'Monthly Charges',
    'totalcharges': 'Total Charges', 'total_charges': 'Total Charges',
    'contract': 'Contract', 'internetservice': 'Internet Service', 'internet_service': 'Internet Service',
    'phoneservice': 'Phone Service', 'paymentmethod': 'Payment Method', 'churn': 'Churn',
    
    # Generic
    'gender': 'Gender', 'status': 'Status', 'type': 'Type',
}


def _beautify_name(col: str) -> str:
    """Convert column name to display name."""
    col_lower = col.lower().replace('-', '_')
    if col_lower in COLUMN_TO_DISPLAY_NAME:
        return COLUMN_TO_DISPLAY_NAME[col_lower]
    return col.replace('_', ' ').title()


def _get_aggregation_type(col: str) -> str:
    """Determine appropriate aggregation type for a metric."""
    col_lower = col.lower()
    
    # Sum-based metrics
    if any(kw in col_lower for kw in ['revenue', 'sales', 'profit', 'amount', 'total', 'quantity', 'count']):
        return 'sum'
    
    # Average-based metrics
    if any(kw in col_lower for kw in ['rate', 'avg', 'average', 'tenure', 'charges', 'price', 'score']):
        return 'mean'
    
    return 'sum'  # Default


def generate_pivot_config(
    df: pd.DataFrame,
    classification: ColumnClassification,
    domain: str
) -> PivotConfig:
    """
    Generate an optimal pivot table configuration based on domain and data.
    
    Args:
        df: The dataset
        classification: Column classification from column_filter
        domain: Detected domain (sales, churn, marketing, etc.)
    
    Returns:
        PivotConfig with recommended rows, columns, values
    """
    
    # Get available columns
    dimensions = classification.dimensions[:5]  # Top 5 dimensions
    metrics = classification.metrics[:4]        # Top 4 metrics
    dates = classification.dates
    
    # Domain-specific pivot configuration
    if domain == 'sales':
        return _generate_sales_pivot(df, dimensions, metrics, dates)
    elif domain == 'churn':
        return _generate_churn_pivot(df, dimensions, metrics)
    elif domain == 'marketing':
        return _generate_marketing_pivot(df, dimensions, metrics, dates)
    elif domain == 'finance':
        return _generate_finance_pivot(df, dimensions, metrics, dates)
    else:
        return _generate_generic_pivot(df, dimensions, metrics)


def _generate_sales_pivot(
    df: pd.DataFrame,
    dimensions: List[str],
    metrics: List[str],
    dates: List[str]
) -> PivotConfig:
    """Generate sales-focused pivot table."""
    
    # Priority: Category > Region > Customer Segment
    priority_dims = ['category', 'sub_category', 'region', 'segment', 'customer_segment', 'market', 'country']
    
    rows = []
    for prio in priority_dims:
        for dim in dimensions:
            if prio in dim.lower() and dim not in rows:
                rows.append(dim)
                break
        if len(rows) >= 2:
            break
    
    # If not enough priority dims, add remaining
    if len(rows) < 2:
        for dim in dimensions:
            if dim not in rows and len(rows) < 2:
                rows.append(dim)
    
    # Find revenue/sales metric
    revenue_col = None
    for m in metrics:
        if any(kw in m.lower() for kw in ['revenue', 'sales', 'amount']):
            revenue_col = m
            break
    revenue_col = revenue_col or (metrics[0] if metrics else None)
    
    # Build values list
    values = []
    if revenue_col:
        values.append({'column': revenue_col, 'aggregation': 'sum', 'label': f'Total {_beautify_name(revenue_col)}'})
    
    # Add profit if available
    for m in metrics:
        if 'profit' in m.lower() and m != revenue_col:
            values.append({'column': m, 'aggregation': 'sum', 'label': f'Total {_beautify_name(m)}'})
            break
    
    # Add quantity if available
    for m in metrics:
        if any(kw in m.lower() for kw in ['quantity', 'qty', 'units']) and m not in [v['column'] for v in values]:
            values.append({'column': m, 'aggregation': 'sum', 'label': f'Total {_beautify_name(m)}'})
            break
    
    return PivotConfig(
        rows=rows if rows else dimensions[:2],
        columns=None,
        values=values if values else [{'column': metrics[0], 'aggregation': 'sum', 'label': _beautify_name(metrics[0])}] if metrics else [],
        filters=dimensions[2:4] if len(dimensions) > 2 else [],
        title="Sales Performance Summary"
    )


def _generate_churn_pivot(
    df: pd.DataFrame,
    dimensions: List[str],
    metrics: List[str]
) -> PivotConfig:
    """Generate churn-focused pivot table with cross-tab."""
    
    # Find churn column for cross-tab
    churn_col = None
    for dim in dimensions:
        if 'churn' in dim.lower():
            churn_col = dim
            break
    
    # Priority dimensions for rows
    priority_dims = ['contract', 'internetservice', 'internet_service', 'paymentmethod', 'payment_method', 'gender']
    
    rows = []
    for prio in priority_dims:
        for dim in dimensions:
            if prio in dim.lower().replace('_', '') and dim not in rows and dim != churn_col:
                rows.append(dim)
                break
        if len(rows) >= 2:
            break
    
    # Fallback to available dimensions
    if len(rows) < 1:
        for dim in dimensions:
            if dim != churn_col and dim not in rows:
                rows.append(dim)
                if len(rows) >= 2:
                    break
    
    # Build values - focus on customer count and charges
    values = [{'column': '__count__', 'aggregation': 'count', 'label': 'Customer Count'}]
    
    for m in metrics:
        if any(kw in m.lower() for kw in ['monthly', 'charges', 'tenure']):
            values.append({'column': m, 'aggregation': 'mean', 'label': f'Avg {_beautify_name(m)}'})
            if len(values) >= 3:
                break
    
    return PivotConfig(
        rows=rows if rows else dimensions[:2],
        columns=churn_col,  # Cross-tab by churn status
        values=values,
        filters=[d for d in dimensions if d not in rows and d != churn_col][:2],
        title="Customer Churn Analysis"
    )


def _generate_marketing_pivot(
    df: pd.DataFrame,
    dimensions: List[str],
    metrics: List[str],
    dates: List[str]
) -> PivotConfig:
    """Generate marketing-focused pivot table."""
    
    priority_dims = ['campaign', 'channel', 'source', 'medium', 'region']
    
    rows = []
    for prio in priority_dims:
        for dim in dimensions:
            if prio in dim.lower() and dim not in rows:
                rows.append(dim)
                break
        if len(rows) >= 2:
            break
    
    if len(rows) < 2:
        rows.extend(dimensions[:2-len(rows)])
    
    values = []
    for m in metrics:
        agg = 'sum' if any(kw in m.lower() for kw in ['click', 'conversion', 'impression', 'cost']) else 'mean'
        values.append({'column': m, 'aggregation': agg, 'label': f'{_beautify_name(m)}'})
        if len(values) >= 3:
            break
    
    return PivotConfig(
        rows=rows,
        columns=None,
        values=values,
        filters=dimensions[2:4] if len(dimensions) > 2 else [],
        title="Marketing Campaign Performance"
    )


def _generate_finance_pivot(
    df: pd.DataFrame,
    dimensions: List[str],
    metrics: List[str],
    dates: List[str]
) -> PivotConfig:
    """Generate finance-focused pivot table."""
    
    priority_dims = ['account', 'category', 'department', 'type', 'status']
    
    rows = []
    for prio in priority_dims:
        for dim in dimensions:
            if prio in dim.lower() and dim not in rows:
                rows.append(dim)
                break
        if len(rows) >= 2:
            break
    
    if len(rows) < 2:
        rows.extend(dimensions[:2-len(rows)])
    
    values = []
    for m in metrics:
        values.append({'column': m, 'aggregation': 'sum', 'label': f'Total {_beautify_name(m)}'})
        if len(values) >= 3:
            break
    
    return PivotConfig(
        rows=rows,
        columns=None,
        values=values,
        filters=dimensions[2:4] if len(dimensions) > 2 else [],
        title="Financial Summary"
    )


def _generate_generic_pivot(
    df: pd.DataFrame,
    dimensions: List[str],
    metrics: List[str]
) -> PivotConfig:
    """Generate generic pivot table for unknown domains."""
    
    rows = dimensions[:2] if len(dimensions) >= 2 else dimensions
    
    values = []
    for m in metrics[:3]:
        agg = _get_aggregation_type(m)
        label = f"{'Total' if agg == 'sum' else 'Avg'} {_beautify_name(m)}"
        values.append({'column': m, 'aggregation': agg, 'label': label})
    
    return PivotConfig(
        rows=rows,
        columns=None,
        values=values,
        filters=dimensions[2:4] if len(dimensions) > 2 else [],
        title="Data Summary"
    )


def generate_pivot_data(
    df: pd.DataFrame,
    config: PivotConfig
) -> Dict[str, Any]:
    """
    Generate actual pivot table data from configuration.
    
    Returns a dict with:
    - headers: Column headers
    - rows: Data rows with hierarchical structure
    - totals: Grand totals
    """
    try:
        if not config.rows or not config.values:
            return {'error': 'Invalid pivot configuration'}
        
        # Build aggregation dict
        agg_dict = {}
        for val in config.values:
            col = val['column']
            agg = val['aggregation']
            
            if col == '__count__':
                # Special case: count rows
                continue
            elif col in df.columns:
                agg_dict[col] = agg
        
        # Group by row dimensions
        if config.columns and config.columns in df.columns:
            # Cross-tab pivot
            result = _generate_crosstab_pivot(df, config)
        else:
            # Simple pivot
            result = _generate_simple_pivot(df, config, agg_dict)
        
        return result
    
    except Exception as e:
        return {'error': str(e)}


def _generate_simple_pivot(
    df: pd.DataFrame,
    config: PivotConfig,
    agg_dict: Dict[str, str]
) -> Dict[str, Any]:
    """Generate simple grouped pivot table."""
    
    rows = [r for r in config.rows if r in df.columns]
    if not rows:
        return {'error': 'No valid row columns'}
    
    # Perform groupby
    if agg_dict:
        grouped = df.groupby(rows, as_index=False).agg(agg_dict)
    else:
        # Count-only pivot
        grouped = df.groupby(rows, as_index=False).size()
        grouped = grouped.rename(columns={'size': 'Count'})
    
    # Build headers
    headers = [_beautify_name(r) for r in rows]
    for val in config.values:
        headers.append(val['label'])
    
    # Build data rows
    data_rows = []
    for _, row in grouped.iterrows():
        row_data = {
            'dimensions': {_beautify_name(r): str(row[r]) for r in rows},
            'values': {}
        }
        for val in config.values:
            col = val['column']
            if col == '__count__':
                row_data['values'][val['label']] = int(row.get('Count', len(df)))
            elif col in row:
                v = row[col]
                row_data['values'][val['label']] = round(float(v), 2) if pd.notna(v) else 0
        data_rows.append(row_data)
    
    # Calculate grand totals
    totals = {}
    for val in config.values:
        col = val['column']
        if col == '__count__':
            totals[val['label']] = len(df)
        elif col in df.columns:
            if val['aggregation'] == 'sum':
                totals[val['label']] = round(float(df[col].sum()), 2)
            else:
                totals[val['label']] = round(float(df[col].mean()), 2)
    
    return {
        'title': config.title,
        'headers': headers,
        'row_dimensions': [_beautify_name(r) for r in rows],
        'value_columns': [v['label'] for v in config.values],
        'data': data_rows,
        'totals': totals,
        'row_count': len(data_rows)
    }


def _generate_crosstab_pivot(
    df: pd.DataFrame,
    config: PivotConfig
) -> Dict[str, Any]:
    """Generate cross-tab pivot table (rows vs column dimension)."""
    
    rows = [r for r in config.rows if r in df.columns]
    col_dim = config.columns
    
    if not rows or col_dim not in df.columns:
        return {'error': 'Invalid cross-tab columns'}
    
    # Get unique values for column dimension
    col_values = df[col_dim].dropna().unique().tolist()[:10]  # Max 10 columns
    
    # Build cross-tab data
    value_config = config.values[0] if config.values else {'column': '__count__', 'aggregation': 'count', 'label': 'Count'}
    
    # Create pivot
    if value_config['column'] == '__count__':
        pivot = pd.crosstab(
            [df[r] for r in rows],
            df[col_dim],
            margins=True,
            margins_name='Total'
        )
    else:
        val_col = value_config['column']
        if val_col not in df.columns:
            return {'error': f'Value column {val_col} not found'}
        
        agg_func = 'sum' if value_config['aggregation'] == 'sum' else 'mean'
        pivot = pd.pivot_table(
            df,
            values=val_col,
            index=rows,
            columns=col_dim,
            aggfunc=agg_func,
            margins=True,
            margins_name='Total'
        )
    
    # Convert to response format
    headers = [_beautify_name(r) for r in rows] + [str(v) for v in col_values] + ['Total']
    
    data_rows = []
    for idx, row in pivot.iterrows():
        if idx == 'Total':
            continue  # Handle separately
        
        # Handle multi-index
        if isinstance(idx, tuple):
            dims = {_beautify_name(rows[i]): str(idx[i]) for i in range(len(rows))}
        else:
            dims = {_beautify_name(rows[0]): str(idx)}
        
        values = {}
        for col in row.index:
            v = row[col]
            values[str(col)] = round(float(v), 2) if pd.notna(v) else 0
        
        data_rows.append({'dimensions': dims, 'values': values})
    
    # Get totals row
    totals = {}
    if 'Total' in pivot.index:
        total_row = pivot.loc['Total']
        for col in total_row.index:
            totals[str(col)] = round(float(total_row[col]), 2) if pd.notna(total_row[col]) else 0
    
    return {
        'title': config.title,
        'headers': headers,
        'row_dimensions': [_beautify_name(r) for r in rows],
        'column_dimension': _beautify_name(col_dim),
        'column_values': [str(v) for v in col_values],
        'value_label': value_config['label'],
        'data': data_rows,
        'totals': totals,
        'row_count': len(data_rows),
        'is_crosstab': True
    }
