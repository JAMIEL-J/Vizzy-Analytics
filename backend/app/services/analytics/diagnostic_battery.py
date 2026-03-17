"""
Interpretive Diagnostic Battery.

Belongs to: analytics services
Responsibility: Auto-generate and run multiple diagnostic queries for "why" questions.
When intent_type == INTERPRETIVE, this module produces multi-axis analysis.
"""

from typing import Any, Dict, List, Optional
import pandas as pd

from app.core.logger import get_logger

logger = get_logger(__name__)


# ─── Diagnostic query generators ──────────────────────────────────────────────

def _build_diagnostic_queries(
    df: pd.DataFrame,
    target_col: str,
    metric_col: Optional[str],
    dimensions: List[str],
) -> List[Dict[str, Any]]:
    """
    Generate up to 5 diagnostic aggregations to investigate
    why a metric or target behaves a certain way.
    """
    queries = []

    # If no metric, default to row count
    agg_expr = "count" if not metric_col else "mean"
    agg_col = metric_col or target_col

    for dim in dimensions[:5]:  # Max 5 dimensions
        queries.append({
            "id": f"diag_{dim}",
            "title": f"{agg_col} by {dim}",
            "group_by": dim,
            "metric": agg_col,
            "aggregation": agg_expr,
        })

    return queries


def _execute_diagnostic(
    df: pd.DataFrame,
    query: Dict[str, Any],
) -> Dict[str, Any]:
    """Execute a single diagnostic aggregation on the dataframe."""
    try:
        dim = query["group_by"]
        metric = query["metric"]
        agg = query["aggregation"]

        if dim not in df.columns:
            return {"id": query["id"], "error": f"Column '{dim}' not found"}

        if agg == "count":
            result = df.groupby(dim).size().reset_index(name="count")
            result.columns = [dim, "value"]
        else:
            if metric not in df.columns:
                return {"id": query["id"], "error": f"Metric '{metric}' not found"}
            result = df.groupby(dim)[metric].agg(agg).reset_index()
            result.columns = [dim, "value"]

        # Sort descending and take top 10
        result = result.sort_values("value", ascending=False).head(10)

        return {
            "id": query["id"],
            "title": query["title"],
            "dimension": dim,
            "data": result.to_dict(orient="records"),
            "chart_type": "bar",
        }
    except Exception as e:
        logger.warning(f"Diagnostic query failed for {query['id']}: {e}")
        return {"id": query["id"], "error": str(e)}


async def run_diagnostic_battery(
    df: pd.DataFrame,
    query: str,
    target_col: Optional[str] = None,
    metric_col: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Run a full diagnostic battery for an interpretive question.

    Returns:
        {
            "diagnostics": [{"id", "title", "dimension", "data", "chart_type"}, ...],
            "target": str,
            "metric": str|None,
            "synthesis_context": str  # Pre-formatted text for LLM synthesis
        }
    """
    # Auto-detect target if not given
    if not target_col:
        target_keywords = ['churn', 'outcome', 'status', 'default', 'converted', 'target', 'label']
        cat_cols = df.select_dtypes(include=['object', 'category']).columns
        for col in cat_cols:
            if any(kw in col.lower() for kw in target_keywords):
                if df[col].nunique() <= 5:
                    target_col = col
                    break

    if not target_col:
        # Fallback: use first categorical with low cardinality
        for col in df.select_dtypes(include=['object', 'category']).columns:
            if df[col].nunique() <= 10:
                target_col = col
                break

    if not target_col:
        return {
            "diagnostics": [],
            "target": None,
            "metric": metric_col,
            "synthesis_context": "No suitable target column found for diagnostic analysis.",
        }

    # Pick dimensions: all categoricals except the target, low cardinality
    dimensions = [
        col for col in df.select_dtypes(include=['object', 'category']).columns
        if col != target_col and df[col].nunique() <= 20
    ]

    # Also consider numeric columns with low cardinality (binned)
    for col in df.select_dtypes(include=['number']).columns:
        if col != metric_col and df[col].nunique() <= 10:
            dimensions.append(col)

    if not dimensions:
        return {
            "diagnostics": [],
            "target": target_col,
            "metric": metric_col,
            "synthesis_context": "No suitable dimensions found for diagnostic breakdown.",
        }

    # Build and execute diagnostics
    diag_queries = _build_diagnostic_queries(df, target_col, metric_col, dimensions)
    results = [_execute_diagnostic(df, q) for q in diag_queries]
    successful = [r for r in results if "error" not in r]

    # Build synthesis context for LLM
    context_lines = [f"User question: {query}", f"Target: {target_col}", ""]
    for diag in successful:
        context_lines.append(f"### {diag['title']}")
        for row in diag["data"][:5]:
            context_lines.append(f"  - {row[diag['dimension']]}: {row['value']:.2f}" if isinstance(row.get('value'), float) else f"  - {row.get(diag['dimension'], 'N/A')}: {row.get('value', 'N/A')}")
        context_lines.append("")

    return {
        "diagnostics": successful,
        "target": target_col,
        "metric": metric_col,
        "synthesis_context": "\n".join(context_lines),
    }
