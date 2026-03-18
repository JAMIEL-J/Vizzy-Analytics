"""
Interpretive Diagnostic Battery.

Belongs to: analytics services
Responsibility: Auto-generate and run multiple diagnostic queries for "why" questions.
When intent_type == INTERPRETIVE, this module produces multi-axis analysis.
"""

from typing import Any, Dict, List, Optional
import pandas as pd
import re

from app.core.logger import get_logger

logger = get_logger(__name__)


def _is_binary_numeric(series: pd.Series) -> bool:
    """True when numeric series effectively behaves as binary target (0/1, true/false)."""
    if not pd.api.types.is_numeric_dtype(series):
        return False
    vals = [v for v in series.dropna().unique().tolist() if pd.notna(v)]
    normalized = set()

    for v in vals:
        if isinstance(v, bool):
            normalized.add(int(v))
            continue

        if isinstance(v, int):
            if v not in (0, 1):
                return False
            normalized.add(v)
            continue

        if isinstance(v, float):
            if not v.is_integer():
                return False
            iv = int(v)
            if iv not in (0, 1):
                return False
            normalized.add(iv)
            continue

        # Any other numeric subtype is treated conservatively as non-binary.
        return False

    return len(normalized) <= 2 and normalized.issubset({0, 1})


def _normalize_col_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(name).lower()).strip()


def _find_mentioned_columns(query: str, columns: List[str]) -> List[str]:
    """Find schema columns explicitly mentioned in the natural language query."""
    q = _normalize_col_name(query)
    mentioned: List[str] = []
    for col in columns:
        norm = _normalize_col_name(col)
        if not norm:
            continue
        # Match full normalized phrase or all tokens present
        if norm in q or all(tok in q.split() for tok in norm.split() if tok):
            mentioned.append(col)
    return mentioned


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

    # If no metric:
    # - Use mean(target) for binary targets (gives rate)
    # - Else use count for generic volume diagnostics
    if metric_col:
        agg_expr = "mean"
        agg_col = metric_col
    else:
        if target_col in df.columns and _is_binary_numeric(df[target_col]):
            agg_expr = "mean"
            agg_col = target_col
        else:
            agg_expr = "count"
            agg_col = target_col

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
    mentioned_cols = _find_mentioned_columns(query, list(df.columns))

    # Auto-detect metric if not supplied and query names a numeric column.
    if not metric_col:
        for col in mentioned_cols:
            if pd.api.types.is_numeric_dtype(df[col]):
                metric_col = col
                break

    # Auto-detect target if not given.
    if not target_col:
        # 1) Prefer query-mentioned low-cardinality categorical/bool or binary numeric columns.
        for col in mentioned_cols:
            nunique = df[col].dropna().nunique()
            if pd.api.types.is_numeric_dtype(df[col]):
                if _is_binary_numeric(df[col]):
                    target_col = col
                    break
            elif nunique <= 20:
                target_col = col
                break

    if not target_col:
        # 2) Prefer common outcome/status-like columns if present.
        target_keywords = ['outcome', 'status', 'default', 'converted', 'target', 'label', 'segment', 'class', 'category']
        for col in df.columns:
            if any(kw in col.lower() for kw in target_keywords):
                nunique = df[col].dropna().nunique()
                if nunique <= 20:
                    target_col = col
                    break

    if not target_col:
        # 3) Fallback: first categorical/bool with low cardinality.
        for col in df.select_dtypes(include=['object', 'category', 'bool']).columns:
            if df[col].dropna().nunique() <= 20:
                target_col = col
                break

    if not target_col:
        # 4) Final fallback: numeric binary target.
        for col in df.select_dtypes(include=['number']).columns:
            if _is_binary_numeric(df[col]):
                target_col = col
                break

    if not target_col and metric_col:
        # Use metric column as anchor so diagnostics still run for generic "why" queries.
        target_col = metric_col

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
        if col != target_col and df[col].dropna().nunique() <= 20 and "id" not in col.lower()
    ]

    # Prioritize dimensions explicitly mentioned by the user query.
    if mentioned_cols:
        mentioned_set = set(mentioned_cols)
        dimensions = sorted(dimensions, key=lambda c: (0 if c in mentioned_set else 1, c))

    # Also consider numeric columns with low cardinality (binned)
    for col in df.select_dtypes(include=['number']).columns:
        if col != metric_col and col != target_col and df[col].dropna().nunique() <= 10 and "id" not in col.lower():
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
            dim_val = row.get(diag['dimension'], "N/A")
            val = row.get('value', 0)
            if isinstance(val, (int, float)):
                val_str = "{:.2f}".format(val)
            else:
                val_str = str(val)
            context_lines.append(f"  - {dim_val}: {val_str}")
        context_lines.append("")

    return {
        "diagnostics": successful,
        "target": target_col,
        "metric": metric_col,
        "synthesis_context": "\n".join(context_lines),
    }
