import re
import duckdb
import sqlglot
from sqlglot import exp
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Tuple, Optional
import pandas as pd

logger = logging.getLogger(__name__)

BLOCKED_STATEMENTS = {
    "DROP", "DELETE", "UPDATE", "INSERT", "ALTER",
    "CREATE", "TRUNCATE", "REPLACE", "MERGE",
    "INSTALL", "LOAD", "ATTACH", "COPY", "EXPORT"
}

BLOCKED_PATTERNS = [
    r"read_csv\s*\(",
    r"read_parquet\s*\(",
    r"read_json\s*\(",
    r"glob\s*\(",
    r"httpfs",
    r"http://",
    r"https://",
    r"\/etc\/",
    r"\.\.\/",
    r"__import__",
    r"pg_read_file",
    r"COPY\s+.*\s+TO",
    r"EXPORT\s+DATABASE",
]

class QueryExecutionError(Exception):
    pass

_executor = ThreadPoolExecutor(max_workers=4)

def validate_sql(sql: str, table_name: str) -> Tuple[bool, str, Optional[exp.Expression]]:
    """Validate SQL using AST parsing and pattern scanning."""
    try:
        # sqlglot.parse returns a list of parsed statements
        parsed_statements = sqlglot.parse(sql, dialect="duckdb")
        if not parsed_statements:
            return False, "Empty query", None
            
        if len(parsed_statements) > 1:
            return False, "Multiple statements per query are not permitted for security reasons.", None
            
        parsed = parsed_statements[0]
        if parsed is None:
            return False, "Failed to parse statement", None
            
    except Exception as e:
        return False, f"SQL parse failure: {str(e)}", None

    # Step 1: Only SELECT statements permitted
    if not isinstance(parsed, exp.Select):
        return False, f"Only SELECT statements permitted. Got: {type(parsed).__name__}", None

    # Step 2: AST scan for blocked statements
    for node in parsed.walk():
        # Any statement that isn't a SELECT or its sub-components is blocked
        if isinstance(node, (exp.Drop, exp.Delete, exp.Update, exp.Insert, exp.Alter, exp.Create)):
            return False, f"Blocked statement type detected: {type(node).__name__}", None

    # Step 3: Regex scan for blocked patterns (defense in depth)
    sql_upper = sql.upper()
    for pattern in BLOCKED_PATTERNS:
        if re.search(pattern, sql_upper, re.IGNORECASE):
            return False, f"Blocked pattern detected: {pattern}", None

    # Step 4: Enforce scoped table usage
    referenced_tables = {
        table.name.lower() 
        for table in parsed.find_all(exp.Table)
    }
    allowed_tables = {table_name.lower()}
    
    unauthorized = referenced_tables - allowed_tables
    if unauthorized:
        return False, f"Unauthorized table reference: {unauthorized}", None

    return True, "valid", parsed

def sanitize_error_message(error: str, table_name: str) -> str:
    """Remove sensitive information from error messages."""
    # Remove file paths
    error = re.sub(r"\/[\w\/\.]+", "[path_redacted]", error)
    # Remove internal table names
    error = error.replace(table_name, "[table_redacted]")
    return error

async def execute_sandboxed(
    conn: duckdb.DuckDBPyConnection,
    sql: str,
    table_name: str,
    max_rows: int = 10000,
    timeout_seconds: int = 30
) -> pd.DataFrame:
    """Execute SQL query in a sandboxed thread with timeout."""
    
    is_valid, reason, parsed = validate_sql(sql, table_name)
    if not is_valid:
        logger.warning(f"SQL Validation Failed: {reason} | SQL: {sql}")
        raise QueryExecutionError(f"SQL validation failed: {reason}")

    # Inject row limit via AST
    limited_sql = parsed.limit(max_rows).sql(dialect="duckdb")
    
    def _execute():
        try:
            logger.debug(f"Executing Sandboxed SQL: {limited_sql}")
            return conn.execute(limited_sql).df()
        except Exception as e:
            sanitized = sanitize_error_message(str(e), table_name)
            logger.error(f"DuckDB Execution Error: {str(e)}")
            raise QueryExecutionError(sanitized)

    try:
        # Use asyncio.wait_for with run_in_executor for thread-safe timeout
        return await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(_executor, _execute),
            timeout=timeout_seconds
        )
    except asyncio.TimeoutError:
        logger.error(f"Query Timeout: {sql}")
        raise QueryExecutionError(f"Query exceeded {timeout_seconds}s limit")
    except Exception as e:
        if not isinstance(e, QueryExecutionError):
            logger.error(f"Unexpected Execution Error: {str(e)}")
            raise QueryExecutionError(f"Unexpected execution error: {str(e)}")
        raise
