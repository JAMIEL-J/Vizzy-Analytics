from io import BytesIO
from uuid import UUID
from fastapi import APIRouter, UploadFile, File, HTTPException, status, BackgroundTasks

from app.api.deps import DBSession, RateLimitedUser
from app.services.ingestion_service import ingest_file_upload
from app.services.analytics.duckdb_builder import (
    build_duckdb_from_csv,
    mark_duckdb_building,
    mark_duckdb_failed,
)
from app.core.exceptions import InvalidOperation, ResourceNotFound, AuthorizationError
from app.core.logger import get_logger


router = APIRouter()
logger = get_logger(__name__)


def _build_duckdb_background(dataset_id: UUID, version_id: UUID, csv_path: str):
    """Background task to build DuckDB file asynchronously."""
    try:
        logger.info(f"[Background] Building DuckDB for dataset={dataset_id}, version={version_id}")
        duckdb_path = build_duckdb_from_csv(dataset_id, version_id, csv_path)
        logger.info(f"[Background] DuckDB built successfully: {duckdb_path}")
    except Exception as e:
        mark_duckdb_failed(dataset_id, version_id, str(e))
        logger.error(f"[Background] DuckDB build failed: {e}", exc_info=True)


@router.post(
    "/datasets/{dataset_id}/upload",
    status_code=status.HTTP_201_CREATED,
)
async def upload_dataset_file(
    dataset_id: UUID,
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    session: DBSession = None,
    current_user: RateLimitedUser = None,
):
    """
    Upload raw dataset file and create a new dataset version.

    - Validates file extension and size
    - Infers schema
    - Stores raw data
    - Creates immutable dataset version
    - **Builds DuckDB file in background** for PowerBI-like analytics

    Handles large files (up to 100MB) by reading into memory buffer.
    DuckDB file creation happens asynchronously without blocking the response.
    """
    logger.info(f"Upload started: dataset_id={dataset_id}, filename={file.filename}, content_type={file.content_type}")
    
    try:
        # Read entire file into memory buffer for large file handling
        logger.info("Reading file content...")
        file_content = await file.read()
        file_size = len(file_content)
        logger.info(f"File read complete: {file_size} bytes ({file_size / 1024 / 1024:.2f} MB)")
        
        if file_size == 0:
            raise InvalidOperation(
                operation="file_upload",
                reason="Empty file received",
                details="The uploaded file has 0 bytes. Please ensure the file is not empty.",
            )
        
        file_stream = BytesIO(file_content)
        
        logger.info("Starting ingestion...")
        result = ingest_file_upload(
            session=session,
            dataset_id=dataset_id,
            user_id=UUID(current_user.user_id),
            role=current_user.role,
            file_stream=file_stream,
            filename=file.filename,
            file_size=file_size,
        )
        logger.info(f"Upload complete: version_id={result.get('version_id')}")

        # Build DuckDB file in background (doesn't block response)
        version_id = result.get('version_id')
        if version_id:
            # ingestion_service returns raw_path for uploaded CSV storage location
            csv_path = result.get('raw_path') or result.get('file_path') or result.get('source_reference')
            if csv_path and background_tasks:
                # Mark immediately so frontend can poll deterministic status right after upload.
                mark_duckdb_building(dataset_id, UUID(version_id))
                background_tasks.add_task(
                    _build_duckdb_background,
                    dataset_id=dataset_id,
                    version_id=UUID(version_id),
                    csv_path=csv_path
                )
                logger.info(f"Scheduled DuckDB build in background for version {version_id}")
            else:
                logger.warning(
                    "Skipped DuckDB background build scheduling: "
                    f"version_id={version_id}, csv_path_present={bool(csv_path)}, "
                    f"background_tasks_present={background_tasks is not None}"
                )

        return result

    except ResourceNotFound as e:
        logger.error(f"Resource not found: {e.message}")
        raise HTTPException(status_code=404, detail=e.message)

    except AuthorizationError as e:
        logger.error(f"Authorization error: {e.message}")
        raise HTTPException(status_code=403, detail=e.message)

    except InvalidOperation as e:
        logger.error(f"Invalid operation: {e.message} - {e.reason}")
        raise HTTPException(status_code=400, detail=e.message)
    
    except Exception as e:
        logger.exception(f"Unexpected error during upload: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
