from typing import Any, Callable, Dict, List, Tuple

from app.services.cleaning_execution import rules


RULE_REGISTRY: Dict[str, Callable] = {
    "drop_rows_with_nulls": rules.drop_rows_with_nulls,
    "fill_missing_mean": rules.fill_missing_mean,
    "fill_missing_median": rules.fill_missing_median,
    "trim_string_columns": rules.trim_string_columns,
    "remove_duplicates": rules.remove_duplicates,
    "cap_outliers": rules.cap_outliers,
}


def build_execution_plan(
    proposed_actions: Dict[str, Any],
) -> List[Tuple[Callable, Dict[str, Any]]]:
    """
    Convert a cleaning plan dictionary into an executable rule plan.

    Returns ordered list of (function, params) tuples.
    Raises ValueError for any invalid structure or rule.
    """
    _validate_plan_structure(proposed_actions)

    execution_plan: List[Tuple[Callable, Dict[str, Any]]] = []

    for index, step in enumerate(proposed_actions["steps"]):
        _validate_step(step, index)

        rule_name: str = step["rule"]
        params: Dict[str, Any] = step["params"]

        if rule_name not in RULE_REGISTRY:
            raise ValueError(
                f"Step {index}: Unknown rule '{rule_name}'. "
                f"Available rules: {', '.join(sorted(RULE_REGISTRY.keys()))}"
            )

        execution_plan.append((RULE_REGISTRY[rule_name], params))

    return execution_plan


def _validate_plan_structure(proposed_actions: Dict[str, Any]) -> None:
    if not isinstance(proposed_actions, dict):
        raise ValueError("proposed_actions must be a dictionary")

    steps = proposed_actions.get("steps")
    if steps is None:
        raise ValueError("proposed_actions must contain 'steps'")

    if not isinstance(steps, list):
        raise ValueError("'steps' must be a list")

    if not steps:
        raise ValueError("'steps' cannot be empty")


def _validate_step(step: Any, index: int) -> None:
    if not isinstance(step, dict):
        raise ValueError(f"Step {index}: must be a dictionary")

    rule = step.get("rule")
    if not isinstance(rule, str) or not rule:
        raise ValueError(f"Step {index}: 'rule' must be a non-empty string")

    if "params" not in step:
        raise ValueError(f"Step {index}: missing required 'params'")

    if not isinstance(step["params"], dict):
        raise ValueError(f"Step {index}: 'params' must be a dictionary")
