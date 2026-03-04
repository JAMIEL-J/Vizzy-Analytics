"""
Text answer generator module.

Belongs to: LLM services layer
Responsibility: Generate text-only answers for non-visualization queries
Restrictions: Returns formatted text responses without charts
"""

from typing import Any, Dict, List, Optional

import pandas as pd

from app.core.logger import get_logger
from app.services.llm.intent_schema import AnalysisIntent, Aggregation
from app.services.llm.column_matcher import find_best_column_match, suggest_similar_columns

logger = get_logger(__name__)


def _format_column_name(column_name: str) -> str:
    """Convert column_name to friendly display name."""
    if not column_name:
        return ""
    # Replace underscores with spaces and title case
    return column_name.replace("_", " ").title()


def _resolve_metric(metric: Optional[str], columns: List[str]) -> Optional[str]:
    """Resolve metric name using fuzzy matching and semantic understanding."""
    if not metric:
        return None
    
    # Import semantic resolver
    from app.services.llm.semantic_column_resolver import resolve_metric_with_semantics
    
    # Try both fuzzy and semantic matching
    matched = resolve_metric_with_semantics(
        user_metric=metric,
        available_columns=columns,
        fuzzy_match_func=find_best_column_match,
    )
    
    if matched:
        if matched != metric:
            logger.info(f"Resolved metric: '{metric}' → '{matched}'")
        return matched
    
    return metric  # Return original if no match


def generate_text_answer(
    df: pd.DataFrame,
    intent: AnalysisIntent,
    query: str,
    contract: Optional[Any] = None,  # AnalysisContract
) -> Dict[str, Any]:
    """
    Generate a text-only answer based on the intent.
    
    Args:
        df: DataFrame to analyze
        intent: Parsed user intent
        query: Original user query
        contract: Analysis contract for metric definitions
        
    Returns:
        {
            "answer": "Natural language answer",
            "value": computed_value,
            "column": "column_name",
            "aggregation": "aggregation_type",
            "methodology": ["step 1", "step 2"]
        }
    """
    # Resolve metric with fuzzy matching
    columns = list(df.columns)
    
    # Keep ORIGINAL metric name for user-facing responses  
    original_metric = intent.metric
    
    # Resolve to actual column name for computation
    metric = _resolve_metric(intent.metric, columns)
    aggregation = intent.aggregation
    group_by = intent.group_by
    
    # Also resolve group_by columns
    if group_by:
        group_by = [_resolve_metric(g, columns) or g for g in group_by]
    
    # Handle chat/greetings
    query_lower = query.lower().strip()
    greetings = ["hello", "hi", "hey", "greetings", "good morning", "good afternoon", "thanks", "thank you"]
    if query_lower in greetings or (len(query_lower) < 10 and any(g in query_lower for g in greetings)):
        return {
            "answer": "Hello! I'm your analytics assistant. I can help you analyze your data, create visualizations, or answer specific questions. What would you like to know?",
            "value": None,
            "column": None,
            "aggregation": None,
            "methodology": []
        }
    
    try:
        methodology_steps = []
        
        # 1. Verify metric in contract if provided
        if contract and contract.allowed_metrics and metric:
            # Check if metric is allowed/defined
            metrics_dict = contract.allowed_metrics.get("metrics", {})
            
            # Handle list format (legacy)
            if isinstance(metrics_dict, list):
                if metric not in metrics_dict:
                     logger.warning(f"Metric '{metric}' not found in contract")
            # Handle dict format (new MetricDefinition)
            elif isinstance(metrics_dict, dict):
                 meta = metrics_dict.get(metric)
                 if meta:
                     # If it's a dict (MetricDefinition), exposing formula
                     if isinstance(meta, dict) and meta.get("expression"):
                         methodology_steps.append(f"Calculated '{meta.get('name', metric)}' = {meta.get('expression')}")

        # Compute the value based on aggregation
        if aggregation == Aggregation.COUNT:
            if group_by:
                result = df.groupby(group_by).size()
                value = len(result)
                answer = _format_count_grouped(result, group_by)
                methodology_steps.append(f"Grouped by {', '.join(group_by)} and counted records")
            else:
                value = len(df)
                answer = f"There are **{value:,}** total records in the dataset."
                methodology_steps.append("Counted total records in dataset")
                
        elif aggregation == Aggregation.SUM:
            if metric and metric in df.columns:
                # Use ORIGINAL metric name for display, not resolved column
                friendly_name = _format_column_name(original_metric) if original_metric else _format_column_name(metric)
                if group_by:
                    result = df.groupby(group_by)[metric].sum()
                    value = result.sum()
                    answer = _format_sum_grouped(result, metric, group_by)
                    methodology_steps.append(f"Grouped by {', '.join(group_by)} and summed '{metric}'")
                else:
                    if pd.api.types.is_numeric_dtype(df[metric]):
                        value = df[metric].sum()
                        answer = f"The total **{friendly_name}** is **{_format_number(value)}**."
                        methodology_steps.append(f"Summed values in '{metric}' column")
                    else:
                        # For categorical columns, "Total" usually implies a breakdown or specific count
                        if df[metric].nunique() < 10:
                            counts = df[metric].value_counts()
                            breakdown = ", ".join([f"**{k}**: {_format_number(v)}" for k, v in counts.items()])
                            value = len(df)
                            answer = f"Total **{friendly_name}** breakdown: {breakdown}"
                            methodology_steps.append(f"Counted unique values for '{metric}'")
                        else:
                            # Fallback to count for high cardinality
                            value = len(df)
                            answer = f"There are **{value:,}** total **{friendly_name}** entries."
                            methodology_steps.append(f"Counted total records for '{metric}'")
            else:
                return _error_response(f"Column '{metric}' not found")
                
        elif aggregation == Aggregation.AVG:
            if metric and metric in df.columns:
                friendly_name = _format_column_name(original_metric) if original_metric else _format_column_name(metric)
                if group_by:
                    result = df.groupby(group_by)[metric].mean()
                    value = result.mean()
                    answer = _format_avg_grouped(result, metric, group_by)
                    methodology_steps.append(f"Grouped by {', '.join(group_by)} and averaged '{metric}'")
                else:
                    value = df[metric].mean()
                    answer = f"The average **{friendly_name}** is **{_format_number(value)}**."
                    methodology_steps.append(f"Calculated average of '{metric}'")
            else:
                return _error_response(f"Column '{metric}' not found")
                
        elif aggregation == Aggregation.MIN:
            if metric and metric in df.columns:
                friendly_name = _format_column_name(original_metric) if original_metric else _format_column_name(metric)
                value = df[metric].min()
                answer = f"The minimum **{friendly_name}** is **{_format_number(value)}**."
                methodology_steps.append(f"Found minimum value in '{metric}'")
            else:
                return _error_response(f"Column '{metric}' not found")
                
        elif aggregation == Aggregation.MAX:
            if metric and metric in df.columns:
                friendly_name = _format_column_name(original_metric) if original_metric else _format_column_name(metric)
                value = df[metric].max()
                answer = f"The maximum **{friendly_name}** is **{_format_number(value)}**."
                methodology_steps.append(f"Found maximum value in '{metric}'")
            else:
                return _error_response(f"Column '{metric}' not found")
                
        else:
            # Default: describe the dataset
            return _generate_data_summary(df, query)
        
        return {
            "answer": answer,
            "value": value,
            "column": metric,
            "aggregation": aggregation.value,
            "methodology": methodology_steps
        }
        
    except Exception as e:
        logger.error(f"Error generating text answer: {e}")
        return _error_response(str(e))


