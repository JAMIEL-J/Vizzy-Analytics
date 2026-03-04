"""
Saved dashboard model.

Belongs to: models layer
Responsibility: Stores user-saved dashboard configurations
Restrictions: No business logic, data contract only
"""

from typing import Optional
from uuid import UUID

from sqlmodel import Field, Column, JSON

from .base import BaseModel


class SavedDashboard(BaseModel, table=True):
    """
    Saved dashboard model.
    
    Allows users to save and name their dashboard configurations
    for quick access later.
    """

    __tablename__ = "saved_dashboards"

    # Owner of this dashboard
    user_id: UUID = Field(nullable=False, index=True)

    # Associated dataset (optional - dashboards can be templates)
    dataset_id: Optional[UUID] = Field(default=None, nullable=True, index=True)
    dataset_version_id: Optional[UUID] = Field(default=None, nullable=True)

    # Dashboard metadata
    name: str = Field(max_length=255, nullable=False)
    description: Optional[str] = Field(default=None, max_length=1000)

    # Dashboard configuration (widget layout, chart specs)
    config: dict = Field(default_factory=dict, sa_column=Column(JSON))

    # Public/private flag
    is_public: bool = Field(default=False, nullable=False)
