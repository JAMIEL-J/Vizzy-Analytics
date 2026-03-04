import re
from typing import Optional

import pandas as pd
from sqlalchemy.engine import Engine

from app.core.exceptions import InvalidOperation
from app.services.ingestion_execution.file_loader import load_from_path


_SELECT_ONLY_PATTERN = re.compile(r"^\s*select\s+", re.IGNORECASE)
_FORBIDDEN_SQL_PATTERN = re.compile(
    r"\b(insert|update|delete|drop|alter|truncate|create)\b",
    re.IGNORECASE,
)


def _validate_select_query(query: str) -> None:
    """
    Ensure the query is a read-only SELECT statement.
    """
    if not query or not isinstance(query, str):
        raise InvalidOperation(
            operation="db_ingestion",
            reason="Query must be a non-empty string",
        )

    if not _SELECT_ONLY_PATTERN.match(query):
        raise InvalidOperation(
            operation="db_ingestion",
            reason="Only SELECT queries are allowed for ingestion",
        )

    if _FORBIDDEN_SQL_PATTERN.search(query):
        raise InvalidOperation(
            operation="db_ingestion",
            reason="Forbidden SQL keyword detected",
            details="Only pure SELECT queries are allowed",
        )


def load_from_database(
    *,
    engine: Engine,
    query: str,
    params: Optional[dict] = None,
) -> pd.DataFrame:
    """
    Load tabular data from a database using a read-only SELECT query.
    """
    _validate_select_query(query)

    try:
        return pd.read_sql_query(
            sql=query,
            con=engine,
            params=params,
        )
    except Exception as e:
        raise InvalidOperation(
            operation="db_ingestion",
            reason="Failed to execute database query",
            details=str(e),
        )


def load_dataframe_for_version(
    *,
    source_type: str,
    source_reference: str,
    engine: Optional[Engine] = None,
) -> pd.DataFrame:
    """
    Unified ingestion entrypoint for dataset versions.
    """
    if source_type == "sql":
        if engine is None:
            raise InvalidOperation(
                operation="db_ingestion",
                reason="Database engine is required for SQL ingestion",
            )
        return load_from_database(engine=engine, query=source_reference)

    if source_type == "upload":
        return load_from_path(
            file_path=source_reference,
            filename=source_reference,
        )

    raise InvalidOperation(
        operation="ingestion",
        reason=f"Unsupported source_type: {source_type}",
    )
