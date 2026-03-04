from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.api.deps import DBSession, RateLimitedUser
from app.services import analysis_contract_service
from app.core.exceptions import (
    ResourceNotFound,
    AuthorizationError,
    InvalidOperation,
)


router = APIRouter()


# =========================
# Request / Response Models
# =========================

class AnalysisContractCreateRequest(BaseModel):
    allowed_metrics: Dict[str, Any]
    allowed_dimensions: Dict[str, Any]
    time_granularity: Optional[str] = None
    constraints: Optional[Dict[str, Any]] = None


class AnalysisContractResponse(BaseModel):
    id: UUID
    dataset_version_id: UUID
    allowed_metrics: Dict[str, Any]
    allowed_dimensions: Dict[str, Any]
    time_granularity: Optional[str]
    constraints: Optional[Dict[str, Any]]
    is_active: bool

    class Config:
        from_attributes = True


# =========================
# Routes
# =========================

@router.post(
    "",
    response_model=AnalysisContractResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_analysis_contract(
    version_id: UUID,
    request: AnalysisContractCreateRequest,
    session: DBSession,
    current_user: RateLimitedUser,
) -> AnalysisContractResponse:
    """
    Create or replace an analysis contract for a dataset version.
    """
    try:
        contract = analysis_contract_service.create_analysis_contract(
            session=session,
            dataset_version_id=version_id,
            allowed_metrics=request.allowed_metrics,
            allowed_dimensions=request.allowed_dimensions,
            time_granularity=request.time_granularity,
            constraints=request.constraints,
            user_id=UUID(current_user.user_id),
            role=current_user.role,
        )
        return AnalysisContractResponse.model_validate(contract)

    except ResourceNotFound as e:
        raise HTTPException(status_code=404, detail=e.message)

    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=e.message)

    except InvalidOperation as e:
        raise HTTPException(status_code=409, detail=e.message)


@router.get(
    "",
    response_model=AnalysisContractResponse,
)
def get_active_contract(
    version_id: UUID,
    session: DBSession,
    current_user: RateLimitedUser,
) -> AnalysisContractResponse:
    """Fetch the active analysis contract for a dataset version."""
    try:
        contract = analysis_contract_service.get_active_contract_for_version(
            session=session,
            dataset_version_id=version_id,
            user_id=UUID(current_user.user_id),
            role=current_user.role,
        )
        return AnalysisContractResponse.model_validate(contract)

    except ResourceNotFound as e:
        raise HTTPException(status_code=404, detail=e.message)

    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=e.message)


@router.delete(
    "/{contract_id}",
    response_model=AnalysisContractResponse,
)
def deactivate_contract(
    contract_id: UUID,
    session: DBSession,
    current_user: RateLimitedUser,
) -> AnalysisContractResponse:
    """
    Explicitly deactivate an analysis contract.
    """
    try:
        contract = analysis_contract_service.deactivate_contract(
            session=session,
            contract_id=contract_id,
            user_id=UUID(current_user.user_id),
            role=current_user.role,
        )
        return AnalysisContractResponse.model_validate(contract)

    except ResourceNotFound as e:
        raise HTTPException(status_code=404, detail=e.message)

    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=e.message)

    except InvalidOperation as e:
        raise HTTPException(status_code=409, detail=e.message)
