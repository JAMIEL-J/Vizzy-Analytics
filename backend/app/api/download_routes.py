"""
Download and export routes.

Belongs to: API layer
Responsibility: File downloads and data exports
Restrictions: Thin controller - delegates to services
"""

from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse, StreamingResponse
import pandas as pd

from app.api.deps import DBSession, AuthenticatedUser
from app.core.storage import get_cleaned_data_path, get_raw_data_path
from app.core.exceptions import ResourceNotFound, AuthorizationError
from app.services import dataset_version_service


router = APIRouter()


@router.get(
    "/datasets/{dataset_id}/versions/{version_id}/download/raw",
    summary="Download raw dataset",
    response_class=FileResponse,
)
def download_raw_dataset(
    dataset_id: UUID,
    version_id: UUID,
    session: DBSession,
    current_user: AuthenticatedUser,
) -> FileResponse:
    """
    Download the original uploaded dataset as CSV.
    """
    # Validate ownership
    version = dataset_version_service.get_version(
        session=session,
        version_id=version_id,
        user_id=UUID(current_user.user_id),
        user_role=current_user.role,
    )

    if not version:
        raise HTTPException(status_code=404, detail="Dataset version not found")

    # Get file path
    file_path = get_raw_data_path(str(dataset_id), str(version_id))

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Raw data file not found")

    return FileResponse(
        path=str(file_path),
        filename=f"raw_data_{version_id}.csv",
        media_type="text/csv",
    )


@router.get(
    "/datasets/{dataset_id}/versions/{version_id}/download/cleaned",
    summary="Download cleaned dataset",
    response_class=FileResponse,
)
def download_cleaned_dataset(
    dataset_id: UUID,
    version_id: UUID,
    session: DBSession,
    current_user: AuthenticatedUser,
) -> FileResponse:
    """
    Download the cleaned dataset as CSV.
    
    The cleaned dataset includes all transformations from the cleaning plan.
    """
    # Validate ownership
    version = dataset_version_service.get_version(
        session=session,
        version_id=version_id,
        user_id=UUID(current_user.user_id),
        user_role=current_user.role,
    )

    if not version:
        raise HTTPException(status_code=404, detail="Dataset version not found")

    # Get file path
    file_path = get_cleaned_data_path(str(dataset_id), str(version_id))

    if not file_path.exists():
        # Fall back to raw if cleaned doesn't exist
        file_path = get_raw_data_path(str(dataset_id), str(version_id))
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Data file not found")

    return FileResponse(
        path=str(file_path),
        filename=f"cleaned_data_{version_id}.csv",
        media_type="text/csv",
    )
