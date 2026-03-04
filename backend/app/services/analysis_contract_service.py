from typing import Any, Dict, Optional
from uuid import UUID

from sqlmodel import Session, select

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


def create_analysis_contract(
    session: Session,
    dataset_version_id: UUID,
    allowed_metrics: Dict[str, Any],
    allowed_dimensions: Dict[str, Any],
    user_id: UUID,
    role: UserRole,
    time_granularity: Optional[str] = None,
    constraints: Optional[Dict[str, Any]] = None,
) -> AnalysisContract:
    """
    Create a new analysis contract.
    Automatically supersedes any existing active contract.
    """
    version = session.get(DatasetVersion, dataset_version_id)
    if not version or not version.is_active:
        raise ResourceNotFound("DatasetVersion", str(dataset_version_id))

    _assert_version_access(session, version, user_id, role)

    existing = session.exec(
        select(AnalysisContract).where(
            AnalysisContract.dataset_version_id == dataset_version_id,
            AnalysisContract.is_active == True,
        )
    ).first()

    if existing:
        existing.is_active = False
        session.add(existing)

    contract = AnalysisContract(
        dataset_version_id=dataset_version_id,
        allowed_metrics=allowed_metrics,
        allowed_dimensions=allowed_dimensions,
        time_granularity=time_granularity,
        constraints=constraints,
        is_active=True,
    )

    session.add(contract)
    session.commit()
    session.refresh(contract)

    if existing:
        record_audit_event(
            event_type="ANALYSIS_CONTRACT_SUPERSEDED",
            user_id=str(user_id),
            resource_type="AnalysisContract",
            resource_id=str(existing.id),
            metadata={"replaced_by": str(contract.id)},
        )

    record_audit_event(
        event_type="ANALYSIS_CONTRACT_CREATED",
        user_id=str(user_id),
        resource_type="AnalysisContract",
        resource_id=str(contract.id),
        metadata={"dataset_version_id": str(dataset_version_id)},
    )

    return contract


def get_active_contract_for_version(
    session: Session,
    dataset_version_id: UUID,
    user_id: UUID,
    role: UserRole,
) -> AnalysisContract:
    """Get the active analysis contract for a dataset version."""
    version = session.get(DatasetVersion, dataset_version_id)
    if not version or not version.is_active:
        raise ResourceNotFound("DatasetVersion", str(dataset_version_id))

    _assert_version_access(session, version, user_id, role)

    contract = session.exec(
        select(AnalysisContract).where(
            AnalysisContract.dataset_version_id == dataset_version_id,
            AnalysisContract.is_active == True,
        )
    ).first()

    if not contract:
        raise ResourceNotFound(
            "AnalysisContract",
            f"dataset_version_id={dataset_version_id}",
        )

    return contract


def deactivate_contract(
    session: Session,
    contract_id: UUID,
    user_id: UUID,
    role: UserRole,
) -> AnalysisContract:
    """
    Explicitly deactivate an analysis contract.
    """
    contract = session.get(AnalysisContract, contract_id)
    if not contract:
        raise ResourceNotFound("AnalysisContract", str(contract_id))

    if not contract.is_active:
        raise InvalidOperation(
            operation="deactivate_contract",
            reason="Contract is already inactive",
        )

    version = session.get(DatasetVersion, contract.dataset_version_id)
    if not version:
        raise ResourceNotFound("DatasetVersion", str(contract.dataset_version_id))

    _assert_version_access(session, version, user_id, role)

    contract.is_active = False
    session.add(contract)
    session.commit()
    session.refresh(contract)

    record_audit_event(
        event_type="ANALYSIS_CONTRACT_DEACTIVATED",
        user_id=str(user_id),
        resource_type="AnalysisContract",
        resource_id=str(contract.id),
    )

    return contract
