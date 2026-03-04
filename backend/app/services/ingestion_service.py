"""
Ingestion service module.

Orchestrates file and SQL ingestion with proper validation,
schema inference, and transactional safety.
"""

from pathlib import Path
from typing import Any, BinaryIO, Dict, Optional
from uuid import UUID

import pandas as pd
from sqlmodel import Session

from app.core.config import get_settings
from app.core.exceptions import InvalidOperation, ResourceNotFound
from app.core.storage import get_raw_data_path
from app.core.audit import record_audit_event
from app.models.dataset import Dataset
from app.models.dataset_version import DatasetVersion, SourceType
from app.models.user import UserRole
from app.services.ingestion_execution.file_loader import load_from_upload, validate_file
from app.services.ingestion_execution.schema_inference import infer_schema
from app.services.dataset_version_service import create_dataset_version


def ingest_file_upload(
    *,
    session: Session,
    dataset_id: UUID,
    user_id: UUID,
    role: UserRole,
    file_stream: BinaryIO,
    filename: str,
    file_size: int,
) -> Dict[str, Any]:
    """
    Ingest a file upload with proper validation and transactional safety.

    Steps:
    1. Validate dataset ownership
    2. Validate file (extension, size)
    3. Load DataFrame
    4. Infer schema
    5. Save raw file
    6. Create dataset version
    7. Record audit event

    Raises:
        ResourceNotFound: if dataset doesn't exist
        AuthorizationError: if user doesn't own dataset
        InvalidOperation: if validation fails
    """
    # 1. Validate dataset ownership
    dataset = session.get(Dataset, dataset_id)
    if not dataset or not dataset.is_active:
        raise ResourceNotFound("Dataset", str(dataset_id))

    if role != UserRole.ADMIN and dataset.owner_id != user_id:
        raise InvalidOperation(
            operation="ingest_file",
            reason="You do not own this dataset",
        )

    # 2. Validate file
    validate_file(filename=filename, file_size=file_size)

    # 3. Load DataFrame
    df = load_from_upload(
        file_stream=file_stream,
        filename=filename,
        file_size=file_size,
    )

    # 4. Infer schema
    schema = infer_schema(df)

    # 5. Create version first (to get version ID for path)
    version = create_dataset_version(
        session=session,
        dataset_id=dataset_id,
        source_type=SourceType.UPLOAD,
        source_reference="PENDING",
        schema_hash=schema["schema_hash"],
        created_by=user_id,
        role=role,
        row_count=len(df),
    )

    # 6. Save raw file
    try:
        raw_path = get_raw_data_path(dataset_id, version.id)
        df.to_csv(raw_path, index=False)

        # 7. Update version with actual path
        version.source_reference = str(raw_path)
        session.add(version)
        session.commit()
        session.refresh(version)

    except Exception as e:
        # Rollback: deactivate orphaned version
        version.is_active = False
        session.add(version)
        session.commit()
        raise InvalidOperation(
            operation="ingest_file",
            reason="Failed to save file to storage",
            details=str(e),
        )

    # 8. Audit
    record_audit_event(
        event_type="FILE_INGESTED",
        user_id=str(user_id),
        resource_type="DatasetVersion",
        resource_id=str(version.id),
        metadata={
            "dataset_id": str(dataset_id),
            "filename": filename,
            "row_count": len(df),
        },
    )

    return {
        "dataset_id": str(dataset_id),
        "version_id": str(version.id),
        "version_number": version.version_number,
        "row_count": len(df),
        "schema_hash": schema["schema_hash"],
        "raw_path": str(raw_path),
    }


def ingest_sql_query(
    *,
    session: Session,
    dataset_id: UUID,
    user_id: UUID,
    role: UserRole,
    query: str,
    external_engine: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Ingest data from SQL query with validation and transactional safety.

    Steps:
    1. Validate dataset ownership
    2. Validate and execute query
    3. Infer schema
    4. Save as CSV
    5. Create dataset version
    6. Record audit event
    """
    from app.services.ingestion_execution.db_connector import load_from_database

    # 1. Validate dataset ownership
    dataset = session.get(Dataset, dataset_id)
    if not dataset or not dataset.is_active:
        raise ResourceNotFound("Dataset", str(dataset_id))

    if role != UserRole.ADMIN and dataset.owner_id != user_id:
        raise InvalidOperation(
            operation="ingest_sql",
            reason="You do not own this dataset",
        )

    # 2. Execute query
    engine = external_engine or session.get_bind()
    df = load_from_database(engine=engine, query=query)

    # 3. Infer schema
    schema = infer_schema(df)

    # 4. Create version
    version = create_dataset_version(
        session=session,
        dataset_id=dataset_id,
        source_type=SourceType.SQL,
        source_reference="PENDING",
        schema_hash=schema["schema_hash"],
        created_by=user_id,
        row_count=len(df),
    )

    # 5. Save to CSV
    try:
        raw_path = get_raw_data_path(dataset_id, version.id)
        df.to_csv(raw_path, index=False)

        version.source_reference = str(raw_path)
        session.add(version)
        session.commit()
        session.refresh(version)

    except Exception as e:
        version.is_active = False
        session.add(version)
        session.commit()
        raise InvalidOperation(
            operation="ingest_sql",
            reason="Failed to save data to storage",
            details=str(e),
        )

    # 6. Audit
    record_audit_event(
        event_type="SQL_INGESTED",
        user_id=str(user_id),
        resource_type="DatasetVersion",
        resource_id=str(version.id),
        metadata={
            "dataset_id": str(dataset_id),
            "row_count": len(df),
        },
    )

    return {
        "dataset_id": str(dataset_id),
        "version_id": str(version.id),
        "version_number": version.version_number,
        "row_count": len(df),
        "schema_hash": schema["schema_hash"],
        "raw_path": str(raw_path),
    }
