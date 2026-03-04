from typing import Any, Dict, List


OPERATION_REGISTRY: Dict[str, Dict[str, Any]] = {
    "count": {
        "name": "count",
        "requires_metric": False,
        "requires_dimension": False,
        "requires_group_by": False,
        "supports_time": False,
        "output_type": "scalar",
    },
    "sum": {
        "name": "sum",
        "requires_metric": True,
        "requires_dimension": False,
        "requires_group_by": False,
        "supports_time": False,
        "output_type": "scalar",
    },
    "average": {
        "name": "average",
        "requires_metric": True,
        "requires_dimension": False,
        "requires_group_by": False,
        "supports_time": False,
        "output_type": "scalar",
    },
    "min": {
        "name": "min",
        "requires_metric": True,
        "requires_dimension": False,
        "requires_group_by": False,
        "supports_time": False,
        "output_type": "scalar",
    },
    "max": {
        "name": "max",
        "requires_metric": True,
        "requires_dimension": False,
        "requires_group_by": False,
        "supports_time": False,
        "output_type": "scalar",
    },
    "time_trend": {
        "name": "time_trend",
        "requires_metric": True,
        "requires_dimension": False,
        "requires_group_by": False,
        "supports_time": True,
        "output_type": "series",
    },
}


def get_operation(name: str) -> Dict[str, Any]:
    """
    Return a copy of an operation definition.

    Raises:
        ValueError: if operation name is unknown
    """
    if name not in OPERATION_REGISTRY:
        raise ValueError(
            f"Unknown operation '{name}'. "
            f"Available operations: {', '.join(sorted(OPERATION_REGISTRY.keys()))}"
        )

    # Return a copy to prevent accidental mutation
    return OPERATION_REGISTRY[name].copy()


def list_operations() -> List[str]:
    """Return sorted list of available operation names."""
    return sorted(OPERATION_REGISTRY.keys())