def _format_number(value: float) -> str:
    """Format a number for display."""
    if pd.isna(value):
        return "N/A"
    
    if isinstance(value, (int, float)):
        if isinstance(value, float):
            if value >= 1_000_000:
                return f"{value / 1_000_000:.2f}M"
            elif value >= 1_000:
                return f"{value / 1_000:.2f}K"
            elif value == int(value):
                return f"{int(value):,}"
            else:
                return f"{value:,.2f}"
        return f"{value:,}"
    
    return str(value)


def _format_count_grouped(result: pd.Series, group_by: list) -> str:
    """Format grouped count result."""
    group_col = group_by[0] if group_by else "group"
    top_items = result.nlargest(3)
    
    lines = [f"Here's the count breakdown by **{group_col}**:\n"]
    for name, count in top_items.items():
        lines.append(f"- **{name}**: {count:,}")
    
    if len(result) > 3:
        lines.append(f"\n*...and {len(result) - 3} more categories.*")
    
    return "\n".join(lines)


def _format_sum_grouped(result: pd.Series, metric: str, group_by: list) -> str:
    """Format grouped sum result."""
    group_col = group_by[0] if group_by else "group"
    friendly_metric = _format_column_name(metric)
    friendly_group = _format_column_name(group_col)
    top_items = result.nlargest(3)
    
    lines = [f"Here's the **{friendly_metric}** total by **{friendly_group}**:\n"]
    for name, value in top_items.items():
        lines.append(f"- **{name}**: {_format_number(value)}")
    
    total = result.sum()
    lines.append(f"\n**Total across all**: {_format_number(total)}")
    
    return "\n".join(lines)


def _format_avg_grouped(result: pd.Series, metric: str, group_by: list) -> str:
    """Format grouped average result."""
    group_col = group_by[0] if group_by else "group"
    friendly_metric = _format_column_name(metric)
    friendly_group = _format_column_name(group_col)
    
    lines = [f"Here's the average **{friendly_metric}** by **{friendly_group}**:\n"]
    for name, value in result.items():
        lines.append(f"- **{name}**: {_format_number(value)}")
    
    overall_avg = result.mean()
    lines.append(f"\n**Overall average**: {_format_number(overall_avg)}")
    
    return "\n".join(lines)


def _generate_data_summary(df: pd.DataFrame, query: str) -> Dict[str, Any]:
    """Generate a general data summary when no specific aggregation."""
    row_count = len(df)
    col_count = len(df.columns)
    
    # Get numeric columns for summary
    numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
    
    summary_lines = [
        f"Your dataset contains **{row_count:,}** rows and **{col_count}** columns.\n",
    ]
    
    if numeric_cols:
        summary_lines.append("**Numeric columns summary:**\n")
        for col in numeric_cols[:5]:  # Limit to first 5
            friendly_col = _format_column_name(col)
            total = df[col].sum()
            avg = df[col].mean()
            summary_lines.append(f"- **{friendly_col}**: Total = {_format_number(total)}, Avg = {_format_number(avg)}")
    
    # Add null info
    null_counts = df.isnull().sum()
    cols_with_nulls = null_counts[null_counts > 0]
    if len(cols_with_nulls) > 0:
        summary_lines.append(f"\n**Note:** {len(cols_with_nulls)} columns have missing values.")
    
    return {
        "answer": "\n".join(summary_lines),
        "value": None,
        "column": None,
        "aggregation": "summary",
        "methodology": ["Analyzed dataset structure"]
    }


def _error_response(message: str) -> Dict[str, Any]:
    """Generate error response."""
    return {
        "answer": f"I couldn't compute that: {message}",
        "value": None,
        "column": None,
        "aggregation": None,
        "methodology": [],
        "error": True,
    }
