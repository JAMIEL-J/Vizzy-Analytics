"""
Inspection execution package.

Provides DataFrame profiling, time series validation,
anomaly detection, duplicate detection, and risk scoring for data quality assessment.
"""

from app.services.inspection_execution.profiler import profile_dataframe
from app.services.inspection_execution.time_checks import check_time_columns
from app.services.inspection_execution.anomaly_checks import detect_numeric_anomalies
from app.services.inspection_execution.duplicate_checks import detect_duplicates, get_duplicate_groups
from app.services.inspection_execution.risk_scorer import score_risk, calculate_health_score

__all__ = [
    "profile_dataframe",
    "check_time_columns",
    "detect_numeric_anomalies",
    "detect_duplicates",
    "get_duplicate_groups",
    "score_risk",
    "calculate_health_score",
]

