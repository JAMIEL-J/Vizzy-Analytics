"""
Base database model.

Belongs to: models layer
Responsibility: Base model definition only
Restrictions: No business logic, no domain fields, no relationships
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class BaseModel(SQLModel):
    __abstract__ = True

    """Abstract base model with common fields."""

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
    )

    class Config:
        """SQLModel configuration."""

        from_attributes = True
