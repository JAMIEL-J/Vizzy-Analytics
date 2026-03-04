"""
Semantic column resolver module.

Belongs to: LLM services layer
Responsibility: Map business terms to actual database columns using semantic understanding
Restrictions: Returns best match or None with suggestions

This module helps resolve queries like:
- "revenue" → finds "sales_per_order" or "total_sales"
- "income" → finds "profit_per_order" or "net_profit"
- "customer" → finds "customer_id", "customer_name", etc.
"""

from typing import Dict, List, Optional, Tuple
from app.core.logger import get_logger

logger = get_logger(__name__)


# Business term to column keywords mapping
SEMANTIC_MAPPINGS = {
    # Revenue/Sales related
    "revenue": ["revenue", "sales", "income", "turnover"],
    "sales": ["sales", "revenue", "turnover"],
    "income": ["income", "revenue", "sales", "earnings"],
    
    # Profit related
    "profit": ["profit", "margin", "earnings", "income"],
    "margin": ["margin", "profit"],
    "earnings": ["earnings", "profit", "income"],
    
    # Cost related
    "cost": ["cost", "expense", "spending"],
    "expense": ["expense", "cost", "spending"],
    "price": ["price", "cost", "amount"],
    
    # Quantity related
    "quantity": ["quantity", "qty", "amount", "count", "volume"],
    "count": ["count", "quantity", "number"],
    "volume": ["volume", "quantity", "amount"],
    
    # Customer related
    "customer": ["customer", "client", "buyer"],
    "client": ["client", "customer"],
    
    # Product related
    "product": ["product", "item", "sku"],
    "item": ["item", "product", "sku"],
    
    # Location related
    "location": ["location", "region", "state", "city", "country"],
    "region": ["region", "area", "zone", "territory"],
    "country": ["country", "nation"],
    
    # Time related
    "date": ["date", "time", "timestamp"],
}


def find_semantic_column_match(
    business_term: str,
    available_columns: List[str],
    exact_match_first: bool = True,
) -> Optional[Tuple[str, float]]:
    """
    Find column using semantic understanding of business terms.
    
    Args:
        business_term: Business term from user query (e.g., "revenue", "profit") 
        available_columns: List of actual column names
        exact_match_first: If True, prioritize exact keyword matches
        
    Returns:
        Tuple of (column_name, confidence_score) or None
        
    Examples:
        find_semantic_column_match("revenue", ["sales_per_order", "profit_per_order", "customer_id"])
        → ("sales_per_order", 0.9)
        
        find_semantic_column_match("profit", ["sales_per_order", "profit_per_order"])
        → ("profit_per_order", 1.0)
    """
    if not business_term or not available_columns:
        return None
        
    business_term_lower = business_term.lower().strip()
    
    # Get semantic keywords for this business term
    semantic_keywords = SEMANTIC_MAPPINGS.get(business_term_lower, [business_term_lower])
    
    # Score each column
    scored_columns: List[Tuple[str, float]] = []
    
    for col in available_columns:
        col_lower = col.lower()
        col_normalized = col_lower.replace("_", " ")
        
        # Check for exact keyword matches in column name
        best_score = 0.0
        
        for idx, keyword in enumerate(semantic_keywords):
            # Exact match on full column name
            if keyword == col_lower:
                best_score = max(best_score, 1.0)
                break
            
            # Keyword appears in column name
            if keyword in col_normalized:
                # Primary keyword (first in list) gets higher score
                if idx == 0:
                    best_score = max(best_score, 0.95)
                else:
                    best_score = max(best_score, 0.7)
            
            # Column contains keyword as word
            words = col_normalized.split()
            if keyword in words:
                if idx == 0:
                    best_score = max(best_score, 0.9)
                else:
                    best_score = max(best_score, 0.65)
        
        if best_score > 0:
            scored_columns.append((col, best_score))
    
    if not scored_columns:
        logger.warning(f"No semantic match for business term: '{business_term}'")
        return None
    
    # Sort by score descending
    scored_columns.sort(key=lambda x: x[1], reverse=True)
    
    best_match, best_score = scored_columns[0]
    
    logger.info(f"Semantic match: '{business_term}' → '{best_match}' (score: {best_score:.2f})")
    
    # If score is very low, don't return a match
    if best_score < 0.6:
        return None
        
    return (best_match, best_score)


def get_business_term_suggestions(
    business_term: str,
    available_columns: List[str],
) -> List[str]:
    """
    Get column suggestions for a business term that doesn't have a clear match.
    
    Returns list of column names that might be what the user is looking for.
    """
    business_term_lower = business_term.lower()
    semantic_keywords = SEMANTIC_MAPPINGS.get(business_term_lower, [business_term_lower])
    
    suggestions = []
    
    for col in available_columns:
        col_lower = col.lower()
        col_normalized = col_lower.replace("_", " ")
        
        # Check if any semantic keyword appears in column
        for keyword in semantic_keywords:
            if keyword in col_normalized:
                suggestions.append(col)
                break
    
    return suggestions[:5]  # Return top 5


def resolve_metric_with_semantics(
    user_metric: str,
    available_columns: List[str],
    fuzzy_match_func,
) -> Optional[str]:
    """
    Resolve metric using both fuzzy matching and semantic understanding.
    
    Strategy:
    1. Try exact fuzzy match first (handles case/format differences)
    2. If no match, try semantic match (handles business term synonyms)
    3. Return best result
    
    Args:
        user_metric: Metric name from user query
        available_columns: Available column names
        fuzzy_match_func: Function for fuzzy matching (find_best_column_match)
        
    Returns:
        Resolved column name or None
    """
    if not user_metric:
        return None
    
    # Step 1: Try fuzzy match (handles "Sales" → "sales", "customer_id" → "customer_id")
    fuzzy_result = fuzzy_match_func(user_metric, available_columns, threshold=0.8)
    
    if fuzzy_result:
        logger.info(f"Fuzzy match succeeded: '{user_metric}' → '{fuzzy_result}'")
        return fuzzy_result
    
    # Step 2: Try semantic match (handles "revenue" → "sales_per_order")
    semantic_result = find_semantic_column_match(user_metric, available_columns)
    
    if semantic_result:
        column, confidence = semantic_result
        # Only use semantic match if confidence is high
        if confidence >= 0.75:
            logger.info(f"Semantic match succeeded: '{user_metric}' → '{column}' (confidence: {confidence:.2f})")
            return column
    
    # Step 3: No match found
    logger.warning(f"No match found for metric: '{user_metric}'")
    return None
