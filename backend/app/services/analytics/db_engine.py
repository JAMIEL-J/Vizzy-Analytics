import duckdb
import logging
import json
import pandas as pd
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class DBEngine:
    """DuckDB interface with dual-connection security model.
    
    - _write_con: Used for data loading (register, DESCRIBE). Never exposed to user SQL.
    - _read_con:  READ_ONLY connection for executing all LLM-generated queries.
    """

    def __init__(self, db_path: str = ":memory:"):
        self._db_path = db_path
        self._write_con = duckdb.connect(database=db_path, read_only=False)
        self._read_con = None  # Lazily created after data is loaded

    def _ensure_read_con(self):
        """Create or recreate the read-only connection."""
        # DuckDB does not support read_only=True for in-memory databases
        if self._db_path == ":memory:":
            self._read_con = self._write_con
            return

        if self._read_con is not None:
            try:
                self._read_con.close()
            except Exception:
                pass
        self._read_con = duckdb.connect(database=self._db_path, read_only=True)

    def load_dataframe(self, table_name: str, df: pd.DataFrame):
        """Register a Pandas dataframe as a queryable DuckDB table."""
        try:
            self._write_con.unregister(table_name)
        except Exception:
            pass

        # For in-memory mode, we CREATE TABLE so the read-only conn can see it
        self._write_con.register(f"_tmp_{table_name}", df)
        self._write_con.execute(f"DROP TABLE IF EXISTS {table_name}")
        self._write_con.execute(f"CREATE TABLE {table_name} AS SELECT * FROM _tmp_{table_name}")
        self._write_con.unregister(f"_tmp_{table_name}")

        logger.info(f"Loaded dataframe as DuckDB table '{table_name}' with {len(df)} rows.")

        # Refresh read connection so it sees the new table
        self._ensure_read_con()

    def load_csv(self, table_name: str, file_path: str):
        """Load a CSV file directly into DuckDB (zero-copy, highly efficient)."""
        try:
            self._write_con.execute(f"DROP TABLE IF EXISTS {table_name}")
            # DuckDB's read_csv is extremely fast and auto-detects types
            self._write_con.execute(f"CREATE TABLE {table_name} AS SELECT * FROM read_csv_auto('{file_path}')")
            logger.info(f"Loaded CSV file '{file_path}' directly into DuckDB table '{table_name}'.")
            
            # Refresh read connection
            self._ensure_read_con()
        except duckdb.Error as e:
            logger.error(f"Failed to load CSV via DuckDB: {str(e)}")
            raise ValueError(f"Direct CSV load failed: {str(e)}")

    def extract_schema(self, table_name: str) -> Dict[str, Any]:
        """Extract column names, types, and sample data to feed to the LLM."""
        try:
            schema_df = self._write_con.execute(f"DESCRIBE {table_name}").df()
            columns = {}
            for _, row in schema_df.iterrows():
                columns[row['column_name']] = row['column_type']

            sample_df = self._write_con.execute(f"SELECT * FROM {table_name} LIMIT 2").df()
            # Handle non-serializable types and truncate long strings to save tokens
            for col in sample_df.columns:
                if sample_df[col].dtype == object:
                    sample_df[col] = sample_df[col].apply(lambda x: str(x)[:100] + "..." if isinstance(x, str) and len(x) > 100 else x)
            
            sample_data_json = sample_df.to_json(orient="records", date_format="iso")
            sample_data = json.loads(sample_data_json)

            return {
                "table_name": table_name,
                "columns": columns,
                "sample_data": sample_data,
                "row_count": self._write_con.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0],
            }
        except Exception as e:
            logger.error(f"Failed to extract schema for '{table_name}': {str(e)}")
            return {"error": str(e)}

    def execute_query(self, query: str) -> pd.DataFrame:
        """Execute a validated SQL query on the READ_ONLY connection."""
        if self._read_con is None:
            raise ValueError("No data loaded. Call load_dataframe() first.")
        try:
            logger.debug(f"Executing DuckDB Query (READ_ONLY): {query}")
            return self._read_con.execute(query).df()
        except duckdb.Error as e:
            logger.error(f"DuckDB Execution Error: {str(e)}")
            raise ValueError(f"DuckDB Execution Error: {str(e)}")

    def close(self):
        """Close both DuckDB connections to free memory."""
        for con in (self._read_con, self._write_con):
            if con is not None:
                try:
                    con.close()
                except Exception:
                    pass

