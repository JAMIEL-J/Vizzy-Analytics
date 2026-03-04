from typing import Any, Dict

import pandas as pd

from .profiler import profile_dataframe
from .time_checks import check_time_columns
from .anomaly_checks import detect_numeric_anomalies
from .duplicate_checks import detect_duplicates
from .risk_scorer import score_risk, calculate_health_score


def run_inspection(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Run full deterministic inspection pipeline on a DataFrame.

    Execution order:
    1. Profiling
    2. Time column checks
    3. Numeric anomaly detection
    4. Duplicate detection
    5. Risk classification
    6. Health score calculation

    Returns a single inspection payload.
    """
    if df is None or df.empty:
        raise ValueError("Inspection cannot be run on empty DataFrame")

    # Step 1: Column & dataset profiling
    profiling = profile_dataframe(df)

    # Step 2: Time-series checks
    time_checks = check_time_columns(df)

    # Step 3: Numeric anomaly detection
    anomalies = detect_numeric_anomalies(df)

    # Step 4: Duplicate detection
    duplicates = detect_duplicates(df)

    # Step 5: Risk scoring (rule-based)
    risk = score_risk(
        profiling=profiling,
        time_checks=time_checks,
        anomalies=anomalies,
    )

    # Step 6: Health score (0-100)
    health_score = calculate_health_score(
        profiling=profiling,
        anomalies=anomalies,
        duplicates=duplicates,
    )

    return {
        "profiling": profiling,
        "time_checks": time_checks,
        "anomalies": anomalies,
        "duplicates": duplicates,
        "risk": risk,
        "health_score": health_score,
    }

