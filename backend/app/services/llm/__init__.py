"""
LLM integration package.

Provides intent classification, validation, mapping,
chart explanation, and response formatting for conversational analytics.
"""

from app.services.llm.intent_schema import (
    AnalysisIntent,
    IntentType,
    Aggregation,
    TimeGranularity,
)
from app.services.llm.intent_validator import validate_intent
from app.services.llm.intent_mapper import map_intent_to_operation
from app.services.llm.intent_classifier import classify_intent
from app.services.llm.chart_explainer import generate_chart_explanation
from app.services.llm.response_formatter import (
    format_analysis_response,
    format_dashboard_response,
    format_error_response,
)

__all__ = [
    "AnalysisIntent",
    "IntentType",
    "Aggregation",
    "TimeGranularity",
    "validate_intent",
    "map_intent_to_operation",
    "classify_intent",
    "generate_chart_explanation",
    "format_analysis_response",
    "format_dashboard_response",
    "format_error_response",
]

