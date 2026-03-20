from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlmodel import Session, select

from app.models.user import User, UserRole
from app.models.dataset import Dataset
from app.models.dataset_version import DatasetVersion
from app.models.saved_dashboard import SavedDashboard
from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage
from app.models.analysis_result import AnalysisResult
from app.models.analysis_contract import AnalysisContract
from app.models.cleaning_plan import CleaningPlan
from app.models.inspection_report import InspectionReport
from app.core.exceptions import InvalidOperation, ResourceNotFound
from app.core.audit import record_audit_event


def create_user(
    session: Session,
    email: str,
    hashed_password: str,
    name: Optional[str] = None,
    role: UserRole = UserRole.USER,
) -> User:
    """
    Create a new user.

    Assumes password is already hashed.
    """
    existing = session.exec(
        select(User).where(User.email == email)
    ).first()

    if existing:
        raise InvalidOperation(
            operation="create_user",
            reason="User with this email already exists",
        )

    user = User(
        email=email,
        name=name.strip() if name else None,
        hashed_password=hashed_password,
        role=role,
        is_active=True,
    )

    session.add(user)
    session.commit()
    session.refresh(user)

    record_audit_event(
        event_type="USER_CREATED",
        user_id=str(user.id),
        metadata={"email": email, "name": user.name, "role": role.value},
    )

    return user


def get_user_by_email(
    session: Session,
    email: str,
) -> Optional[User]:
    """
    Fetch a user by email.
    """
    return session.exec(
        select(User).where(User.email == email)
    ).first()


def update_user_profile(
    session: Session,
    user_id: UUID,
    name: Optional[str] = None,
    email: Optional[str] = None,
) -> User:
    """Update current user profile fields (name/email)."""
    user = session.get(User, user_id)
    if not user:
        raise ResourceNotFound("User", str(user_id))

    if email is not None:
        normalized_email = email.strip().lower()
        if not normalized_email:
            raise InvalidOperation(
                operation="update_user_profile",
                reason="Email cannot be empty",
            )
        if normalized_email != user.email:
            existing = session.exec(select(User).where(User.email == normalized_email)).first()
            if existing and existing.id != user.id:
                raise InvalidOperation(
                    operation="update_user_profile",
                    reason="Email already registered",
                )
            user.email = normalized_email

    if name is not None:
        normalized_name = name.strip()
        user.name = normalized_name or None

    session.add(user)
    session.commit()
    session.refresh(user)

    record_audit_event(
        event_type="USER_PROFILE_UPDATED",
        user_id=str(user.id),
        metadata={"email": user.email, "name": user.name},
    )

    return user


def activate_user(
    session: Session,
    user_id: UUID,
) -> User:
    """
    Activate a user account.
    """
    user = session.get(User, user_id)
    if not user:
        raise ResourceNotFound("User", str(user_id))

    if user.is_active:
        return user

    user.is_active = True
    session.add(user)
    session.commit()
    session.refresh(user)

    record_audit_event(
        event_type="USER_ACTIVATED",
        user_id=str(user.id),
    )

    return user


def deactivate_user(
    session: Session,
    user_id: UUID,
) -> User:
    """
    Deactivate a user account.
    """
    user = session.get(User, user_id)
    if not user:
        raise ResourceNotFound("User", str(user_id))

    if not user.is_active:
        return user

    user.is_active = False
    session.add(user)
    session.commit()
    session.refresh(user)

    record_audit_event(
        event_type="USER_DEACTIVATED",
        user_id=str(user.id),
    )

    return user


def get_user_by_id(
    session: Session,
    user_id: UUID,
) -> User:
    """
    Fetch a user by ID.

    Raises ResourceNotFound if user does not exist.
    """
    user = session.get(User, user_id)
    if not user:
        raise ResourceNotFound("User", str(user_id))
    return user


