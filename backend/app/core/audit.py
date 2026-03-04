"""
Audit event recording module.

Belongs to: core layer
Responsibility: Audit event storage only
Restrictions: No business logic, no auth, no datasets, no analytics
"""

from datetime import datetime, timezone
from threading import Lock
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AuditEvent(BaseModel):
    """Immutable audit event record."""

    event_type: str
    user_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class AuditStore:
    """Append-only audit event store."""

    def __init__(self) -> None:
        self._events: List[AuditEvent] = []
        self._lock = Lock()

    def append(self, event: AuditEvent) -> None:
        """Append event to store. Never raises."""
        with self._lock:
            self._events.append(event)

    def get_all(self) -> List[AuditEvent]:
        """Return copy of all events."""
        with self._lock:
            return list(self._events)

    def get_by_user(self, user_id: str) -> List[AuditEvent]:
        """Return events for a specific user."""
        with self._lock:
            return [e for e in self._events if e.user_id == user_id]

    def get_by_resource(
        self,
        resource_type: str,
        resource_id: str,
    ) -> List[AuditEvent]:
        """Return events for a specific resource."""
        with self._lock:
            return [
                e for e in self._events
                if e.resource_type == resource_type and e.resource_id == resource_id
            ]

    def count(self) -> int:
        """Return total event count."""
        with self._lock:
            return len(self._events)


_store = AuditStore()


def get_audit_store() -> AuditStore:
    """Get the audit store instance."""
    return _store


def record_audit_event(
    event_type: str,
    user_id: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Record an audit event. Never raises exceptions.
    Execution continues regardless of success or failure.
    """
    try:
        event = AuditEvent(
            event_type=event_type,
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata=metadata,
        )
        store = get_audit_store()
        store.append(event)
    except Exception:
        pass
