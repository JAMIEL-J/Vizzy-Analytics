from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.api.deps import DBSession, RateLimitedUser
from app.services.analysis_orchestrator import run_analysis_orchestration
from app.core.exceptions import ResourceNotFound, InvalidOperation


router = APIRouter()


class NLQueryRequest(BaseModel):
    query: str


@router.post(
    "/versions/{version_id}/nl-analysis",
    status_code=status.HTTP_200_OK,
)
def run_nl_analysis(
    version_id: UUID,
    request: NLQueryRequest,
    session: DBSession,
    current_user: RateLimitedUser,
):
    """
    Run natural language analysis on a dataset version.
    """

    try:
        result = run_analysis_orchestration(
            session=session,
            dataset_version_id=version_id,
            user_id=UUID(current_user.user_id),
            role=current_user.role,
            query=request.query,
        )

        return result

    except ResourceNotFound as e:
        raise HTTPException(status_code=404, detail=e.message)

    except InvalidOperation as e:
        raise HTTPException(status_code=400, detail=e.message)