def list_users(
    session: Session,
    skip: int = 0,
    limit: int = 100,
    include_inactive: bool = False,
) -> tuple[list[User], int]:
    """
    List users with pagination.

    Returns tuple of (users, total_count).
    """
    from sqlmodel import func

    # Base query
    query = select(User)

    # Filter inactive if needed
    if not include_inactive:
        query = query.where(User.is_active == True)

    # Get total count
    count_query = select(func.count()).select_from(User)
    if not include_inactive:
        count_query = count_query.where(User.is_active == True)
    total = session.exec(count_query).one()

    # Apply pagination
    query = query.offset(skip).limit(limit)
    users = list(session.exec(query).all())

    return users, total


def delete_user(
    session: Session,
    user_id: UUID,
) -> None:
    """
    Permanently delete a user.

    This is a hard delete - use deactivate_user for soft deletion.
    """
    user = session.get(User, user_id)
    if not user:
        raise ResourceNotFound("User", str(user_id))

    # Record audit before deletion
    record_audit_event(
        event_type="USER_DELETED",
        user_id=str(user.id),
        metadata={"email": user.email},
    )

    session.delete(user)
    session.commit()


def _month_key(dt: datetime) -> str:
    return dt.strftime("%Y-%m")


def get_user_profile_stats(
    session: Session,
    user_id: UUID,
) -> dict:
    """Aggregate profile metrics and chart-ready usage data for a user."""
    user = get_user_by_id(session=session, user_id=user_id)

    datasets = list(session.exec(
        select(Dataset).where(
            Dataset.owner_id == user_id,
            Dataset.is_active == True,
        )
    ).all())
    dataset_ids = [d.id for d in datasets]

    uploads = list(session.exec(
        select(DatasetVersion).where(
            DatasetVersion.created_by == user_id,
            DatasetVersion.is_active == True,
        )
    ).all())

    dashboards = list(session.exec(
        select(SavedDashboard).where(SavedDashboard.user_id == user_id)
    ).all())

    chat_sessions = list(session.exec(
        select(ChatSession).where(
            ChatSession.user_id == user_id,
            ChatSession.is_active == True,
        )
    ).all())
    chat_session_ids = [s.id for s in chat_sessions]

    if chat_session_ids:
        chat_messages = list(session.exec(
            select(ChatMessage).where(ChatMessage.session_id.in_(chat_session_ids))
        ).all())
    else:
        chat_messages = []

    analysis_results = list(session.exec(
        select(AnalysisResult).where(
            AnalysisResult.generated_by == user_id,
            AnalysisResult.is_active == True,
        )
    ).all())

    # Feature usage tied to owned datasets (contracts, cleaning plans, inspection reports)
    owned_versions = []
    if dataset_ids:
        owned_versions = list(session.exec(
            select(DatasetVersion).where(
                DatasetVersion.dataset_id.in_(dataset_ids),
                DatasetVersion.is_active == True,
            )
        ).all())

    owned_version_ids = [v.id for v in owned_versions]

    if owned_version_ids:
        analysis_contracts = list(session.exec(
            select(AnalysisContract).where(
                AnalysisContract.dataset_version_id.in_(owned_version_ids),
                AnalysisContract.is_active == True,
            )
        ).all())
        cleaning_plans = list(session.exec(
            select(CleaningPlan).where(
                CleaningPlan.dataset_version_id.in_(owned_version_ids),
                CleaningPlan.is_active == True,
            )
        ).all())
        inspections = list(session.exec(
            select(InspectionReport).where(
                InspectionReport.dataset_version_id.in_(owned_version_ids),
                InspectionReport.is_active == True,
            )
        ).all())
    else:
        analysis_contracts = []
        cleaning_plans = []
        inspections = []

    source_counts = {"upload": 0, "sql": 0}
    for version in uploads:
        source = str(version.source_type.value if hasattr(version.source_type, "value") else version.source_type)
        source_counts[source] = source_counts.get(source, 0) + 1

    analysis_type_counts = {
        "dashboard": 0,
        "analysis_chart": 0,
        "text_query": 0,
        "interpretive": 0,
        "other": 0,
    }

    import json as _json

    def _parse_payload(payload) -> dict:
        """Parse result_payload, handling both dict and JSON string (SQLite)."""
        if isinstance(payload, dict):
            return payload
        if isinstance(payload, str):
            try:
                parsed = _json.loads(payload)
                if isinstance(parsed, dict):
                    return parsed
            except (ValueError, TypeError):
                pass
        return {}

    # Track dashboard_page records per dataset_id to avoid counting duplicates
    seen_dashboard_datasets: set = set()

    for row in analysis_results:
        parsed = _parse_payload(row.result_payload)
        payload_type = str(parsed.get("type") or "analysis_chart")
        payload_source = parsed.get("source", "")

        if payload_type == "dashboard":
            # For dashboard_page auto-tracking records, count once per dataset
            if payload_source == "dashboard_page":
                ds_id = parsed.get("dataset_id", "")
                if ds_id in seen_dashboard_datasets:
                    continue
                seen_dashboard_datasets.add(ds_id)
            analysis_type_counts["dashboard"] += 1
        elif payload_type == "text_query":
            analysis_type_counts["text_query"] += 1
        elif payload_type == "interpretive":
            analysis_type_counts["interpretive"] += 1
        elif payload_type in ("analysis_chart", "analysis", "visualization"):
            analysis_type_counts["analysis_chart"] += 1
        else:
            analysis_type_counts["other"] += 1


    # Pre-populate last 12 months so inactive months still appear in output.
    now = datetime.now(timezone.utc)
    month_keys = []
    for offset in range(11, -1, -1):
        total_months = (now.year * 12 + (now.month - 1)) - offset
        year = total_months // 12
        month = (total_months % 12) + 1
        month_keys.append(_month_key(datetime(year, month, 1, tzinfo=timezone.utc)))

    monthly = {
        key: {
            "datasets": 0,
            "uploads": 0,
            "saved_dashboards": 0,
            "generated_dashboards": 0,
            "chats": 0,
            "analyses": 0,
        }
        for key in month_keys
    }

    for row in datasets:
        key = _month_key(row.created_at)
        if key in monthly:
            monthly[key]["datasets"] += 1
    for row in uploads:
        key = _month_key(row.created_at)
        if key in monthly:
            monthly[key]["uploads"] += 1
    for row in dashboards:
        key = _month_key(row.created_at)
        if key in monthly:
            monthly[key]["saved_dashboards"] += 1
    for row in chat_sessions:
        key = _month_key(row.created_at)
        if key in monthly:
            monthly[key]["chats"] += 1
    for row in analysis_results:
        key = _month_key(row.generated_at)
        if key in monthly:
            monthly[key]["analyses"] += 1
            parsed = _parse_payload(row.result_payload)
            if str(parsed.get("type")) == "dashboard":
                monthly[key]["generated_dashboards"] += 1

    monthly_activity = [
        {
            "month": k,
            **monthly[k],
        }
        for k in month_keys
    ]

    totals = {
        "total_datasets": len(datasets),
        "total_uploads": len(uploads),
        "total_dashboards_generated": analysis_type_counts["dashboard"],
        "total_saved_dashboards": len(dashboards),
        "total_chat_sessions": len(chat_sessions),
        "total_chat_messages": len(chat_messages),
        "total_analyses": len(analysis_results),
        "total_analysis_contracts": len(analysis_contracts),
        "total_cleaning_plans": len(cleaning_plans),
        "total_inspection_reports": len(inspections),
    }

    feature_usage = [
        {"feature": "Datasets", "count": totals["total_datasets"]},
        {"feature": "Uploads", "count": totals["total_uploads"]},
        {"feature": "Dashboards Generated", "count": totals["total_dashboards_generated"]},
        {"feature": "Dashboards", "count": totals["total_saved_dashboards"]},
        {"feature": "Chat Sessions", "count": totals["total_chat_sessions"]},
        {"feature": "Analyses", "count": totals["total_analyses"]},
        {"feature": "Cleaning Plans", "count": totals["total_cleaning_plans"]},
    ]

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.created_at,
        },
        "totals": totals,
        "feature_usage": feature_usage,
        "analysis_type_counts": analysis_type_counts,
        "monthly_activity": monthly_activity,
        "dataset_sources": source_counts,
    }
