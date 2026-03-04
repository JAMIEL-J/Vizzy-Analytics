from typing import Any, Dict

import numpy as np
import pandas as pd


def detect_numeric_anomalies(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Detect numeric anomalies using the IQR method.

    Returns a dictionary keyed by numeric column names.
    """
    numeric_columns = df.select_dtypes(include=[np.number]).columns.tolist()

    if not numeric_columns:
        return {"numeric_columns": {}}

    results: Dict[str, Any] = {"numeric_columns": {}}

    for column in numeric_columns:
        results["numeric_columns"][column] = _analyze_column_outliers(df[column])

    return results


def _analyze_column_outliers(series: pd.Series) -> Dict[str, Any]:
    """Analyze a single numeric column for outliers using IQR."""
    non_null = series.dropna()

    if non_null.empty:
        return {
            "outliers_detected": False,
            "outlier_count": 0,
            "method": "iqr",
        }

    q1 = non_null.quantile(0.25)
    q3 = non_null.quantile(0.75)
    iqr = q3 - q1

    if iqr == 0:
        return {
            "outliers_detected": False,
            "outlier_count": 0,
            "method": "iqr",
        }

    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr

    outlier_mask = (non_null < lower_bound) | (non_null > upper_bound)
    outlier_count = int(outlier_mask.sum())

    return {
        "outliers_detected": outlier_count > 0,
        "outlier_count": outlier_count,
        "method": "iqr",
    }
