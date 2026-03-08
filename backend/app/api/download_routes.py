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
from app.services import dataset_version_service, dataset_service


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
    try:
        dataset = dataset_service.get_dataset_by_id(
            session=session,
            dataset_id=dataset_id,
            user_id=UUID(current_user.user_id),
            role=current_user.role,
        )
        version = dataset_version_service.get_version_by_id(
            session=session,
            version_id=version_id,
        )
        if version.dataset_id != dataset.id:
            raise HTTPException(status_code=404, detail="Version does not belong to dataset")
    except (ResourceNotFound, AuthorizationError) as e:
        raise HTTPException(status_code=404, detail=str(e))

    # Get file path
    if not version.source_reference or version.source_reference == "PENDING":
        raise HTTPException(status_code=404, detail="Raw data file not ready")

    file_path = Path(version.source_reference)

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
    try:
        dataset = dataset_service.get_dataset_by_id(
            session=session,
            dataset_id=dataset_id,
            user_id=UUID(current_user.user_id),
            role=current_user.role,
        )
        version = dataset_version_service.get_version_by_id(
            session=session,
            version_id=version_id,
        )
        if version.dataset_id != dataset.id:
            raise HTTPException(status_code=404, detail="Version does not belong to dataset")
    except (ResourceNotFound, AuthorizationError) as e:
        raise HTTPException(status_code=404, detail=str(e))

    if not version.cleaned_reference:
        raise HTTPException(status_code=400, detail="Dataset has not been cleaned yet")

    # Get file path
    file_path = Path(version.cleaned_reference)

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Cleaned data file not found")

    return FileResponse(
        path=str(file_path),
        filename=f"cleaned_data_{version_id}.csv",
        media_type="text/csv",
    )


@router.get(
    "/datasets/{dataset_id}/download/raw",
    summary="Download latest raw dataset",
    response_class=FileResponse,
)
def download_latest_raw_dataset(
    dataset_id: UUID,
    session: DBSession,
    current_user: AuthenticatedUser,
) -> FileResponse:
    """
    Download the original uploaded dataset for the latest version as CSV.
    """
    # Validate ownership
    try:
        dataset = dataset_service.get_dataset_by_id(
            session=session,
            dataset_id=dataset_id,
            user_id=UUID(current_user.user_id),
            role=current_user.role,
        )
        version = dataset_version_service.get_latest_version(
            session=session,
            dataset_id=dataset.id,
        )
    except (ResourceNotFound, AuthorizationError) as e:
        raise HTTPException(status_code=404, detail=str(e))

    # Get file path
    if not version.source_reference or version.source_reference == "PENDING":
        raise HTTPException(status_code=404, detail="Raw data file not ready")

    file_path = Path(version.source_reference)

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Raw data file not found")

    return FileResponse(
        path=str(file_path),
        filename=f"raw_data_latest.csv",
        media_type="text/csv",
    )


@router.get(
    "/datasets/{dataset_id}/download/cleaned",
    summary="Download latest cleaned dataset",
    response_class=FileResponse,
)
def download_latest_cleaned_dataset(
    dataset_id: UUID,
    session: DBSession,
    current_user: AuthenticatedUser,
) -> FileResponse:
    """
    Download the latest cleaned dataset as CSV.
    """
    # Validate ownership
    try:
        dataset = dataset_service.get_dataset_by_id(
            session=session,
            dataset_id=dataset_id,
            user_id=UUID(current_user.user_id),
            role=current_user.role,
        )
        version = dataset_version_service.get_latest_version(
            session=session,
            dataset_id=dataset.id,
        )
    except (ResourceNotFound, AuthorizationError) as e:
        raise HTTPException(status_code=404, detail=str(e))

    if not version.cleaned_reference:
        raise HTTPException(status_code=400, detail="Dataset has not been cleaned yet")

    # Get file path
    file_path = Path(version.cleaned_reference)

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Cleaned data file not found")

    return FileResponse(
        path=str(file_path),
        filename=f"cleaned_data_latest.csv",
        media_type="text/csv",
    )
