from typing import Any, Dict, List
from uuid import UUID

from sqlmodel import Session, select

from app.models.analysis_result import AnalysisResult
from app.models.analysis_contract import AnalysisContract
from app.models.dataset import Dataset
from app.models.dataset_version import DatasetVersion
from app.models.user import UserRole
from app.core.exceptions import (
    InvalidOperation,
    ResourceNotFound,
    AuthorizationError,
)
from app.core.audit import record_audit_event


def _assert_version_access(
    session: Session,
    version: DatasetVersion,
    user_id: UUID,
    role: UserRole,
) -> None:
    """Ensure user has access to the dataset version."""
    if role == UserRole.ADMIN:
        return

    dataset = session.get(Dataset, version.dataset_id)

    if not dataset or dataset.owner_id != user_id:
        raise AuthorizationError(
            message="Access denied",
            details="You do not have access to this dataset version",
        )


def create_analysis_result(
    session: Session,
    dataset_version_id: UUID,
    analysis_contract_id: UUID,
    result_payload: Dict[str, Any],
    user_id: UUID,
    role: UserRole,
) -> AnalysisResult:
    """
    Create an immutable analysis result.
    Requires an active analysis contract.
    """
    version = session.get(DatasetVersion, dataset_version_id)
    if not version or not version.is_active:
        raise ResourceNotFound("DatasetVersion", str(dataset_version_id))

    _assert_version_access(session, version, user_id, role)

    contract = session.get(AnalysisContract, analysis_contract_id)
    if not contract or not contract.is_active:
        raise ResourceNotFound("AnalysisContract", str(analysis_contract_id))

    if contract.dataset_version_id != dataset_version_id:
        raise InvalidOperation(
            operation="create_analysis_result",
            reason="Contract does not belong to specified dataset version",
        )

    result = AnalysisResult(
        dataset_version_id=dataset_version_id,
        analysis_contract_id=analysis_contract_id,
        result_payload=result_payload,
        generated_by=user_id,
        is_active=True,
    )

    session.add(result)
    session.commit()
    session.refresh(result)

    record_audit_event(
        event_type="ANALYSIS_RESULT_CREATED",
        user_id=str(user_id),
        resource_type="AnalysisResult",
        resource_id=str(result.id),
        metadata={
            "dataset_version_id": str(dataset_version_id),
            "analysis_contract_id": str(analysis_contract_id),
        },
    )

    return result


def list_results_for_version(
    session: Session,
    dataset_version_id: UUID,
    user_id: UUID,
    role: UserRole,
) -> List[AnalysisResult]:
    """List all active analysis results for a dataset version."""
    version = session.get(DatasetVersion, dataset_version_id)
    if not version or not version.is_active:
        raise ResourceNotFound("DatasetVersion", str(dataset_version_id))

    _assert_version_access(session, version, user_id, role)

    statement = (
        select(AnalysisResult)
        .where(
            AnalysisResult.dataset_version_id == dataset_version_id,
            AnalysisResult.is_active == True,
        )
        .order_by(AnalysisResult.generated_at.desc())
    )

    return list(session.exec(statement).all())


def get_result_by_id(
    session: Session,
    result_id: UUID,
    user_id: UUID,
    role: UserRole,
) -> AnalysisResult:
    """Get a specific analysis result by ID."""
    result = session.get(AnalysisResult, result_id)
    if not result or not result.is_active:
        raise ResourceNotFound("AnalysisResult", str(result_id))

    version = session.get(DatasetVersion, result.dataset_version_id)
    if not version:
        raise ResourceNotFound("DatasetVersion", str(result.dataset_version_id))

    _assert_version_access(session, version, user_id, role)

    return result
def generate_export_url(
    session: Session,
    result_id: UUID,
    user_id: UUID,
    role: UserRole,
    expires_in_seconds: int = 3600,
) -> str:
    """
    Generate a temporary signed URL for exporting analysis results as CSV.
    
    In a real system, this would generate a presigned S3 URL or a signed token 
    for a dedicated export endpoint. 
    
    For now, we will generate a local API URL with a signed token.
    """
    result = get_result_by_id(session, result_id, user_id, role)
    
    # Mock Token Generation (HMAC can be used here)
    import hashlib
    import time
    from app.core.config import settings
    
    timestamp = int(time.time())
    # Create a simple signature
    payload = f"{result_id}:{user_id}:{timestamp}"
    signature = hashlib.sha256(f"{payload}:{settings.SECRET_KEY}".encode()).hexdigest()
    
    # Construct URL (assuming an endpoint /api/v1/analysis/{id}/export exists)
    # The frontend uses this URL to trigger the download
    url = f"{settings.API_V1_STR}/analysis/{result_id}/export?token={signature}&ts={timestamp}"
    
    return url
