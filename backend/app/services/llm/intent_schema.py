from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class IntentType(str, Enum):
    """
    Granular 6-type intent classification.
    Each type maps to a dedicated prompt template and execution strategy.
    """
    RETRIEVAL    = "retrieval"     # Single SQL → scalar/table ("What is total revenue?")
    COMPARATIVE  = "comparative"   # SQL with GROUP BY + comparison ("Sales by region")
    AGGREGATIVE  = "aggregative"   # Grouped aggregation, correct method enforced ("Average tenure by contract")
    INTERPRETIVE = "interpretive"  # Diagnostic battery + LLM synthesis ("Why is churn high?")
    TREND        = "trend"         # Time-series SQL, line chart forced ("Revenue over time")
    AMBIGUOUS    = "ambiguous"     # Clarification required, no SQL generated ("Show me top customers")

    # Legacy aliases (kept for backward compatibility in existing saved sessions)
    ANALYSIS      = "analysis"
    VISUALIZATION = "visualization"
    DASHBOARD     = "dashboard"
    TEXT_QUERY    = "text_query"


class Aggregation(str, Enum):
    COUNT = "count"
    SUM = "sum"
    AVG = "average"
    MIN = "min"
    MAX = "max"


class TimeGranularity(str, Enum):
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    YEAR = "year"


class AnalysisIntent(BaseModel):
    """
    Structured, validated user intent.
    Produced by LLM, consumed by backend safely.
    """

    intent_type: IntentType = Field(..., description="Type of user intent")

    metric: Optional[str] = Field(
        None,
        description="Numeric column to aggregate",
    )

    aggregation: Aggregation = Field(
        ...,
        description="Aggregation operation",
    )

    group_by: Optional[List[str]] = Field(
        default=None,
        description="Dimensions for grouping",
    )

    time_column: Optional[str] = Field(
        default=None,
        description="Time column for temporal analysis",
    )

    time_granularity: Optional[TimeGranularity] = Field(
        default=None,
        description="Time granularity if time-based analysis",
    )

    filters: Optional[dict] = Field(
        default=None,
        description="Structured filters (validated later)",
    )

