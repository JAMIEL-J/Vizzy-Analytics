from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Body

from app.api.deps import DBSession, RateLimitedUser
from app.services.ingestion_service import ingest_sql_query
from app.core.exceptions import InvalidOperation, ResourceNotFound, AuthorizationError


router = APIRouter()


@router.post(
    "/datasets/{dataset_id}/sql",
    status_code=status.HTTP_201_CREATED,
)
def ingest_from_sql(
    dataset_id: UUID,
    query: str = Body(..., embed=True),
    session: DBSession = None,
    current_user: RateLimitedUser = None,
):
    """
    Ingest dataset from SQL SELECT query.

    - Validates query is SELECT only
    - Executes read-only query
    - Infers schema
    - Stores data as CSV
    - Creates immutable dataset version
    """
    try:
        result = ingest_sql_query(
            session=session,
            dataset_id=dataset_id,
            user_id=UUID(current_user.user_id),
            role=current_user.role,
            query=query,
        )
        return result

    except ResourceNotFound as e:
        raise HTTPException(status_code=404, detail=e.message)

    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=e.message)

    except InvalidOperation as e:
        raise HTTPException(status_code=400, detail=e.message)
