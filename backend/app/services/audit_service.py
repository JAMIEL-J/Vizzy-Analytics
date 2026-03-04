"""
Audit service for querying and filtering audit events.

Belongs to: services layer
Responsibility: Business logic for audit queries
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from app.core.audit import get_audit_store, AuditEvent


def get_all_audit_events() -> List[Dict[str, Any]]:
    """
    Get all audit events.
    
    Returns:
        List of audit events as dictionaries
    """
    store = get_audit_store()
    events = store.get_all()
    return [event.model_dump() for event in events]


def get_user_audit_events(user_id: UUID) -> List[Dict[str, Any]]:
    """
    Get all audit events for a specific user.
    
    Args:
        user_id: User UUID
    
    Returns:
        List of audit events for the user
    """
    store = get_audit_store()
    events = store.get_by_user(str(user_id))
    return [event.model_dump() for event in events]


def get_resource_audit_events(
    resource_type: str,
    resource_id: UUID,
) -> List[Dict[str, Any]]:
    """
    Get all audit events for a specific resource.
    
    Args:
        resource_type: Type of resource (e.g., "Dataset", "User")
        resource_id: Resource UUID
    
    Returns:
        List of audit events for the resource
    """
    store = get_audit_store()
    events = store.get_by_resource(resource_type, str(resource_id))
    return [event.model_dump() for event in events]


def get_filtered_audit_events(
    event_type: Optional[str] = None,
    user_id: Optional[UUID] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[UUID] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    """
    Get filtered audit events based on multiple criteria.
    
    Args:
        event_type: Filter by event type
        user_id: Filter by user
        resource_type: Filter by resource type
        resource_id: Filter by resource ID
        start_time: Filter events after this time
        end_time: Filter events before this time
        limit: Maximum number of events to return
    
    Returns:
        Filtered list of audit events
    """
    store = get_audit_store()
    events = store.get_all()
    
    # Apply filters
    filtered = events
    
    if event_type:
        filtered = [e for e in filtered if e.event_type == event_type]
    
    if user_id:
        filtered = [e for e in filtered if e.user_id == str(user_id)]
    
    if resource_type:
        filtered = [e for e in filtered if e.resource_type == resource_type]
    
    if resource_id:
        filtered = [e for e in filtered if e.resource_id == str(resource_id)]
    
    if start_time:
        filtered = [e for e in filtered if e.timestamp >= start_time]
    
    if end_time:
        filtered = [e for e in filtered if e.timestamp <= end_time]
    
    # Sort by timestamp (newest first)
    filtered.sort(key=lambda e: e.timestamp, reverse=True)
    
    # Apply limit
    filtered = filtered[:limit]
    
    return [event.model_dump() for event in filtered]


def get_audit_stats() -> Dict[str, Any]:
    """
    Get audit statistics.
    
    Returns:
        Statistics about audit events
    """
    store = get_audit_store()
    events = store.get_all()
    
    if not events:
        return {
            "total_events": 0,
            "event_types": {},
            "resource_types": {},
            "unique_users": 0,
        }
    
    # Count by event type
    event_types: Dict[str, int] = {}
    for event in events:
        event_types[event.event_type] = event_types.get(event.event_type, 0) + 1
    
    # Count by resource type
    resource_types: Dict[str, int] = {}
    for event in events:
        if event.resource_type:
            resource_types[event.resource_type] = resource_types.get(event.resource_type, 0) + 1
    
    # Unique users
    unique_users = len(set(e.user_id for e in events))
    
    return {
        "total_events": len(events),
        "event_types": event_types,
        "resource_types": resource_types,
        "unique_users": unique_users,
        "oldest_event": min(e.timestamp for e in events).isoformat(),
        "newest_event": max(e.timestamp for e in events).isoformat(),
    }


def get_recent_events(limit: int = 50) -> List[Dict[str, Any]]:
    """
    Get most recent audit events.
    
    Args:
        limit: Maximum number of events
    
    Returns:
        Recent audit events
    """
    store = get_audit_store()
    events = store.get_all()
    
    # Sort by timestamp (newest first)
    events.sort(key=lambda e: e.timestamp, reverse=True)
    
    return [event.model_dump() for event in events[:limit]]
