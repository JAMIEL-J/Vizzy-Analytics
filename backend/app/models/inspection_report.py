"""
Inspection report database model.

Belongs to: models layer
Responsibility: Inspection report data contract only
Restrictions: No business logic, no cleaning logic, no API concerns
"""

from enum import Enum
from typing import Any, Dict
from uuid import UUID

from sqlmodel import Field, Column
from sqlalchemy import JSON

from .base import BaseModel


class RiskLevel(str, Enum):
    """Data risk level."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class InspectionReport(BaseModel, table=True):
    """Immutable inspection report for a dataset version."""

    __tablename__ = "inspection_reports"

    dataset_version_id: UUID = Field(nullable=False, index=True)
    issues_detected: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
    )
    risk_level: RiskLevel = Field(nullable=False)
    summary: str = Field(nullable=False)
    generated_by: str = Field(nullable=False)
    is_active: bool = Field(default=True, nullable=False)

