import json
from hashlib import sha256
from typing import Any, Dict, List


def build_dashboard(result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert an analysis result payload into a dashboard specification.

    Supported result formats:
    - {"value": number}           -> KPI widget
    - {"rows": [...]}             -> Bar chart widget
    - {"series": [...]}           -> Line chart widget
    """
    widgets: List[Dict[str, Any]] = []

    if "value" in result:
        if result["value"] is None:
            raise ValueError("KPI value cannot be null")
        widgets.append(_build_kpi_widget(result))

    elif "rows" in result:
        rows = result.get("rows")
        if not isinstance(rows, list) or not rows:
            raise ValueError("Bar chart requires non-empty 'rows'")
        widgets.append(_build_bar_widget(result))

    elif "series" in result:
        series = result.get("series")
        if not isinstance(series, list) or not series:
            raise ValueError("Line chart requires non-empty 'series'")
        widgets.append(_build_line_widget(result))

    else:
        raise ValueError(
            "Unsupported result format: expected 'value', 'rows', or 'series'"
        )

    return {
        "dashboard": {
            "layout": "single",
            "widgets": widgets,
        }
    }


def _build_kpi_widget(result: Dict[str, Any]) -> Dict[str, Any]:
    """Build a KPI widget for scalar results."""
    return {
        "id": _generate_widget_id("kpi", result),
        "type": "kpi",
        "title": "Key Metric",
        "data": {
            "value": result["value"],
        },
    }


def _build_bar_widget(result: Dict[str, Any]) -> Dict[str, Any]:
    """Build a bar chart widget for grouped results."""
    return {
        "id": _generate_widget_id("bar", result),
        "type": "bar",
        "title": "Grouped Distribution",
        "data": {
            "rows": result["rows"],
        },
    }


def _build_line_widget(result: Dict[str, Any]) -> Dict[str, Any]:
    """Build a line chart widget for time-series results."""
    return {
        "id": _generate_widget_id("line", result),
        "type": "line",
        "title": "Time Trend",
        "data": {
            "series": result["series"],
        },
    }


def _generate_widget_id(widget_type: str, result: Dict[str, Any]) -> str:
    """
    Generate a stable widget ID using canonical JSON hashing.
    """
    canonical = json.dumps(
        {"type": widget_type, "result": result},
        sort_keys=True,
        separators=(",", ":"),
    )
    return sha256(canonical.encode()).hexdigest()[:12]
