"""
Analysis contract database model.

Belongs to: models layer
Responsibility: Analysis contract data contract only
Restrictions: No execution logic, no query logic, no LLM logic, no API concerns
"""

from typing import Any, Dict, Optional
from uuid import UUID

from sqlmodel import Field, Column
from sqlalchemy import JSON

from .base import BaseModel


class AnalysisContract(BaseModel, table=True):
    """Analysis contract restricting allowed analyses for a dataset version."""

    __tablename__ = "analysis_contracts"

    dataset_version_id: UUID = Field(nullable=False, index=True)
    allowed_metrics: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
    )
    allowed_dimensions: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
    )
    time_granularity: Optional[str] = Field(default=None, nullable=True)
    constraints: Optional[Dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON, nullable=True),
    )
    is_active: bool = Field(default=True, nullable=False)
