"""
Unit Tests for Intent Schema Module

Tests: services/llm/intent_schema.py

This module is responsible for:
- Defining structured intent types (ANALYSIS, VISUALIZATION, DASHBOARD)
- Defining aggregation operations (COUNT, SUM, AVG, MIN, MAX)
- Providing Pydantic models for LLM output validation
"""

import pytest
from pydantic import ValidationError


class TestIntentSchema:
    """Tests for intent schema definitions."""

    def test_intent_types_enum(self):
        """
        TEST: IntentType enum has all expected values.
        
        ARCHITECTURE NOTE:
        - ANALYSIS: Single metric/chart request
        - VISUALIZATION: Explicit chart type request
        - DASHBOARD: Multi-widget overview request
        """
        from app.services.llm.intent_schema import IntentType
        
        assert IntentType.ANALYSIS.value == "analysis"
        assert IntentType.DASHBOARD.value == "dashboard"
        assert IntentType.VISUALIZATION.value == "visualization"

    def test_aggregation_enum(self):
        """
        TEST: Aggregation enum has all supported operations.
        
        ARCHITECTURE NOTE:
        - These are the ONLY aggregations allowed
        - LLM must choose from this list (prevents hallucination)
        """
        from app.services.llm.intent_schema import Aggregation
        
        assert Aggregation.COUNT.value == "count"
        assert Aggregation.SUM.value == "sum"
        assert Aggregation.AVG.value == "average"
        assert Aggregation.MIN.value == "min"
        assert Aggregation.MAX.value == "max"

    def test_time_granularity_enum(self):
        """
        TEST: TimeGranularity enum has expected values.
        
        ARCHITECTURE NOTE:
        - Used for time-series grouping
        - Determines date truncation in queries
        """
        from app.services.llm.intent_schema import TimeGranularity
        
        assert TimeGranularity.DAY.value == "day"
        assert TimeGranularity.WEEK.value == "week"
        assert TimeGranularity.MONTH.value == "month"
        assert TimeGranularity.YEAR.value == "year"

    def test_analysis_intent_valid_creation(self):
        """
        TEST: AnalysisIntent can be created with valid data.
        
        ARCHITECTURE NOTE:
        - This is the structured output from LLM
        - Pydantic validation ensures no invalid fields
        """
        from app.services.llm.intent_schema import AnalysisIntent, IntentType, Aggregation
        
        intent = AnalysisIntent(
            intent_type=IntentType.ANALYSIS,
            aggregation=Aggregation.SUM,
            metric="sales",
            group_by=["region"],
        )
        
        assert intent.intent_type == IntentType.ANALYSIS
        assert intent.aggregation == Aggregation.SUM
        assert intent.metric == "sales"
        assert intent.group_by == ["region"]

    def test_analysis_intent_optional_fields(self):
        """
        TEST: Optional fields default correctly.
        
        ARCHITECTURE NOTE:
        - metric, group_by, time_column, filters are optional
        - Allows simple requests like "count all rows"
        """
        from app.services.llm.intent_schema import AnalysisIntent, IntentType, Aggregation
        
        intent = AnalysisIntent(
            intent_type=IntentType.ANALYSIS,
            aggregation=Aggregation.COUNT,
        )
        
        assert intent.metric is None
        assert intent.group_by is None
        assert intent.time_column is None
        assert intent.filters is None

    def test_analysis_intent_validation_fails_for_invalid_aggregation(self):
        """
        TEST: Invalid aggregation values are rejected.
        
        ARCHITECTURE NOTE:
        - Strict validation prevents LLM hallucinations
        - Only predefined aggregations accepted
        """
        from app.services.llm.intent_schema import AnalysisIntent, IntentType
        
        with pytest.raises(ValidationError):
            AnalysisIntent(
                intent_type=IntentType.ANALYSIS,
                aggregation="invalid_agg",  # Not in enum
            )
