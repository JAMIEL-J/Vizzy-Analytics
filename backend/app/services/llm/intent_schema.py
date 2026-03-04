from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class IntentType(str, Enum):
    ANALYSIS = "analysis"           # Chart-based analysis (triggered by visualization keywords)
    VISUALIZATION = "visualization" # Explicit visualization request
    DASHBOARD = "dashboard"         # Multi-chart dashboard
    TEXT_QUERY = "text_query"       # Text-only response (no chart)



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
