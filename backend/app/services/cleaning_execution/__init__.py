"""
Cleaning execution package.

Provides atomic cleaning rules, rule engine for plan validation,
executor for applying cleaning operations to DataFrames,
and recommendations generator for automated fix suggestions.
"""

from app.services.cleaning_execution.rules import (
    drop_rows_with_nulls,
    fill_missing_mean,
    fill_missing_median,
    trim_string_columns,
    remove_duplicates,
    cap_outliers,
)
from app.services.cleaning_execution.rule_engine import (
    build_execution_plan,
    RULE_REGISTRY,
)
from app.services.cleaning_execution.executor import execute_plan
from app.services.cleaning_execution.planner import execute_cleaning
from app.services.cleaning_execution.recommendations import (
    generate_recommendations,
    build_cleaning_actions_from_recommendations,
)

__all__ = [
    "drop_rows_with_nulls",
    "fill_missing_mean",
    "fill_missing_median",
    "trim_string_columns",
    "remove_duplicates",
    "cap_outliers",
    "build_execution_plan",
    "RULE_REGISTRY",
    "execute_plan",
    "execute_cleaning",
    "generate_recommendations",
    "build_cleaning_actions_from_recommendations",
]

