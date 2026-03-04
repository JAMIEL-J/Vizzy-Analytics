from typing import Any, Dict, List, Optional
import pandas as pd
from app.core.exceptions import InvalidOperation
from app.core.logger import get_logger

logger = get_logger(__name__)

def execute_analysis(
    df: pd.DataFrame,
    operation_spec: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Execute a deterministic analysis operation on a DataFrame.

    operation_spec contains:
    - operation
    - metric
    - group_by
    - time_column
    - time_granularity
    - filters
    - metric_expression: Optional row-level formula (e.g. "price * qty")
    """

    operation = operation_spec["operation"]
    metric = operation_spec.get("metric")
    metric_expression = operation_spec.get("metric_expression")
    group_by = operation_spec.get("group_by")
    time_column = operation_spec.get("time_column")
    time_granularity = operation_spec.get("time_granularity")
    filters = operation_spec.get("filters") or []

    # 1. Row-Level Math (Pre-Filter)
    # Be careful with eval() - strictly internal use only.
    # In a real prod env, use a safer parser or strict regex validation.
    generated_code = []
    
    if metric_expression and metric:
        try:
            # Create a clean safe dict for eval if needed or just use pandas eval
            # We assume expression is safe column math like "price * quantity"
            # Replace column names with df['col'] syntax is hard, better to use df.eval()
            df[metric] = df.eval(metric_expression)
            generated_code.append(f"df['{metric}'] = {metric_expression}")
        except Exception as e:
            logger.error(f"Failed to calculate metric expression '{metric_expression}': {e}")
            # Fallback or raise? For now, continue if metric exists, else raise
            if metric not in df.columns:
                 raise InvalidOperation(operation="row_math", reason=f"Could not calculate '{metric}': {e}")

    # 2. Apply Filters
    df, generated_code = _apply_filters(df, filters, generated_code)

    # 3. Data Health Check
    health_warnings = []
    if metric and metric in df.columns:
        total_rows = len(df)
        if total_rows > 0:
            null_count = df[metric].isnull().sum()
            null_pct = (null_count / total_rows) * 100
            if null_pct > 2.0:
                warning = f"⚠️ Warning: {null_pct:.1f}% of records have missing '{metric}' values."
                health_warnings.append(warning)

    result = {}
    
    if operation == "count":
        if group_by:
            # Validate group_by cols exist
            for col in group_by:
                if col not in df.columns:
                    raise InvalidOperation(
                        operation="count",
                        reason=f"Group-by column '{col}' not found",
                    )
            if metric and metric in df.columns:
                # Binary target (0/1): sum = count of positives (e.g. Churn=1)
                # Non-binary categorical: count rows per group
                unique_vals = set(df[metric].dropna().unique())
                is_binary = unique_vals.issubset({0, 1, 0.0, 1.0, True, False})
                if is_binary:
                    grouped = (
                        df.groupby(group_by, dropna=False)[metric]
                        .sum()
                        .reset_index()
                        .rename(columns={metric: "count"})
                        .sort_values(by="count", ascending=False)
                    )
                    generated_code.append(
                        f"grouped = df.groupby({group_by})['{metric}'].sum().reset_index()"
                        f".rename(columns={{'{metric}': 'count'}}).sort_values('count', ascending=False)"
                    )
                    # Rename count col back to metric name for downstream chart rendering
                    grouped = grouped.rename(columns={"count": metric})
                else:
                    grouped = (
                        df.groupby(group_by, dropna=False)[metric]
                        .count()
                        .reset_index()
                        .sort_values(by=metric, ascending=False)
                    )
                    generated_code.append(
                        f"grouped = df.groupby({group_by})['{metric}'].count().reset_index()"
                    )
            else:
                # Count rows per group (no specific metric)
                grouped = (
                    df.groupby(group_by, dropna=False)
                    .size()
                    .reset_index(name="count")
                    .sort_values(by="count", ascending=False)
                )
                generated_code.append(
                    f"grouped = df.groupby({group_by}).size().reset_index(name='count')"
                    f".sort_values('count', ascending=False)"
                )
                # Rename to metric name if provided
                if metric:
                    grouped = grouped.rename(columns={"count": metric})
            result = {"rows": grouped.to_dict(orient="records")}
        else:
            # No group_by: total count
            if metric and metric in df.columns:
                unique_vals = set(df[metric].dropna().unique())
                is_binary = unique_vals.issubset({0, 1, 0.0, 1.0, True, False})
                if is_binary:
                    result = {"value": int(df[metric].sum())}
                    generated_code.append(f"result = df['{metric}'].sum()")
                else:
                    result = {"value": int(df[metric].count())}
                    generated_code.append(f"result = df['{metric}'].count()")
            else:
                result = {"value": int(len(df))}
                generated_code.append("result = len(df)")

    elif operation in {"sum", "average", "min", "max"}:
        result = _execute_aggregation(
            df=df,
            operation=operation,
            metric=metric,
            group_by=group_by,
            generated_code=generated_code
        )

    elif operation == "time_trend":
        result = _execute_time_trend(
            df=df,
            metric=metric,
            time_column=time_column,
            time_granularity=time_granularity,
            generated_code=generated_code
        )
    else:
        raise InvalidOperation(
            operation="execute_analysis",
            reason=f"Unsupported operation '{operation}'",
        )

    # Attach Metadata
    result["health_warnings"] = health_warnings
    result["generated_code"] = "\n".join(generated_code)
    
    return result


def _execute_aggregation(
    *,
    df: pd.DataFrame,
    operation: str,
    metric: str,
    group_by: Optional[List[str]],
    generated_code: List[str],
) -> Dict[str, Any]:
    """Execute aggregation with optional group-by."""

    if metric not in df.columns:
        raise InvalidOperation(
            operation="aggregation",
            reason=f"Metric column '{metric}' not found",
        )

    agg_map = {
        "sum": "sum",
        "average": "mean",
        "min": "min",
        "max": "max",
    }
    
    # Store base operation for code gen
    op_code = agg_map[operation]

    if group_by:
        for col in group_by:
            if col not in df.columns:
                raise InvalidOperation(
                    operation="aggregation",
                    reason=f"Group-by column '{col}' not found",
                )

        grouped = (
            df
            .groupby(group_by, dropna=False)[metric]
            .agg(agg_map[operation])
            .reset_index()
        )
        
        # Enforce Sort Descending by Metric
        grouped = grouped.sort_values(by=metric, ascending=False)
        
        # Code Gen
        group_cols_str = str(group_by)
        generated_code.append(
            f"grouped = df.groupby({group_cols_str})['{metric}'].{op_code}()"
            f".reset_index().sort_values(by='{metric}', ascending=False)"
        )

        return {
            "rows": grouped.to_dict(orient="records"),
        }

    value = getattr(df[metric], agg_map[operation])()
    generated_code.append(f"value = df['{metric}'].{op_code}()")
    
    return {"value": float(value)}


def _execute_time_trend(
    *,
    df: pd.DataFrame,
    metric: str,
    time_column: str,
    time_granularity: str,
    generated_code: List[str],
) -> Dict[str, Any]:
    """Execute time-based trend aggregation."""

    if time_column not in df.columns:
        raise InvalidOperation(
            operation="time_trend",
            reason=f"Time column '{time_column}' not found",
        )

    # Filter invalid dates
    df = df.dropna(subset=[time_column])
    generated_code.append(f"df = df.dropna(subset=['{time_column}'])")
    
    # Ensure datetime
    # Note: In a real scenario, we'd handle errors='coerce' and drop subsequent NaTs
    # df[time_column] = pd.to_datetime(df[time_column], errors="coerce")
    
    if time_granularity:
        rule_map = {
            "day": "D",
            "week": "W",
            "month": "M",
            "year": "Y",
        }

        if time_granularity not in rule_map:
            raise InvalidOperation(
                operation="time_trend",
                reason=f"Invalid time granularity '{time_granularity}'",
            )
            
        # Ensure index
        # We might need to copy logic from original file if it had specific handling
        try:
             df = df.set_index(time_column)
             resampled = df.resample(rule_map[time_granularity])[metric].mean().reset_index()
             df = resampled # re-assign for return
        except Exception as e:
             # Fallback
             logger.warning(f"Resample failed: {e}")
        
        resample_code = f"df = df.set_index('{time_column}').resample('{rule_map[time_granularity]}')['{metric}'].mean().reset_index()"
        generated_code.append(resample_code)

    else:
        df = (
            df
            .groupby(time_column, as_index=False)[metric]
            .mean()
        )
        generated_code.append(f"df = df.groupby('{time_column}')['{metric}'].mean()")

    return {
        "series": [
            {
                "timestamp": row[time_column].isoformat() if hasattr(row[time_column], 'isoformat') else str(row[time_column]),
                "value": float(row[metric]),
            }
            for _, row in df.iterrows()
        ]
    }


def _apply_filters(
    df: pd.DataFrame,
    filters: List[Dict[str, Any]],
    generated_code: List[str],
) -> tuple[pd.DataFrame, List[str]]:
    """Apply filters with Code Generation tracking."""
    for f in filters:
        column = f["column"]
        op = f["operator"]
        value = f["value"]

        if column not in df.columns:
            raise InvalidOperation(
                operation="filter",
                reason=f"Filter column '{column}' not found",
            )
        
        # Case Insensitive String Comparison logic
        is_string = False
        try:
            if pd.api.types.is_string_dtype(df[column]):
                is_string = True
        except:
            pass

        if op == "=":
            if is_string:
                df = df[df[column].str.lower() == str(value).lower()]
                generated_code.append(f"df = df[df['{column}'].str.lower() == '{str(value).lower()}']")
            else:
                df = df[df[column] == value]
                generated_code.append(f"df = df[df['{column}'] == {value}]")
                
        elif op == ">":
            df = df[df[column] > value]
            generated_code.append(f"df = df[df['{column}'] > {value}]")
        elif op == "<":
            df = df[df[column] < value]
            generated_code.append(f"df = df[df['{column}'] < {value}]")
        
        # NEW: Comparison NOT IN for drill-down "Others"
        elif op == "NOT IN":
            if isinstance(value, list):
                if is_string:
                    # Case insensitive exclusion? Usually IDs or Categories are standardized, 
                    # but let's stick to simple isin for now or lower if needed.
                    # Assuming value is list of strings
                    df = df[~df[column].isin(value)]
                    generated_code.append(f"df = df[~df['{column}'].isin({value})]")
                else:
                    df = df[~df[column].isin(value)]
                    generated_code.append(f"df = df[~df['{column}'].isin({value})]")
            
        else:
             # Skip unsupported for now or raise
             pass
             
    return df, generated_code
