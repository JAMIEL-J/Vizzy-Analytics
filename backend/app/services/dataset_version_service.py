from typing import List, Optional
from uuid import UUID

from sqlmodel import Session, select, func

from app.models.dataset import Dataset
from app.models.dataset_version import DatasetVersion, SourceType
from app.models.user import UserRole
from app.core.exceptions import ResourceNotFound, AuthorizationError
from app.core.audit import record_audit_event


def _assert_dataset_access(
    dataset: Dataset,
    user_id: UUID,
    role: UserRole,
) -> None:
    """Ensure user can create versions for this dataset."""
    if role == UserRole.ADMIN:
        return

    if dataset.owner_id != user_id:
        raise AuthorizationError(
            message="Access denied",
            details="You do not have access to this dataset",
        )


def _get_next_version_number(
    session: Session,
    dataset_id: UUID,
) -> int:
    """
    Get the next version number for a dataset.
    NOTE: Assumes serialized writes at service/API level.
    """
    result = session.exec(
        select(func.max(DatasetVersion.version_number)).where(
            DatasetVersion.dataset_id == dataset_id
        )
    ).first()

    return (result or 0) + 1


def create_dataset_version(
    session: Session,
    dataset_id: UUID,
    source_type: SourceType,
    source_reference: str,
    schema_hash: str,
    created_by: UUID,
    role: UserRole,
    row_count: Optional[int] = None,
) -> DatasetVersion:
    """
    Create a new immutable dataset version.
    """
    dataset = session.get(Dataset, dataset_id)

    if not dataset or not dataset.is_active:
        raise ResourceNotFound("Dataset", str(dataset_id))

    _assert_dataset_access(dataset, created_by, role)

    version_number = _get_next_version_number(session, dataset_id)

    version = DatasetVersion(
        dataset_id=dataset_id,
        version_number=version_number,
        source_type=source_type,
        source_reference=source_reference,
        row_count=row_count,
        schema_hash=schema_hash,
        created_by=created_by,
        is_active=True,
    )

    session.add(version)
    session.commit()
    session.refresh(version)

    record_audit_event(
        event_type="DATASET_VERSION_CREATED",
        user_id=str(created_by),
        resource_type="DatasetVersion",
        resource_id=str(version.id),
        metadata={
            "dataset_id": str(dataset_id),
            "version_number": version_number,
            "source_type": source_type.value,
        },
    )

    return version


def list_versions_for_dataset(
    session: Session,
    dataset_id: UUID,
) -> List[DatasetVersion]:
    """List all active versions for a dataset."""
    statement = (
        select(DatasetVersion)
        .where(
            DatasetVersion.dataset_id == dataset_id,
            DatasetVersion.is_active == True,
        )
        .order_by(DatasetVersion.version_number.desc())
    )

    return list(session.exec(statement).all())


def get_latest_version(
    session: Session,
    dataset_id: UUID,
) -> DatasetVersion:
    """Get the latest active dataset version."""
    statement = (
        select(DatasetVersion)
        .where(
            DatasetVersion.dataset_id == dataset_id,
            DatasetVersion.is_active == True,
        )
        .order_by(DatasetVersion.version_number.desc())
        .limit(1)
    )

    version = session.exec(statement).first()

    if not version:
        raise ResourceNotFound("DatasetVersion", f"dataset_id={dataset_id}")

    return version


def get_version_by_id(
    session: Session,
    version_id: UUID,
) -> DatasetVersion:
    """Fetch a dataset version by ID."""
    version = session.get(DatasetVersion, version_id)

    if not version or not version.is_active:
        raise ResourceNotFound("DatasetVersion", str(version_id))

    return version
