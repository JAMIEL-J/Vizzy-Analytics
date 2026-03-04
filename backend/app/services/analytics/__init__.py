"""
Analytics Engine Package.

Provides intelligent dashboard generation with domain detection,
calculated KPIs, and smart chart recommendations.
"""

from .domain_detector import detect_domain, DomainType, get_domain_confidence
from .column_filter import filter_columns, ColumnClassification
from .kpi_engine import generate_kpis
from .chart_recommender import recommend_charts
from .business_questions import (
    get_business_questions,
    get_prioritized_questions,
    get_smart_chart_title,
    get_tenure_group,
)

__all__ = [
    "detect_domain",
    "DomainType",
    "get_domain_confidence",
    "filter_columns",
    "ColumnClassification",
    "generate_kpis",
    "recommend_charts",
    "get_business_questions",
    "get_prioritized_questions",
    "get_smart_chart_title",
    "get_tenure_group",
]

