"""
Duplicate detection module.

Belongs to: inspection_execution
Responsibility: Detect duplicate rows in DataFrames
Restrictions: Pure computation, no I/O
"""

from typing import Any, Dict, List, Optional

import pandas as pd


def detect_duplicates(
    df: pd.DataFrame,
    subset: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Detect duplicate rows in DataFrame.

    Args:
        df: Input DataFrame
        subset: Columns to consider for duplicates (None = all columns)

    Returns:
        {
            "total_rows": int,
            "duplicate_count": int,
            "duplicate_percentage": float,
            "has_duplicates": bool,
            "sample_duplicate_indices": List[int]  # First 5 duplicate indices
        }
    """
    if df.empty:
        return {
            "total_rows": 0,
            "duplicate_count": 0,
            "duplicate_percentage": 0.0,
            "has_duplicates": False,
            "sample_duplicate_indices": [],
        }

    total_rows = len(df)

    # Find duplicates (marks all duplicates after first occurrence)
    if subset:
        _validate_columns(df, subset)
        duplicates_mask = df.duplicated(subset=subset, keep="first")
    else:
        duplicates_mask = df.duplicated(keep="first")

    duplicate_count = int(duplicates_mask.sum())
    duplicate_percentage = round((duplicate_count / total_rows) * 100, 2) if total_rows > 0 else 0.0

    # Get sample indices of duplicates (first 5)
    duplicate_indices = df.index[duplicates_mask].tolist()[:5]

    return {
        "total_rows": total_rows,
        "duplicate_count": duplicate_count,
        "duplicate_percentage": duplicate_percentage,
        "has_duplicates": duplicate_count > 0,
        "sample_duplicate_indices": duplicate_indices,
    }


def get_duplicate_groups(
    df: pd.DataFrame,
    subset: Optional[List[str]] = None,
    max_groups: int = 10,
) -> List[Dict[str, Any]]:
    """
    Get details about duplicate groups.

    Returns up to max_groups groups of duplicates with their values.
    Useful for showing users which rows are duplicated.

    Args:
        df: Input DataFrame
        subset: Columns to consider for duplicates
        max_groups: Maximum number of groups to return

    Returns:
        List of duplicate groups with their values and counts
    """
    if df.empty:
        return []

    columns = subset if subset else df.columns.tolist()

    # Find rows that are duplicates (including first occurrence)
    duplicated_mask = df.duplicated(subset=columns, keep=False)
    duplicated_df = df[duplicated_mask]

    if duplicated_df.empty:
        return []

    # Group by the columns and count
    groups = []
    grouped = duplicated_df.groupby(list(columns), dropna=False)

    for group_key, group_df in list(grouped)[:max_groups]:
        # Handle single column vs multiple columns
        if len(columns) == 1:
            values = {columns[0]: _serialize_value(group_key)}
        else:
            values = {col: _serialize_value(val) for col, val in zip(columns, group_key)}

        groups.append({
            "values": values,
            "count": len(group_df),
            "indices": group_df.index.tolist()[:5],  # First 5 indices
        })

    return groups


def _validate_columns(df: pd.DataFrame, columns: List[str]) -> None:
    """Validate that all columns exist in DataFrame."""
    missing = set(columns) - set(df.columns)
    if missing:
        raise ValueError(f"Columns not found in DataFrame: {', '.join(sorted(missing))}")


def _serialize_value(value: Any) -> Any:
    """Convert value to JSON-serializable type."""
    if pd.isna(value):
        return None
    if hasattr(value, 'item'):  # numpy types
        return value.item()
    return value
