"""
Ingestion execution package.

Handles file loading, database querying, and schema inference.
Pure data operations without database access.
"""

from app.services.ingestion_execution.file_loader import (
    load_from_path,
    load_from_upload,
    validate_file,
)
from app.services.ingestion_execution.schema_inference import infer_schema
from app.services.ingestion_execution.db_connector import (
    load_from_database,
    load_dataframe_for_version,
)

__all__ = [
    "load_from_path",
    "load_from_upload",
    "validate_file",
    "infer_schema",
    "load_from_database",
    "load_dataframe_for_version",
]
