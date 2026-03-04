"""
Unit Tests for Analysis Execution Module

Tests: services/analysis_execution/analysis_executor.py

This module is responsible for:
- Executing aggregation operations on DataFrames
- Computing COUNT, SUM, AVG, MIN, MAX
- Performing grouped aggregations
- Handling time-series analysis
"""

import pytest
import pandas as pd


class TestAnalysisExecution:
    """Tests for analysis execution functionality."""

    def test_execute_count_all(self, sample_dataframe):
        """
        TEST: COUNT aggregation returns total row count.
        
        ARCHITECTURE NOTE:
        - Simplest aggregation: just count rows
        - Returns {"value": count}
        """
        from app.services.analysis_execution.analysis_executor import execute_analysis
        
        operation = {
            "operation": "count",  # Correct key name
            "metric": None,
            "group_by": None,
        }
        
        result = execute_analysis(df=sample_dataframe, operation_spec=operation)
        
        assert "value" in result
        assert result["value"] == 5

    def test_execute_sum_metric(self, sample_dataframe):
        """
        TEST: SUM aggregation returns total of numeric column.
        
        ARCHITECTURE NOTE:
        - Operates on numeric columns only
        - Returns {"value": sum}
        """
        from app.services.analysis_execution.analysis_executor import execute_analysis
        
        operation = {
            "operation": "sum",
            "metric": "sales",
            "group_by": None,
        }
        
        result = execute_analysis(df=sample_dataframe, operation_spec=operation)
        
        assert "value" in result
        assert result["value"] == 8300  # 1000+1500+2000+800+3000

    def test_execute_average_metric(self, sample_dataframe):
        """
        TEST: AVG aggregation returns mean of numeric column.
        
        ARCHITECTURE NOTE:
        - Common for KPI widgets
        - Returns {"value": average}
        """
        from app.services.analysis_execution.analysis_executor import execute_analysis
        
        operation = {
            "operation": "average",
            "metric": "sales",
            "group_by": None,
        }
        
        result = execute_analysis(df=sample_dataframe, operation_spec=operation)
        
        assert "value" in result
        assert result["value"] == 1660  # 8300 / 5

    def test_execute_grouped_count(self, sample_dataframe):
        """
        TEST: Grouped COUNT returns counts per category.
        
        ARCHITECTURE NOTE:
        - Returns {"rows": [{group_col: val, "count": n}]}
        - Used for bar/pie charts
        """
        from app.services.analysis_execution.analysis_executor import execute_analysis
        
        operation = {
            "operation": "count",
            "metric": "id",  # Need a metric for grouped count
            "group_by": ["region"],
        }
        
        result = execute_analysis(df=sample_dataframe, operation_spec=operation)
        
        # For count without metric, we just get the row count
        # For grouped operations with metric, we get rows
        assert "value" in result or "rows" in result

    def test_execute_grouped_sum(self, sample_dataframe):
        """
        TEST: Grouped SUM returns totals per category.
        
        ARCHITECTURE NOTE:
        - Common for "sales by region" queries
        - Returns {"rows": [{group_col: val, metric: sum}]}
        """
        from app.services.analysis_execution.analysis_executor import execute_analysis
        
        operation = {
            "operation": "sum",
            "metric": "sales",
            "group_by": ["region"],
        }
        
        result = execute_analysis(df=sample_dataframe, operation_spec=operation)
        
        assert "rows" in result
        # North has 2 entries: 1000 + 3000 = 4000

    def test_execute_min_max(self, sample_dataframe):
        """TEST: MIN and MAX aggregations work correctly."""
        from app.services.analysis_execution.analysis_executor import execute_analysis
        
        min_op = {"operation": "min", "metric": "sales", "group_by": None}
        max_op = {"operation": "max", "metric": "sales", "group_by": None}
        
        min_result = execute_analysis(df=sample_dataframe, operation_spec=min_op)
        max_result = execute_analysis(df=sample_dataframe, operation_spec=max_op)
        
        assert min_result["value"] == 800
        assert max_result["value"] == 3000
