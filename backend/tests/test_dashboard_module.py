"""
Tests for Dashboard Module.

Tests the new modules:
- kpi_calculator.py (calculate_kpi, KPIType)
- dashboard_filters.py (apply_filter, apply_filters, FilterOperator)
- widget_service.py (refresh_widget)
"""

import pytest
import pandas as pd
import numpy as np


class TestKPICalculator:
    """Tests for KPI calculator module."""

    @pytest.fixture
    def sample_df(self):
        """Sample DataFrame for testing."""
        return pd.DataFrame({
            "product": ["A", "B", "A", "C", "B", "A"],
            "sales": [100, 200, 150, 300, 250, 175],
            "quantity": [10, 20, 15, 30, 25, 17],
            "region": ["East", "West", "East", "North", "West", "East"],
        })

    def test_kpi_count(self, sample_df):
        """
        TEST: COUNT KPI returns correct row count.
        """
        from app.services.visualization.kpi_calculator import calculate_kpi, KPIType
        
        result = calculate_kpi(sample_df, KPIType.COUNT)
        
        assert result["value"] == 6
        assert "label" in result
        assert "formatted" in result

    def test_kpi_sum(self, sample_df):
        """
        TEST: SUM KPI returns correct total.
        """
        from app.services.visualization.kpi_calculator import calculate_kpi, KPIType
        
        result = calculate_kpi(sample_df, KPIType.SUM, column="sales")
        
        assert result["value"] == 1175  # 100+200+150+300+250+175

    def test_kpi_average(self, sample_df):
        """
        TEST: AVERAGE KPI returns correct mean.
        """
        from app.services.visualization.kpi_calculator import calculate_kpi, KPIType
        
        result = calculate_kpi(sample_df, KPIType.AVERAGE, column="sales")
        
        expected_avg = 1175 / 6
        assert abs(result["value"] - expected_avg) < 0.01

    def test_kpi_min_max(self, sample_df):
        """
        TEST: MIN and MAX KPIs return correct values.
        """
        from app.services.visualization.kpi_calculator import calculate_kpi, KPIType
        
        min_result = calculate_kpi(sample_df, KPIType.MIN, column="sales")
        max_result = calculate_kpi(sample_df, KPIType.MAX, column="sales")
        
        assert min_result["value"] == 100
        assert max_result["value"] == 300

    def test_kpi_unique_count(self, sample_df):
        """
        TEST: UNIQUE_COUNT KPI returns correct count.
        """
        from app.services.visualization.kpi_calculator import calculate_kpi, KPIType
        
        result = calculate_kpi(sample_df, KPIType.UNIQUE_COUNT, column="product")
        
        assert result["value"] == 3  # A, B, C

    def test_kpi_with_filter(self, sample_df):
        """
        TEST: KPI calculation with filter applied.
        """
        from app.services.visualization.kpi_calculator import calculate_kpi, KPIType
        
        result = calculate_kpi(
            sample_df, 
            KPIType.SUM, 
            column="sales",
            filter_column="region",
            filter_value="East",
        )
        
        # East region: 100 + 150 + 175 = 425
        assert result["value"] == 425

    def test_auto_generate_kpis(self, sample_df):
        """
        TEST: auto_generate_kpis creates sensible KPIs.
        """
        from app.services.visualization.kpi_calculator import auto_generate_kpis
        
        result = auto_generate_kpis(sample_df, max_kpis=4)
        
        assert len(result) <= 4
        assert all("value" in kpi for kpi in result)
        assert all("title" in kpi for kpi in result)


