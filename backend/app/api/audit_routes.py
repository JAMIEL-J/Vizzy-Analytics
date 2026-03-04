from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, status, Query

from app.api.deps import DBSession, AdminUser
from app.services import audit_service
from pydantic import BaseModel


router = APIRouter()


# =========================
# Response Models
# =========================

class AuditEventResponse(BaseModel):
    event_type: str
    user_id: str
    timestamp: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    metadata: Optional[dict]


class AuditStatsResponse(BaseModel):
    total_events: int
    event_types: dict
    resource_types: dict
    unique_users: int
    oldest_event: Optional[str] = None
    newest_event: Optional[str] = None


# =========================
# Routes (ADMIN ONLY)
# =========================

@router.get(
    "/events",
    response_model=List[AuditEventResponse],
)
def list_all_events(
    current_user: AdminUser,
    limit: int = Query(default=100, ge=1, le=1000),
):
    """
    List all audit events with limit.
    Admin access only.
    """
    events = audit_service.get_recent_events(limit=limit)
    return events


@router.get(
    "/events/filter",
    response_model=List[AuditEventResponse],
)
def filter_events(
    current_user: AdminUser,
    event_type: Optional[str] = None,
    user_id: Optional[UUID] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[UUID] = None,
    limit: int = Query(default=100, ge=1, le=1000),
):
    """
    Filter audit events by multiple criteria.
    Admin access only.
    """
    events = audit_service.get_filtered_audit_events(
        event_type=event_type,
        user_id=user_id,
        resource_type=resource_type,
        resource_id=resource_id,
        limit=limit,
    )
    return events


@router.get(
    "/events/user/{user_id}",
    response_model=List[AuditEventResponse],
)
def list_events_for_user(
    user_id: UUID,
    current_user: AdminUser,
):
    """
    List audit events for a specific user.
    Admin access only.
    """
    events = audit_service.get_user_audit_events(user_id)
    return events


@router.get(
    "/events/resource/{resource_type}/{resource_id}",
    response_model=List[AuditEventResponse],
)
def list_events_for_resource(
    resource_type: str,
    resource_id: UUID,
    current_user: AdminUser,
):
    """
    List audit events for a specific resource.
    Admin access only.
    """
    events = audit_service.get_resource_audit_events(resource_type, resource_id)
    return events


@router.get(
    "/events/recent",
    response_model=List[AuditEventResponse],
)
def get_recent_events(
    current_user: AdminUser,
    limit: int = Query(default=50, ge=1, le=500),
):
    """
    Get most recent audit events.
    Admin access only.
    """
    events = audit_service.get_recent_events(limit=limit)
    return events


@router.get(
    "/stats",
    response_model=AuditStatsResponse,
)
def get_audit_statistics(
    current_user: AdminUser,
):
    """
    Get audit event statistics.
    Admin access only.
    """
    stats = audit_service.get_audit_stats()
    return stats
