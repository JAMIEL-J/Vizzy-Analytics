"""
Visualization package.

Provides chart building, dashboard generation, KPI calculation,
filtering, and widget management.
"""

from app.services.visualization.dashboard_builder import build_dashboard
from app.services.visualization.dashboard_generator import (
    generate_overview_dashboard,
    build_single_chart,
)
from app.services.visualization.chart_specs import build_chart_spec, ChartType
from app.services.visualization.kpi_calculator import (
    calculate_kpi,
    calculate_multiple_kpis,
    auto_generate_kpis,
    KPIType,
)
from app.services.visualization.dashboard_filters import (
    apply_filter,
    apply_filters,
    get_filter_options,
    get_all_filter_options,
    FilterOperator,
)
from app.services.visualization.widget_service import (
    refresh_widget,
    refresh_all_widgets,
    create_widget_from_config,
)

__all__ = [
    # Dashboard
    "build_dashboard",
    "generate_overview_dashboard",
    "build_single_chart",
    # Charts
    "build_chart_spec",
    "ChartType",
    # KPI
    "calculate_kpi",
    "calculate_multiple_kpis",
    "auto_generate_kpis",
    "KPIType",
    # Filters
    "apply_filter",
    "apply_filters",
    "get_filter_options",
    "get_all_filter_options",
    "FilterOperator",
    # Widgets
    "refresh_widget",
    "refresh_all_widgets",
    "create_widget_from_config",
]

