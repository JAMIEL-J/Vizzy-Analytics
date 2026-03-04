"""
Column matcher module.

Belongs to: LLM services layer
Responsibility: Match user-provided column names to actual DataFrame columns
Restrictions: Pure matching logic, no I/O

Handles various formats:
- Case differences: "gender" → "Gender"
- Underscores vs spaces: "customer id" → "customer_id"
- Camel case: "CustomerID" → "customer_id"
- Common aliases: "revenue" → "total_revenue"
"""

import re
from difflib import SequenceMatcher
from typing import Dict, List, Optional, Tuple

from app.core.logger import get_logger


logger = get_logger(__name__)


def normalize_column_name(name: str) -> str:
    """
    Normalize a column name for comparison.
    
    Converts to lowercase and handles:
    - Underscores → spaces
    - CamelCase → words
    - Extra whitespace → single space
    
    Examples:
        "customer_id" → "customer id"
        "CustomerID" → "customer id"
        "TOTAL_REVENUE" → "total revenue"
        "firstName" → "first name"
    """
    if not name:
        return ""
    
    # Convert camelCase to words
    # "CustomerID" → "Customer ID"
    name = re.sub(r'([a-z])([A-Z])', r'\1 \2', name)
    
    # Replace underscores with spaces
    name = name.replace('_', ' ')
    
    # Convert to lowercase and strip
    name = name.lower().strip()
    
    # Collapse multiple spaces
    name = re.sub(r'\s+', ' ', name)
    
    return name


def similarity_score(s1: str, s2: str) -> float:
    """
    Calculate similarity score between two strings.
    
    Returns a value between 0 (no match) and 1 (exact match).
    """
    return SequenceMatcher(None, s1.lower(), s2.lower()).ratio()


def find_best_column_match(
    user_input: str,
    available_columns: List[str],
    threshold: float = 0.6,
) -> Optional[str]:
    """
    Find the best matching column name for user input.
    
    Args:
        user_input: What the user typed (e.g., "customer id", "Gender")
        available_columns: List of actual column names in the DataFrame
        threshold: Minimum similarity score to accept (0-1)
        
    Returns:
        The best matching column name, or None if no match found
        
    Examples:
        find_best_column_match("gender", ["Gender", "Age", "Name"]) → "Gender"
        find_best_column_match("customer id", ["customer_id", "order_id"]) → "customer_id"
    """
    if not user_input or not available_columns:
        return None
    
    # Step 1: Exact match (case-insensitive)
    user_lower = user_input.lower().strip()
    for col in available_columns:
        if col.lower() == user_lower:
            logger.debug(f"Exact match: '{user_input}' → '{col}'")
            return col
    
    # Step 2: Normalized match
    user_normalized = normalize_column_name(user_input)
    best_match = None
    best_score = 0.0
    
    for col in available_columns:
        col_normalized = normalize_column_name(col)
        
        # Check exact normalized match
        if col_normalized == user_normalized:
            logger.debug(f"Normalized match: '{user_input}' → '{col}'")
            return col
        
        # Calculate similarity
        score = similarity_score(user_normalized, col_normalized)
        
        # Boost score if user input is a substring
        if user_normalized in col_normalized or col_normalized in user_normalized:
            score = min(1.0, score + 0.2)
        
        if score > best_score:
            best_score = score
            best_match = col
    
    # Step 3: Return best match if above threshold
    if best_match and best_score >= threshold:
        logger.debug(f"Fuzzy match: '{user_input}' → '{best_match}' (score: {best_score:.2f})")
        return best_match
    
    logger.warning(f"No match found for '{user_input}' (best: '{best_match}' at {best_score:.2f})")
    return None


def find_all_column_matches(
    user_inputs: List[str],
    available_columns: List[str],
    threshold: float = 0.6,
) -> Dict[str, Optional[str]]:
    """
    Find matches for multiple user inputs.
    
    Returns:
        Dict mapping user input → matched column (or None)
    """
    return {
        user_input: find_best_column_match(user_input, available_columns, threshold)
        for user_input in user_inputs
    }


def suggest_similar_columns(
    user_input: str,
    available_columns: List[str],
    max_suggestions: int = 3,
) -> List[Tuple[str, float]]:
    """
    Suggest similar column names when no exact match is found.
    
    Returns:
        List of (column_name, similarity_score) tuples
    """
    user_normalized = normalize_column_name(user_input)
    
    scored = []
    for col in available_columns:
        col_normalized = normalize_column_name(col)
        score = similarity_score(user_normalized, col_normalized)
        scored.append((col, score))
    
    # Sort by score descending
    scored.sort(key=lambda x: x[1], reverse=True)
    
    return scored[:max_suggestions]


def build_column_alias_map(columns: List[str]) -> Dict[str, List[str]]:
    """
    Build a map of column aliases for common patterns.
    
    This helps match user questions to columns:
    - "revenue" → matches "total_revenue", "revenue_amount", etc.
    - "customer" → matches "customer_id", "customer_name", etc.
    
    Returns:
        Dict mapping base word → list of matching columns
    """
    alias_map: Dict[str, List[str]] = {}
    
    for col in columns:
        # Extract base words from column name
        words = normalize_column_name(col).split()
        
        for word in words:
            if len(word) >= 3:  # Skip very short words
                if word not in alias_map:
                    alias_map[word] = []
                if col not in alias_map[word]:
                    alias_map[word].append(col)
    
    return alias_map


def resolve_column_from_query(
    query: str,
    available_columns: List[str],
    target_keyword: Optional[str] = None,
) -> Optional[str]:
    """
    Extract and resolve a column name from a natural language query.
    
    Args:
        query: User's full query (e.g., "show me sales by gender")
        available_columns: List of actual column names
        target_keyword: Optional keyword to look for (e.g., "by" for group_by)
        
    Returns:
        Best matching column name
        
    Examples:
        resolve_column_from_query(
            "show me sales by gender",
            ["Gender", "Sales", "Region"],
            "by"
        ) → "Gender"
    """
    query_lower = query.lower()
    
    # If target keyword provided, extract word after it
    if target_keyword:
        pattern = rf'{target_keyword}\s+(\w+)'
        match = re.search(pattern, query_lower)
        if match:
            candidate = match.group(1)
            result = find_best_column_match(candidate, available_columns)
            if result:
                return result
    
    # Try to find any column reference in the query
    for col in available_columns:
        col_normalized = normalize_column_name(col)
        if col_normalized in normalize_column_name(query):
            return col
    
    # Try word-by-word matching
    words = re.findall(r'\w+', query_lower)
    for word in words:
        if len(word) >= 3:  # Skip short words
            result = find_best_column_match(word, available_columns, threshold=0.7)
            if result:
                return result
    
    return None
