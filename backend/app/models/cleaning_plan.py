"""
Cleaning plan database model.

Belongs to: models layer
Responsibility: Cleaning plan data contract only
Restrictions: No execution logic, no business logic, no API concerns
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import UUID

from sqlmodel import Field, Column
from sqlalchemy import JSON

from .base import BaseModel


class CleaningPlan(BaseModel, table=True):
    """Cleaning plan for a dataset version. Immutable once approved."""

    __tablename__ = "cleaning_plans"

    dataset_version_id: UUID = Field(nullable=False, index=True)
    proposed_actions: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
    )
    approved: bool = Field(default=False, nullable=False)
    approved_by: Optional[UUID] = Field(default=None, nullable=True)
    approved_at: Optional[datetime] = Field(default=None, nullable=True)
    is_active: bool = Field(default=True, nullable=False)
