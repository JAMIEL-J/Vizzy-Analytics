from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.api.deps import DBSession, RateLimitedUser
from app.services import dataset_version_service
from app.models.dataset_version import SourceType
from app.core.exceptions import (
    ResourceNotFound,
    AuthorizationError,
    InvalidOperation,
)


router = APIRouter()


# =========================
# Request / Response Models
# =========================

class VersionCreateRequest(BaseModel):
    source_type: SourceType
    source_reference: str
    schema_hash: str
    row_count: Optional[int] = None


class VersionResponse(BaseModel):
    id: UUID
    dataset_id: UUID
    version_number: int
    source_type: SourceType
    source_reference: str
    row_count: Optional[int]
    schema_hash: str
    created_by: UUID
    is_active: bool

    class Config:
        from_attributes = True


class VersionListResponse(BaseModel):
    versions: List[VersionResponse]


# =========================
# Routes
# =========================

@router.post("", response_model=VersionResponse, status_code=status.HTTP_201_CREATED)
def create_version(
    dataset_id: UUID,
    request: VersionCreateRequest,
    session: DBSession,
    current_user: RateLimitedUser,
) -> VersionResponse:
    try:
        version = dataset_version_service.create_dataset_version(
            session=session,
            dataset_id=dataset_id,
            source_type=request.source_type,
            source_reference=request.source_reference,
            schema_hash=request.schema_hash,
            row_count=request.row_count,
            created_by=UUID(current_user.user_id),
        )
        return VersionResponse.model_validate(version)

    except ResourceNotFound as e:
        raise HTTPException(status_code=404, detail=e.message)

    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=e.message)

    except InvalidOperation as e:
        raise HTTPException(status_code=409, detail=e.message)


@router.get("", response_model=VersionListResponse)
def list_versions(
    dataset_id: UUID,
    session: DBSession,
    current_user: RateLimitedUser,
) -> VersionListResponse:
    try:
        versions = dataset_version_service.list_versions_for_dataset(
            session=session,
            dataset_id=dataset_id,
        )
        return VersionListResponse(
            versions=[VersionResponse.model_validate(v) for v in versions]
        )

    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=e.message)


@router.get("/latest", response_model=VersionResponse)
def get_latest_version(
    dataset_id: UUID,
    session: DBSession,
    current_user: RateLimitedUser,
) -> VersionResponse:
    try:
        version = dataset_version_service.get_latest_version(
            session=session,
            dataset_id=dataset_id,
        )
        return VersionResponse.model_validate(version)

    except ResourceNotFound as e:
        raise HTTPException(status_code=404, detail=e.message)

    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=e.message)


@router.get("/{version_id}", response_model=VersionResponse)
def get_version(
    version_id: UUID,
    session: DBSession,
    current_user: RateLimitedUser,
) -> VersionResponse:
    try:
        version = dataset_version_service.get_version_by_id(
            session=session,
            version_id=version_id,
        )
        return VersionResponse.model_validate(version)

    except ResourceNotFound as e:
        raise HTTPException(status_code=404, detail=e.message)

    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=e.message)
