from typing import Any, Callable, Dict, List, Tuple

import pandas as pd


def execute_plan(
    df: pd.DataFrame,
    execution_plan: List[Tuple[Callable, Dict[str, Any]]],
) -> pd.DataFrame:
    """
    Apply a validated cleaning execution plan to a DataFrame.

    Starts from a copy of the input DataFrame.
    Applies each rule function with its params in order.
    Raises any exception thrown by a rule.
    Returns the final DataFrame.
    """
    result = df.copy()

    for rule_fn, params in execution_plan:
        result = rule_fn(result, **params)

    return result
