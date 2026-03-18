from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.api.deps import DBSession, RateLimitedUser
from app.services import dataset_service
from app.core.exceptions import (
    ResourceNotFound,
    AuthorizationError,
    InvalidOperation,
)


router = APIRouter()


class DatasetCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None


class DatasetResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    owner_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    current_version_id: Optional[UUID] = None

    class Config:
        from_attributes = True


class DatasetListResponse(BaseModel):
    datasets: List[DatasetResponse]


@router.post("", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
def create_dataset(
    request: DatasetCreateRequest,
    session: DBSession,
    current_user: RateLimitedUser,
) -> DatasetResponse:
    try:
        dataset = dataset_service.create_dataset(
            session=session,
            name=request.name,
            owner_id=UUID(current_user.user_id),
            description=request.description,
        )
        return DatasetResponse.model_validate(dataset)
    except InvalidOperation as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=e.message,
        )


@router.get("", response_model=DatasetListResponse)
def list_datasets(
    session: DBSession,
    current_user: RateLimitedUser,
) -> DatasetListResponse:
    datasets = dataset_service.list_datasets_with_details(
        session=session,
        user_id=UUID(current_user.user_id),
        role=current_user.role,
    )
    return DatasetListResponse(
        datasets=[DatasetResponse.model_validate(d) for d in datasets]
    )


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(
    dataset_id: UUID,
    session: DBSession,
    current_user: RateLimitedUser,
) -> DatasetResponse:
    try:
        dataset = dataset_service.get_dataset_details(
            session=session,
            dataset_id=dataset_id,
            user_id=UUID(current_user.user_id),
            role=current_user.role,
        )
        return DatasetResponse.model_validate(dataset)
    except ResourceNotFound as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=e.message,
        )


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dataset(
    dataset_id: UUID,
    session: DBSession,
    current_user: RateLimitedUser,
) -> None:
    try:
        dataset_service.deactivate_dataset(
            session=session,
            dataset_id=dataset_id,
            user_id=UUID(current_user.user_id),
            role=current_user.role,
        )
    except ResourceNotFound as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=e.message,
        )
    except InvalidOperation as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=e.message,
        )
