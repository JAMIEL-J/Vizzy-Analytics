from typing import Any, Dict, List, Optional

from app.services.analysis.operation_catalog import get_operation
from app.services.analysis.intent_registry import get_allowed_operations


def build_analysis_contract(
    *,
    dataset_schema: Dict[str, Any],
    intent_category: str,
    requested_operation: str,
    metric: Optional[str] = None,
    dimension: Optional[str] = None,
    time_column: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Build a deterministic analysis contract.

    Returns a dictionary suitable for persistence
    as AnalysisContract.allowed_metrics / allowed_dimensions.
    """

    allowed_operations = get_allowed_operations(intent_category)

    if requested_operation not in allowed_operations:
        raise ValueError(
            f"Operation '{requested_operation}' is not allowed for intent '{intent_category}'"
        )

    operation = get_operation(requested_operation)

    _validate_operation_requirements(
        operation=operation,
        dataset_schema=dataset_schema,
        metric=metric,
        dimension=dimension,
        time_column=time_column,
    )

    contract: Dict[str, Any] = {
        "operation": requested_operation,
        "metric": metric,
        "dimension": dimension,
        "time_column": time_column,
        "intent_category": intent_category,
    }

    return contract


def _validate_operation_requirements(
    *,
    operation: Dict[str, Any],
    dataset_schema: Dict[str, Any],
    metric: Optional[str],
    dimension: Optional[str],
    time_column: Optional[str],
) -> None:
    """Validate that requested fields satisfy operation constraints."""

    columns = dataset_schema.get("columns", {})

    if operation["requires_metric"]:
        if not metric:
            raise ValueError("Metric is required for this operation")
        if metric not in columns:
            raise ValueError(f"Metric column '{metric}' does not exist")

    if operation.get("requires_dimension"):
        if not dimension:
            raise ValueError("Dimension is required for this operation")
        if dimension not in columns:
            raise ValueError(f"Dimension column '{dimension}' does not exist")

    if operation["supports_time"]:
        if not time_column:
            raise ValueError("Time column is required for time-based analysis")
        if time_column not in columns:
            raise ValueError(f"Time column '{time_column}' does not exist")
