"""
Semantic Column Resolver — Fuzzy matching bridge for analytics engines.

The analytics engines (kpi_engine, chart_recommender, column_filter) need to
find columns by semantic meaning, not exact substrings. A column named
"Tot_Rev" should match the keyword "revenue", and "MonthlyChgs" should
match "charges".

This module wraps column_matcher.py's fuzzy matching for use by all engines.
"""

import re
from difflib import SequenceMatcher
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


# ── Common abbreviations that trip up substring matching ──────────────────────

ABBREVIATION_MAP = {
    # Revenue / Sales
    "rev": "revenue", "rvn": "revenue", "amt": "amount",
    "tot": "total", "ttl": "total", "overall": "total",
    "qty": "quantity", "qnt": "quantity",
    "prc": "price", "prf": "profit",
    "dsc": "discount", "disc": "discount",

    # Charges / Cost
    "chg": "charges", "chgs": "charges", "chrg": "charges",
    "cst": "cost", "mthly": "monthly", "mnthly": "monthly",
    "yr": "year", "yrs": "years", "mo": "month", "mos": "months",

    # Customer / Segment
    "cust": "customer", "cstmr": "customer",
    "seg": "segment", "rgn": "region",
    "cat": "category", "subcat": "subcategory",
    "subcats": "subcategories", "subcatg": "subcategory",
    "prod": "product", "prd": "product",
    "dept": "department", "dep": "department",

    # Telecom / Churn
    "tnr": "tenure", "ten": "tenure",
    "svc": "service", "svcs": "services",
    "intl": "international", "int": "internet",
    "phn": "phone", "ph": "phone",

    # Healthcare
    "pt": "patient", "pts": "patients",
    "dx": "diagnosis", "diag": "diagnosis",
    "los": "length of stay", "readm": "readmission",
    "proc": "procedure", "rx": "prescription",

    # Finance
    "bal": "balance", "inc": "income",
    "exp": "expense", "txn": "transaction",
    "acct": "account",

    # Generic
    "num": "number", "cnt": "count", "ct": "count",
    "avg": "average", "std": "standard",
    "dt": "date", "ts": "timestamp", "tm": "time",
    "desc": "description", "nm": "name",
    "id": "identifier", "idx": "index", "ref": "reference",
    "grp": "group", "typ": "type", "st": "status",
    "pct": "percent", "perc": "percent",
    "inv": "invoice",

    # Subscription / retention patterns
    "m2m": "month to month", "monthtomonth": "month to month",
    "ret": "retention", "retn": "retention",
    "attr": "attrition", "cncl": "cancelled",
}


def normalize(name: str) -> str:
    """Normalize a column name: CamelCase split, underscore split, lowercase."""
    if not name:
        return ""
    # CamelCase → words
    name = re.sub(r'([a-z])([A-Z])', r'\1 \2', name)
    # Underscores, hyphens → spaces
    name = name.replace('_', ' ').replace('-', ' ')
    # Lowercase and collapse whitespace
    return re.sub(r'\s+', ' ', name.lower().strip())


def expand_abbreviations(text: str) -> str:
    """Expand known abbreviations in a normalized string."""
    words = text.split()
    expanded = []
    for word in words:
        expanded.append(ABBREVIATION_MAP.get(word, word))
    return " ".join(expanded)


def semantic_similarity(keyword: str, column: str) -> float:
    """
    Compute a semantic similarity score between a keyword and a column name.

    Strategy (3-layer):
    1. Exact normalized match → 1.0
    2. Substring containment (either direction) → 0.85
    3. SequenceMatcher with abbreviation expansion → 0.0–1.0
    """
    kw_norm = normalize(keyword)
    col_norm = normalize(column)

    # Layer 1: exact
    if kw_norm == col_norm:
        return 1.0

    # Layer 2: substring
    if kw_norm in col_norm or col_norm in kw_norm:
        return 0.85

    # Layer 3: expand abbreviations then compare
    kw_expanded = expand_abbreviations(kw_norm)
    col_expanded = expand_abbreviations(col_norm)

    # Re-check after expansion
    if kw_expanded in col_expanded or col_expanded in kw_expanded:
        return 0.80

    # SequenceMatcher on expanded forms
    score = SequenceMatcher(None, kw_expanded, col_expanded).ratio()

    # Boost if any word in the keyword appears as a word in the column
    kw_words = set(kw_expanded.split())
    col_words = set(col_expanded.split())
    overlap = kw_words & col_words
    if overlap:
        # Boost proportional to word overlap
        word_overlap_ratio = len(overlap) / max(len(kw_words), 1)
        score = min(1.0, score + 0.3 * word_overlap_ratio)

    return score


