from typing import Any, Dict, List


def score_risk(
    profiling: Dict[str, Any],
    time_checks: Dict[str, Any],
    anomalies: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Convert inspection findings into a deterministic risk classification.
    """
    reasons: List[str] = []

    # ---------- HIGH RISK RULES ----------

    # High null ratio
    for col, info in profiling.get("columns", {}).items():
        if info.get("null_ratio", 0) > 0.4:
            reasons.append(f"High null ratio (>40%) in column '{col}'")
            return _high(reasons)

    # Time-series critical issues
    issues = time_checks.get("issues", {})
    if issues.get("non_monotonic"):
        reasons.append("Time series is not monotonic")
        return _high(reasons)

    if issues.get("future_timestamps"):
        reasons.append("Future timestamps detected")
        return _high(reasons)

    # Severe numeric anomalies (>5% of rows)
    row_count = profiling.get("row_count", 0)
    for col, info in anomalies.get("numeric_columns", {}).items():
        outliers = info.get("outlier_count", 0)
        if row_count > 0 and (outliers / row_count) > 0.05:
            reasons.append(f"Severe outliers (>5%) in column '{col}'")
            return _high(reasons)

    # ---------- MEDIUM RISK RULES ----------

    for col, info in profiling.get("columns", {}).items():
        if 0.1 < info.get("null_ratio", 0) <= 0.4:
            reasons.append(f"Moderate null ratio (10–40%) in column '{col}'")
            return _medium(reasons)

    if issues.get("duplicate_timestamps"):
        reasons.append("Duplicate timestamps detected")
        return _medium(reasons)

    for col, info in anomalies.get("numeric_columns", {}).items():
        if info.get("outliers_detected"):
            reasons.append(f"Outliers detected in column '{col}'")
            return _medium(reasons)

    # ---------- LOW RISK ----------

    return _low(["No significant data quality risks detected"])


def _high(reasons: List[str]) -> Dict[str, Any]:
    return {"risk_level": "HIGH", "reasons": reasons}


def _medium(reasons: List[str]) -> Dict[str, Any]:
    return {"risk_level": "MEDIUM", "reasons": reasons}


def _low(reasons: List[str]) -> Dict[str, Any]:
    return {"risk_level": "LOW", "reasons": reasons}


def calculate_health_score(
    profiling: Dict[str, Any],
    anomalies: Dict[str, Any],
    duplicates: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Calculate numeric health score (0-100).

    Scoring:
    - Start at 100
    - Deduct for missing values (up to -30)
    - Deduct for outliers (up to -20)
    - Deduct for duplicates (up to -20)
    - Deduct for low unique ratio (up to -10)

    Returns:
        {
            "score": int,  # 0-100
            "grade": str,  # A/B/C/D/F
            "breakdown": {
                "missing_values_penalty": float,
                "outliers_penalty": float,
                "duplicates_penalty": float,
                "other_penalty": float
            }
        }
    """
    score = 100.0
    breakdown = {
        "missing_values_penalty": 0.0,
        "outliers_penalty": 0.0,
        "duplicates_penalty": 0.0,
        "other_penalty": 0.0,
    }

    # --- Missing Values Penalty (up to -30) ---
    columns = profiling.get("columns", {})
    if columns:
        total_null_ratio = sum(
            col_info.get("null_ratio", 0) for col_info in columns.values()
        ) / len(columns)
        missing_penalty = min(30, total_null_ratio * 100)  # Cap at 30
        score -= missing_penalty
        breakdown["missing_values_penalty"] = round(missing_penalty, 2)

    # --- Outliers Penalty (up to -20) ---
    row_count = profiling.get("row_count", 0)
    numeric_columns = anomalies.get("numeric_columns", {})
    if numeric_columns and row_count > 0:
        total_outliers = sum(
            col_info.get("outlier_count", 0) for col_info in numeric_columns.values()
        )
        outlier_ratio = total_outliers / (row_count * len(numeric_columns))
        outlier_penalty = min(20, outlier_ratio * 200)  # Cap at 20
        score -= outlier_penalty
        breakdown["outliers_penalty"] = round(outlier_penalty, 2)

    # --- Duplicates Penalty (up to -20) ---
    duplicate_percentage = duplicates.get("duplicate_percentage", 0)
    duplicate_penalty = min(20, duplicate_percentage * 0.5)  # Cap at 20
    score -= duplicate_penalty
    breakdown["duplicates_penalty"] = round(duplicate_penalty, 2)

    # --- Other Penalty (low cardinality / type issues) ---
    if columns:
        low_cardinality_count = sum(
            1 for col_info in columns.values()
            if col_info.get("unique_count", 1) == 1
        )
        if low_cardinality_count > 0:
            other_penalty = min(10, low_cardinality_count * 2)
            score -= other_penalty
            breakdown["other_penalty"] = round(other_penalty, 2)

    # Ensure score is within bounds
    final_score = max(0, min(100, round(score)))

    # Calculate grade
    grade = _score_to_grade(final_score)

    return {
        "score": final_score,
        "grade": grade,
        "breakdown": breakdown,
    }


def _score_to_grade(score: int) -> str:
    """Convert numeric score to letter grade."""
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    elif score >= 70:
        return "C"
    elif score >= 60:
        return "D"
    else:
        return "F"
