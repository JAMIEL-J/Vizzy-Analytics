from datetime import datetime, timezone
from typing import Any, Dict

import pandas as pd

from app.services.cleaning_execution.rule_engine import build_execution_plan
from app.services.cleaning_execution.executor import execute_plan


def execute_cleaning(
    df: pd.DataFrame,
    proposed_actions: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Orchestrate execution of an approved cleaning plan.

    Validates proposed_actions is not empty.
    Builds execution plan using rule_engine.
    Executes plan using executor.
    Captures start and end timestamps in UTC ISO format.

    Returns:
        {
            "cleaned_df": DataFrame,
            "execution_summary": {
                "steps_executed": int,
                "started_at": str,
                "completed_at": str
            }
        }
    """
    if not proposed_actions:
        raise ValueError("proposed_actions cannot be empty")

    started_at = datetime.now(timezone.utc).isoformat()

    execution_plan = build_execution_plan(proposed_actions)
    cleaned_df = execute_plan(df, execution_plan)

    completed_at = datetime.now(timezone.utc).isoformat()

    return {
        "cleaned_df": cleaned_df,
        "execution_summary": {
            "steps_executed": len(execution_plan),
            "started_at": started_at,
            "completed_at": completed_at,
        },
    }
