from typing import Any, Dict, List

import numpy as np
import pandas as pd


def profile_dataframe(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Generate column-level statistical profile for a DataFrame.

    Raises:
        ValueError: if DataFrame is empty
    """
    if df.empty:
        raise ValueError("Cannot profile an empty DataFrame")

    profile: Dict[str, Any] = {
        "row_count": int(len(df)),
        "column_count": int(len(df.columns)),
        "columns": {},
    }

    for column in df.columns:
        profile["columns"][column] = _profile_column(df[column])

    return profile


def _profile_column(series: pd.Series) -> Dict[str, Any]:
    """Generate profile for a single column."""
    total_rows = int(len(series))
    null_count = int(series.isna().sum())
    non_null = series.dropna()

    return {
        "dtype": str(series.dtype),
        "null_count": null_count,
        "null_ratio": round(null_count / total_rows, 4) if total_rows > 0 else 0.0,
        "unique_count": int(non_null.nunique()),
        "sample_values": _get_sample_values(non_null, max_samples=5),
    }


def _get_sample_values(series: pd.Series, max_samples: int) -> List[Any]:
    """Extract up to max_samples unique non-null sample values."""
    if series.empty:
        return []

    samples = series.drop_duplicates().head(max_samples)
    return [_serialize_value(v) for v in samples.tolist()]


def _serialize_value(value: Any) -> Any:
    """Convert value to JSON-serializable type."""
    if pd.isna(value):
        return None

    if isinstance(value, (pd.Timestamp,)):
        return value.isoformat()

    if isinstance(value, (np.generic,)):
        return value.item()

    return value