def find_column(
    keywords: List[str],
    columns: List[str],
    threshold: float = 0.55,
) -> Optional[str]:
    """
    Find the best column matching any of the keywords using fuzzy matching.

    Args:
        keywords: Semantic keywords like ["revenue", "sales", "amount"]
        columns: Actual DataFrame column names
        threshold: Minimum similarity score to accept

    Returns:
        Best matching column name, or None

    Examples:
        find_column(["revenue"], ["Tot_Rev", "Product", "Date"]) → "Tot_Rev"
        find_column(["charges"], ["MonthlyChgs", "Tenure"]) → "MonthlyChgs"
        find_column(["tenure"], ["Cust_Tenure_Months", "Age"]) → "Cust_Tenure_Months"
    """
    best_col = None
    best_score = 0.0

    for keyword in keywords:
        for col in columns:
            score = semantic_similarity(keyword, col)
            if score > best_score:
                best_score = score
                best_col = col

    if best_col and best_score >= threshold:
        return best_col

    return None


def find_column_with_score(
    keywords: List[str],
    columns: List[str],
    threshold: float = 0.55,
) -> Tuple[Optional[str], float]:
    """Same as find_column but also returns the score."""
    best_col = None
    best_score = 0.0

    for keyword in keywords:
        for col in columns:
            score = semantic_similarity(keyword, col)
            if score > best_score:
                best_score = score
                best_col = col

    if best_col and best_score >= threshold:
        return best_col, best_score

    return None, 0.0


def find_ambiguous_columns(
    keyword: str,
    columns: List[str],
    threshold: float = 0.6,
) -> List[Tuple[str, float]]:
    """
    Find ALL columns that match a keyword above threshold.

    Returns list of (column, score) sorted by score descending.
    If ≥2 results, the keyword is ambiguous.
    """
    matches = []
    for col in columns:
        score = semantic_similarity(keyword, col)
        if score >= threshold:
            matches.append((col, round(score, 3)))

    matches.sort(key=lambda x: x[1], reverse=True)
    return matches



def match_columns_to_keywords(
    keyword_groups: Dict[str, List[str]],
    columns: List[str],
    threshold: float = 0.55,
) -> Dict[str, Optional[str]]:
    """
    Match multiple semantic roles to actual columns.

    Args:
        keyword_groups: {"revenue": ["revenue", "sales", "amount"], "profit": ["profit", "margin"]}
        columns: Actual column names

    Returns:
        {"revenue": "Tot_Rev", "profit": "ProfitMargin"} or None for unmatched
    """
    matched: Dict[str, Optional[str]] = {}
    used_columns: set = set()

    # Sort by number of keywords (more specific → match first)
    sorted_roles = sorted(keyword_groups.items(), key=lambda x: len(x[1]), reverse=True)

    for role, keywords in sorted_roles:
        available = [c for c in columns if c not in used_columns]
        col = find_column(keywords, available, threshold)
        matched[role] = col
        if col:
            used_columns.add(col)

    return matched


def get_column_semantic_role(
    column: str,
    domain_keywords: Dict[str, List[str]],
    threshold: float = 0.55,
) -> Optional[str]:
    """
    Determine the semantic role of a column within a domain.

    Args:
        column: Actual column name (e.g., "MonthlyChgs")
        domain_keywords: {"metrics": ["revenue", ...], "dimensions": ["region", ...]}

    Returns:
        "metrics" or "dimensions" or None
    """
    best_role = None
    best_score = 0.0

    for role, keywords in domain_keywords.items():
        for keyword in keywords:
            score = semantic_similarity(keyword, column)
            if score > best_score:
                best_score = score
                best_role = role

    if best_role and best_score >= threshold:
        return best_role

    return None