class TestDashboardFilters:
    """Tests for dashboard filters module."""

    @pytest.fixture
    def sample_df(self):
        """Sample DataFrame for testing."""
        return pd.DataFrame({
            "name": ["Alice", "Bob", "Charlie", "Diana", "Eve"],
            "age": [25, 30, 35, 28, 32],
            "city": ["NYC", "LA", "NYC", "Chicago", "LA"],
            "active": [True, False, True, True, False],
        })

    def test_filter_equals(self, sample_df):
        """
        TEST: EQUALS filter works correctly.
        """
        from app.services.visualization.dashboard_filters import apply_filter, FilterOperator
        
        result = apply_filter(sample_df, "city", FilterOperator.EQUALS, "NYC")
        
        assert len(result) == 2
        assert all(result["city"] == "NYC")

    def test_filter_not_equals(self, sample_df):
        """
        TEST: NOT_EQUALS filter works correctly.
        """
        from app.services.visualization.dashboard_filters import apply_filter, FilterOperator
        
        result = apply_filter(sample_df, "city", FilterOperator.NOT_EQUALS, "NYC")
        
        assert len(result) == 3
        assert all(result["city"] != "NYC")

    def test_filter_greater_than(self, sample_df):
        """
        TEST: GREATER_THAN filter works correctly.
        """
        from app.services.visualization.dashboard_filters import apply_filter, FilterOperator
        
        result = apply_filter(sample_df, "age", FilterOperator.GREATER_THAN, 30)
        
        assert len(result) == 2  # Charlie (35) and Eve (32)
        assert all(result["age"] > 30)

    def test_filter_contains(self, sample_df):
        """
        TEST: CONTAINS filter works correctly.
        """
        from app.services.visualization.dashboard_filters import apply_filter, FilterOperator
        
        result = apply_filter(sample_df, "name", FilterOperator.CONTAINS, "li")
        
        assert len(result) == 2  # Alice and Charlie

    def test_filter_in(self, sample_df):
        """
        TEST: IN filter works correctly.
        """
        from app.services.visualization.dashboard_filters import apply_filter, FilterOperator
        
        result = apply_filter(sample_df, "city", FilterOperator.IN, ["NYC", "LA"])
        
        assert len(result) == 4  # Alice, Bob, Charlie, Eve

    def test_filter_between(self, sample_df):
        """
        TEST: BETWEEN filter works correctly.
        """
        from app.services.visualization.dashboard_filters import apply_filter, FilterOperator
        
        result = apply_filter(sample_df, "age", FilterOperator.BETWEEN, [28, 32])
        
        assert len(result) == 3  # Bob, Diana, Eve

    def test_apply_multiple_filters(self, sample_df):
        """
        TEST: Multiple filters applied together.
        """
        from app.services.visualization.dashboard_filters import apply_filters
        
        filters = [
            {"column": "city", "operator": "eq", "value": "NYC"},
            {"column": "age", "operator": "gt", "value": 30},
        ]
        
        result = apply_filters(sample_df, filters)
        
        assert len(result) == 1  # Only Charlie (NYC, 35)

    def test_get_filter_options_numeric(self, sample_df):
        """
        TEST: get_filter_options returns range for numeric columns.
        """
        from app.services.visualization.dashboard_filters import get_filter_options
        
        result = get_filter_options(sample_df, "age")
        
        assert result["filter_type"] == "range"
        assert result["min"] == 25
        assert result["max"] == 35

    def test_get_filter_options_categorical(self, sample_df):
        """
        TEST: get_filter_options returns options for categorical columns.
        """
        from app.services.visualization.dashboard_filters import get_filter_options
        
        result = get_filter_options(sample_df, "city")
        
        assert result["filter_type"] == "select"
        assert "options" in result
        assert len(result["options"]) == 3  # NYC, LA, Chicago


class TestWidgetService:
    """Tests for widget service module."""

    @pytest.fixture
    def sample_df(self):
        """Sample DataFrame for testing."""
        return pd.DataFrame({
            "category": ["A", "B", "A", "C", "B"],
            "value": [100, 200, 150, 300, 250],
        })

    def test_refresh_kpi_widget(self, sample_df):
        """
        TEST: KPI widget refresh returns updated data.
        """
        from app.services.visualization.widget_service import refresh_widget
        
        widget_spec = {
            "id": "kpi_1",
            "type": "kpi",
            "title": "Total Value",
            "config": {"kpi_type": "sum", "column": "value"},
            "data": {},
        }
        
        result = refresh_widget(sample_df, widget_spec)
        
        assert "data" in result
        assert result["data"]["value"] == 1000  # Sum of all values

    def test_refresh_bar_widget(self, sample_df):
        """
        TEST: Bar widget refresh returns updated data.
        """
        from app.services.visualization.widget_service import refresh_widget
        
        widget_spec = {
            "id": "bar_1",
            "type": "bar",
            "title": "By Category",
            "config": {"group_by": "category", "aggregation": "count"},
            "data": {},
        }
        
        result = refresh_widget(sample_df, widget_spec)
        
        assert "data" in result
        assert "rows" in result["data"]

    def test_refresh_widget_with_filters(self, sample_df):
        """
        TEST: Widget refresh respects applied filters.
        """
        from app.services.visualization.widget_service import refresh_widget
        
        widget_spec = {
            "id": "kpi_1",
            "type": "kpi",
            "title": "Total Value",
            "config": {"kpi_type": "sum", "column": "value"},
            "data": {},
        }
        
        filters = [{"column": "category", "operator": "eq", "value": "A"}]
        
        result = refresh_widget(sample_df, widget_spec, filters=filters)
        
        # Only A values: 100 + 150 = 250
        assert result["data"]["value"] == 250

    def test_create_widget_from_config(self):
        """
        TEST: create_widget_from_config creates valid widget spec.
        """
        from app.services.visualization.widget_service import create_widget_from_config
        
        result = create_widget_from_config(
            widget_type="kpi",
            config={"kpi_type": "count"},
            title="Total Records",
        )
        
        assert "id" in result
        assert result["type"] == "kpi"
        assert result["title"] == "Total Records"
        assert result["config"] == {"kpi_type": "count"}
