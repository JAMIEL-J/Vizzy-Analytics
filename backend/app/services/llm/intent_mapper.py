from typing import Any, Dict, Optional

from app.services.llm.intent_schema import AnalysisIntent, Aggregation
from app.services.analysis_execution.operation_catalog import get_operation


def map_intent_to_operation(intent: AnalysisIntent) -> Dict[str, Any]:
    """
    Map a validated AnalysisIntent to a deterministic internal operation spec.
    """

    _assert_required_fields(intent)

    operation_def = get_operation(intent.aggregation.value)

    operation: Dict[str, Any] = {
        "operation": operation_def["name"],
        "metric": intent.metric,
        "group_by": intent.group_by,
        "time_column": intent.time_column,
        "time_granularity": intent.time_granularity.value if intent.time_granularity else None,
        "filters": intent.filters or [],
    }

    return operation


def _assert_required_fields(intent: AnalysisIntent) -> None:
    if intent.aggregation != Aggregation.COUNT and not intent.metric:
        raise ValueError("Metric is required for this aggregation")


def _build_time_block(intent: AnalysisIntent) -> Optional[Dict[str, str]]:
    if not intent.time_column:
        return None

    if not intent.time_granularity:
        raise ValueError("time_granularity is required when time_column is provided")

    return {
        "column": intent.time_column,
        "granularity": intent.time_granularity.value,
    }
