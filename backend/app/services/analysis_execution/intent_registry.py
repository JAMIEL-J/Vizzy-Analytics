from typing import Dict, List


INTENT_REGISTRY: Dict[str, Dict[str, List[str]]] = {
    "basic_aggregation": {
        "intents": [
            "count rows",
            "total records",
            "number of entries",
            "sum values",
            "average value",
            "minimum value",
            "maximum value",
        ],
        "allowed_operations": ["count", "sum", "average", "min", "max"],
    },
    "time_analysis": {
        "intents": [
            "trend over time",
            "time series",
            "growth over time",
            "change over time",
        ],
        "allowed_operations": ["time_trend"],
    },
}


def list_intent_categories() -> List[str]:
    """Return available intent categories."""
    return sorted(INTENT_REGISTRY.keys())


def get_allowed_operations(intent_category: str) -> List[str]:
    """
    Return allowed operations for an intent category.

    Raises:
        ValueError if intent category is unknown
    """
    if intent_category not in INTENT_REGISTRY:
        raise ValueError(
            f"Unknown intent category '{intent_category}'. "
            f"Available categories: {', '.join(sorted(INTENT_REGISTRY.keys()))}"
        )

    return list(INTENT_REGISTRY[intent_category]["allowed_operations"])


def match_intent_category(user_intent: str) -> str:
    """
    Match a normalized user intent to an intent category.

    This function is deterministic.
    LLMs should classify intent upstream and pass category here.
    """
    intent_lower = user_intent.lower()

    for category, data in INTENT_REGISTRY.items():
        for phrase in data["intents"]:
            if phrase in intent_lower:
                return category

    raise ValueError(
        "Unable to match intent to a supported category. "
        "Intent not allowed by governance rules."
    )
