"""
Token optimization utilities for LLM calls.

Reduces token usage for free tier API limits by:
- Sampling data instead of sending full datasets
- Truncating long text
- Caching responses
- Compressing prompts
"""

import hashlib
import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import pandas as pd

from app.core.config import get_settings


# Simple in-memory cache
_cache: Dict[str, Dict[str, Any]] = {}


def sample_dataframe(df: pd.DataFrame, max_rows: Optional[int] = None) -> pd.DataFrame:
    """
    Sample dataframe to reduce tokens sent to LLM.
    
    Args:
        df: Input dataframe
        max_rows: Max rows to sample (defaults to config value)
    
    Returns:
        Sampled dataframe
    """
    settings = get_settings()
    max_rows = max_rows or settings.llm.max_rows_sample
    
    if len(df) <= max_rows:
        return df
    
    # Sample evenly across the dataset
    step = len(df) // max_rows
    return df.iloc[::step].head(max_rows).copy()


def truncate_text(text: str, max_length: int = 500) -> str:
    """
    Truncate text to reduce tokens.
    
    Args:
        text: Input text
        max_length: Max characters
    
    Returns:
        Truncated text with ellipsis
    """
    if len(text) <= max_length:
        return text
    return text[:max_length] + "..."


def get_column_summary(
    df: pd.DataFrame, 
    max_columns: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Get concise column summary for LLM.
    
    Args:
        df: Input dataframe
        max_columns: Max columns to describe
    
    Returns:
        List of column summaries
    """
    settings = get_settings()
    max_columns = max_columns or settings.llm.max_columns_describe
    
    columns = df.columns[:max_columns]
    summaries = []
    
    for col in columns:
        summary = {
            "name": col,
            "type": str(df[col].dtype),
            "null_count": int(df[col].isnull().sum()),
            "unique": int(df[col].nunique()),
        }
        
        # Add sample values for categorical
        if df[col].nunique() < 10:
            summary["samples"] = df[col].dropna().unique().tolist()[:5]
        
        summaries.append(summary)
    
    return summaries


def compress_prompt(prompt: str) -> str:
    """
    Compress prompt by removing unnecessary whitespace.
    
    Args:
        prompt: Input prompt
    
    Returns:
        Compressed prompt
    """
    # Remove extra whitespace
    lines = [line.strip() for line in prompt.split('\n')]
    lines = [line for line in lines if line]
    return ' '.join(lines)


def cache_response(key: str, response: Any, ttl_seconds: Optional[int] = None) -> None:
    """
    Cache LLM response.
    
    Args:
        key: Cache key
        response: Response to cache
        ttl_seconds: Time to live in seconds
    """
    settings = get_settings()
    
    if not settings.llm.enable_caching:
        return
    
    ttl = ttl_seconds or settings.llm.cache_ttl_seconds
    expires_at = datetime.now() + timedelta(seconds=ttl)
    
    _cache[key] = {
        "response": response,
        "expires_at": expires_at,
    }


def get_cached_response(key: str) -> Optional[Any]:
    """
    Get cached LLM response if not expired.
    
    Args:
        key: Cache key
    
    Returns:
        Cached response or None
    """
    settings = get_settings()
    
    if not settings.llm.enable_caching:
        return None
    
    if key not in _cache:
        return None
    
    cached = _cache[key]
    
    if datetime.now() > cached["expires_at"]:
        del _cache[key]
        return None
    
    return cached["response"]


def generate_cache_key(prefix: str, **kwargs) -> str:
    """
    Generate cache key from arguments.
    
    Args:
        prefix: Key prefix
        **kwargs: Arguments to hash
    
    Returns:
        Cache key
    """
    # Sort kwargs for consistent hashing
    sorted_kwargs = json.dumps(kwargs, sort_keys=True)
    hash_val = hashlib.md5(sorted_kwargs.encode()).hexdigest()
    return f"{prefix}:{hash_val}"


def clear_cache() -> None:
    """Clear all cached responses."""
    _cache.clear()


def get_cache_stats() -> Dict[str, Any]:
    """
    Get cache statistics.
    
    Returns:
        Cache stats dictionary
    """
    now = datetime.now()
    valid_entries = sum(1 for v in _cache.values() if v["expires_at"] > now)
    
    return {
        "total_entries": len(_cache),
        "valid_entries": valid_entries,
        "expired_entries": len(_cache) - valid_entries,
    }


def optimize_data_for_llm(
    df: pd.DataFrame,
    include_schema: bool = True,
    include_sample: bool = True,
    max_rows: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Prepare optimized data payload for LLM.
    
    Args:
        df: Input dataframe
        include_schema: Include column schema
        include_sample: Include data sample
        max_rows: Max rows to include
    
    Returns:
        Optimized data dictionary
    """
    result = {
        "row_count": len(df),
        "column_count": len(df.columns),
    }
    
    if include_schema:
        result["columns"] = get_column_summary(df)
    
    if include_sample:
        sample_df = sample_dataframe(df, max_rows)
        # Convert to dict with limited rows
        result["sample"] = sample_df.head(10).to_dict(orient="records")
    
    return result
