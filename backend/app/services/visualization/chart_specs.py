"""
Chart specification module.

Builds frontend-agnostic chart specifications from analysis results.
"""

from enum import Enum
from typing import Any, Dict, List, Optional


class ChartType(str, Enum):
    """Supported chart types."""
    KPI = "kpi"
    BAR = "bar"
    LINE = "line"
    PIE = "pie"
    TABLE = "table"
    SCATTER = "scatter"
    AREA = "area"
    HEATMAP = "heatmap"


def build_chart_spec(
    *,
    chart_type: ChartType,
    title: str,
    data: Dict[str, Any],
    config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Build a frontend-agnostic chart specification.

    Args:
        chart_type: Type of chart to build
        title: Chart title
        data: Chart data payload
        config: Optional chart configuration

    Returns:
        Complete chart specification
    """
    builders = {
        ChartType.KPI: _build_kpi,
        ChartType.BAR: _build_bar,
        ChartType.LINE: _build_line,
        ChartType.PIE: _build_pie,
        ChartType.TABLE: _build_table,
        ChartType.SCATTER: _build_scatter,
        ChartType.AREA: _build_area,
        ChartType.HEATMAP: _build_heatmap,
    }

    builder = builders.get(chart_type)
    if not builder:
        raise ValueError(f"Unsupported chart type: {chart_type}")

    return builder(title=title, data=data, config=config or {})


def _build_kpi(
    title: str,
    data: Dict[str, Any],
    config: Dict[str, Any],
) -> Dict[str, Any]:
    """
    KPI / Metric card.

    Expected data: {"value": number, "label": str, "change": number (optional)}
    """
    return {
        "type": "kpi",
        "title": title,
        "value": data.get("value"),
        "label": data.get("label", title),
        "change": data.get("change"),
        "format": config.get("format", "number"),
    }


def _build_bar(
    title: str,
    data: Dict[str, Any],
    config: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Bar chart (vertical or horizontal).

    Expected data: {"rows": [{"category": str, "value": number}]}
    """
    rows = data.get("rows", [])
    
    # 1. Sort Descending by Value (Enforced)
    # Assume rows have 'value' key, or fallback to 2nd key
    def get_val(r): return r.get("value", r.get("count", 0))
    rows.sort(key=get_val, reverse=True)
    
    # 2. Top N + Others Logic
    MAX_CATEGORIES = 10
    if len(rows) > MAX_CATEGORIES:
        top_n = rows[:MAX_CATEGORIES]
        others = rows[MAX_CATEGORIES:]
        
        others_sum = sum(get_val(r) for r in others)
        
        # Get category key
        cat_key = "category"
        if rows and "category" not in rows[0]:
            # fallback to first key that isn't value
            keys = list(rows[0].keys())
            # Safely find a key that isn't value/count
            cat_key = next((k for k in keys if k not in ["value", "count"]), keys[0])
            
        # Collect excluded categories for filter
        excluded_cats = [r.get(cat_key) for r in top_n]
        
        # Add "Others" row
        others_row = {cat_key: "Others", "value": others_sum}
        
        # Add Drill-down metadata for Others
        others_row["_drill_down_filter"] = {
            "column": cat_key,
            "operator": "NOT IN",
            "value": excluded_cats
        }
        
        # Replace rows
        rows = top_n + [others_row]

    return {
        "type": "bar",
        "title": title,
        "orientation": config.get("orientation", "vertical"),
        "x": [row.get("category", row.get(list(row.keys())[0])) for row in rows],
        "y": [row.get("value", row.get("count", 0)) for row in rows],
        "color": config.get("color"),
        # Pass full rows to frontend to access _drill_down_filter
        "data": rows 
    }


def _build_line(
    title: str,
    data: Dict[str, Any],
    config: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Line chart for time series.

    Expected data: {"series": [{"timestamp": str, "value": number}]}
    """
    series = data.get("series", [])

    return {
        "type": "line",
        "title": title,
        "x": [p.get("timestamp") for p in series],
        "y": [p.get("value") for p in series],
        "smooth": config.get("smooth", False),
        "fill": config.get("fill", False),
    }


def _build_pie(
    title: str,
    data: Dict[str, Any],
    config: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Pie / Donut chart for percentage breakdown.

    Expected data: {"segments": [{"label": str, "value": number}]}
    Or: {"rows": [{"category": str, "value": number}]}
    """
    segments = data.get("segments") or data.get("rows", [])
    
    # helper
    def get_val(s): return s.get("value") or s.get("count", 0)
    
    # 1. Sort Descending
    segments.sort(key=get_val, reverse=True)
    
    # 2. Top N + Others Logic
    MAX_SLICES = 10
    if len(segments) > MAX_SLICES:
        top_n = segments[:MAX_SLICES]
        others = segments[MAX_SLICES:]
        
        others_sum = sum(get_val(s) for s in others)
        
        # Identify label key
        lbl_key = "label"
        if segments and "label" not in segments[0]:
             lbl_key = "category"
             if "category" not in segments[0]:
                 # fallback
                 keys = list(segments[0].keys())
                 lbl_key = next((k for k in keys if k not in ["value", "count"]), keys[0])
                 
        excluded_lbls = [s.get(lbl_key) for s in top_n]
        
        others_seg = {lbl_key: "Others", "value": others_sum}
        
        # Drill down metadata
        others_seg["_drill_down_filter"] = {
            "column": lbl_key,
            "operator": "NOT IN",
            "value": excluded_lbls
        }
        
        segments = top_n + [others_seg]
        # Re-assign to handle the updated list structure for proper returns

    labels = []
    values = []
    full_data = []

    for seg in segments:
        label = seg.get("label") or seg.get("category") or seg.get(list(seg.keys())[0])
        value = seg.get("value") or seg.get("count", 0)
        labels.append(label)
        values.append(value)
        full_data.append(seg)

    return {
        "type": "pie",
        "title": title,
        "labels": labels,
        "values": values,
        "donut": config.get("donut", False),
        "data": full_data # Pass for drill down
    }


def _build_table(
    title: str,
    data: Dict[str, Any],
    config: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Data table for raw data display.

    Expected data: {"columns": [str], "rows": [[values]]}
    Or: {"rows": [{col: value}]}
    """
    rows = data.get("rows", [])

    if rows and isinstance(rows[0], dict):
        columns = list(rows[0].keys())
        table_rows = [[row.get(col) for col in columns] for row in rows]
    else:
        columns = data.get("columns", [])
        table_rows = rows

    return {
        "type": "table",
        "title": title,
        "columns": columns,
        "rows": table_rows,
        "pageSize": config.get("pageSize", 10),
        "sortable": config.get("sortable", True),
    }


def _build_scatter(
    title: str,
    data: Dict[str, Any],
    config: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Scatter plot for correlation analysis.

    Expected data: {"points": [{"x": number, "y": number, "label": str (optional)}]}
    """
    points = data.get("points", [])

    return {
        "type": "scatter",
        "title": title,
        "points": [
            {
                "x": p.get("x"),
                "y": p.get("y"),
                "label": p.get("label"),
                "size": p.get("size", 5),
            }
            for p in points
        ],
        "xLabel": config.get("xLabel", "X"),
        "yLabel": config.get("yLabel", "Y"),
        "showTrendline": config.get("showTrendline", False),
    }


def _build_area(
    title: str,
    data: Dict[str, Any],
    config: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Area chart (filled line chart).

    Expected data: {"series": [{"timestamp": str, "value": number}]}
    Or for stacked: {"series": [{"timestamp": str, "values": {category: number}}]}
    """
    series = data.get("series", [])

    return {
        "type": "area",
        "title": title,
        "x": [p.get("timestamp") for p in series],
        "y": [p.get("value") for p in series],
        "stacked": config.get("stacked", False),
        "fill": True,
    }


def _build_heatmap(
    title: str,
    data: Dict[str, Any],
    config: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Heatmap for matrix comparisons.

    Expected data: {
        "xLabels": [str],
        "yLabels": [str],
        "matrix": [[number]]
    }
    """
    return {
        "type": "heatmap",
        "title": title,
        "xLabels": data.get("xLabels", []),
        "yLabels": data.get("yLabels", []),
        "matrix": data.get("matrix", []),
        "colorScale": config.get("colorScale", "blues"),
        "showValues": config.get("showValues", True),
    }


def get_supported_chart_types() -> List[str]:
    """Return list of supported chart types."""
    return [ct.value for ct in ChartType]
