"""
Analysis result database model.

Belongs to: models layer
Responsibility: Analysis result data contract only
Restrictions: No execution logic, no analytics logic, no LLM logic, no API concerns
"""

from datetime import datetime, timezone
from typing import Any, Dict
from uuid import UUID

from sqlmodel import Field, Column
from sqlalchemy import JSON

from .base import BaseModel


class AnalysisResult(BaseModel, table=True):
    """Immutable analysis result tied to data version and contract."""

    __tablename__ = "analysis_results"

    dataset_version_id: UUID = Field(nullable=False, index=True)
    analysis_contract_id: UUID = Field(nullable=False, index=True)
    result_payload: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
    )
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    generated_by: UUID = Field(nullable=False)
    is_active: bool = Field(default=True, nullable=False)
