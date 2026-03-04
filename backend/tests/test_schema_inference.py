"""
Unit Tests for Schema Inference Module

Tests: services/ingestion_execution/schema_inference.py

This module is responsible for:
- Inferring column data types from DataFrames
- Normalizing dtype strings for consistency
- Computing schema hashes for change detection
"""

import pytest
import pandas as pd
import hashlib


class TestSchemaInference:
    """Tests for the schema inference functionality."""

    def test_infer_schema_basic_types(self, sample_dataframe):
        """
        TEST: Schema inference correctly identifies column types.
        
        ARCHITECTURE NOTE:
        - The infer_schema function takes a DataFrame and returns:
          - columns: list of {name, dtype, nullable, sample_values}
          - schema_hash: deterministic hash for change detection
        """
        from app.services.ingestion_execution.schema_inference import infer_schema
        
        result = infer_schema(sample_dataframe)
        
        # Verify structure
        assert "columns" in result
        assert "schema_hash" in result
        assert len(result["columns"]) == 5
        
        # Verify column names
        column_names = [col["name"] for col in result["columns"]]
        assert "id" in column_names
        assert "sales" in column_names
        assert "region" in column_names

    def test_infer_schema_numeric_detection(self, sample_dataframe):
        """
        TEST: Numeric columns are correctly identified.
        
        ARCHITECTURE NOTE:
        - Numeric columns (int64, float64) are detected for aggregations
        - These become available for SUM, AVG, MIN, MAX operations
        """
        from app.services.ingestion_execution.schema_inference import infer_schema
        
        result = infer_schema(sample_dataframe)
        
        sales_col = next(c for c in result["columns"] if c["name"] == "sales")
        assert "int" in sales_col["dtype"].lower() or "float" in sales_col["dtype"].lower()

    def test_infer_schema_categorical_detection(self, sample_dataframe):
        """
        TEST: Categorical/string columns are correctly identified.
        
        ARCHITECTURE NOTE:
        - String columns become GROUP BY candidates
        - Used for distribution charts (bar, pie)
        """
        from app.services.ingestion_execution.schema_inference import infer_schema
        
        result = infer_schema(sample_dataframe)
        
        region_col = next(c for c in result["columns"] if c["name"] == "region")
        assert "object" in region_col["dtype"].lower() or "string" in region_col["dtype"].lower()

    def test_schema_hash_deterministic(self, sample_dataframe):
        """
        TEST: Schema hash is deterministic for same data structure.
        
        ARCHITECTURE NOTE:
        - Hash is used for version comparison (has schema changed?)
        - Same structure = same hash, regardless of data values
        """
        from app.services.ingestion_execution.schema_inference import infer_schema
        
        result1 = infer_schema(sample_dataframe)
        result2 = infer_schema(sample_dataframe)
        
        assert result1["schema_hash"] == result2["schema_hash"]

    def test_schema_hash_changes_with_structure(self):
        """
        TEST: Schema hash changes when columns are added/removed.
        
        ARCHITECTURE NOTE:
        - Different structure = different hash
        - Used to detect breaking schema changes between versions
        """
        from app.services.ingestion_execution.schema_inference import infer_schema
        
        df1 = pd.DataFrame({"a": [1, 2], "b": [3, 4]})
        df2 = pd.DataFrame({"a": [1, 2], "b": [3, 4], "c": [5, 6]})
        
        result1 = infer_schema(df1)
        result2 = infer_schema(df2)
        
        assert result1["schema_hash"] != result2["schema_hash"]
