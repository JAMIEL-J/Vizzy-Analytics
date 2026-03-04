from datetime import datetime, timezone
from typing import Any, Dict, Optional

import pandas as pd


TIME_COLUMN_KEYWORDS = {"date", "time", "timestamp"}


def check_time_columns(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Detect and validate time-series columns in a DataFrame.
    Returns structured findings without raising exceptions.
    """
    time_column = _detect_time_column(df)

    if time_column is None:
        return {"time_column": None}

    series = df[time_column]
    return {
        "time_column": time_column,
        "issues": _detect_time_issues(series),
        "stats": _extract_time_stats(series),
    }


def _detect_time_column(df: pd.DataFrame) -> Optional[str]:
    """Detect a time column by dtype or column name."""
    for column in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[column]):
            return column

    for column in df.columns:
        col_lower = column.lower()
        if any(keyword in col_lower for keyword in TIME_COLUMN_KEYWORDS):
            if _can_convert_to_datetime(df[column]):
                return column

    return None


def _can_convert_to_datetime(series: pd.Series) -> bool:
    try:
        pd.to_datetime(series.dropna().head(100), errors="raise")
        return True
    except Exception:
        return False


def _detect_time_issues(series: pd.Series) -> Dict[str, bool]:
    """Detect time-series integrity issues."""
    issues = {
        "non_datetime_type": False,
        "missing_timestamps": False,
        "duplicate_timestamps": False,
        "non_monotonic": False,
        "future_timestamps": False,
    }

    if not pd.api.types.is_datetime64_any_dtype(series):
        issues["non_datetime_type"] = True
        series = pd.to_datetime(series, errors="coerce")

    non_null = series.dropna()

    if series.isna().any():
        issues["missing_timestamps"] = True

    if non_null.duplicated().any():
        issues["duplicate_timestamps"] = True

    if not non_null.is_monotonic_increasing:
        issues["non_monotonic"] = True

    now = datetime.now(timezone.utc)
    now_naive = now.replace(tzinfo=None)

    if non_null.dt.tz is not None:
        if (non_null > now).any():
            issues["future_timestamps"] = True
    else:
        if (non_null > now_naive).any():
            issues["future_timestamps"] = True

    return issues


def _extract_time_stats(series: pd.Series) -> Dict[str, Optional[str]]:
    """Extract basic statistics from time column."""
    series = pd.to_datetime(series, errors="coerce")
    non_null = series.dropna()

    if non_null.empty:
        return {
            "min": None,
            "max": None,
            "unique_count": 0,
        }

    return {
        "min": non_null.min().isoformat(),
        "max": non_null.max().isoformat(),
        "unique_count": int(non_null.nunique()),
    }
