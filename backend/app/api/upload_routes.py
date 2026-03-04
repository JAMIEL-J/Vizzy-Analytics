from io import BytesIO
from uuid import UUID
from fastapi import APIRouter, UploadFile, File, HTTPException, status

from app.api.deps import DBSession, RateLimitedUser
from app.services.ingestion_service import ingest_file_upload
from app.core.exceptions import InvalidOperation, ResourceNotFound, AuthorizationError
from app.core.logger import get_logger


router = APIRouter()
logger = get_logger(__name__)


@router.post(
    "/datasets/{dataset_id}/upload",
    status_code=status.HTTP_201_CREATED,
)
async def upload_dataset_file(
    dataset_id: UUID,
    file: UploadFile = File(...),
    session: DBSession = None,
    current_user: RateLimitedUser = None,
):
    """
    Upload raw dataset file and create a new dataset version.

    - Validates file extension and size
    - Infers schema
    - Stores raw data
    - Creates immutable dataset version
    
    Handles large files (up to 100MB) by reading into memory buffer.
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
