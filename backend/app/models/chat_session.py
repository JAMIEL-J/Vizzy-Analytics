"""
Chat session model.

Belongs to: models layer
Responsibility: Represents a conversation session between user and AI
Restrictions: No business logic, data contract only
"""

from typing import Optional
from uuid import UUID

from sqlmodel import Field, Relationship

from .base import BaseModel


class ChatSession(BaseModel, table=True):
    """
    Chat session model.
    
    A session represents a conversation context for a specific user,
    optionally tied to a dataset for data-aware conversations.
    """

    __tablename__ = "chat_sessions"

    # Owner of this session
    user_id: UUID = Field(nullable=False, index=True)

    # Optional dataset context
    dataset_id: Optional[UUID] = Field(default=None, nullable=True, index=True)
    dataset_version_id: Optional[UUID] = Field(default=None, nullable=True)

    # Session metadata
    title: str = Field(default="New Conversation", max_length=255)
    
    # Session state
    is_active: bool = Field(default=True, nullable=False)
    message_count: int = Field(default=0, nullable=False)

    # Last activity tracking (for cleanup)
    # Note: created_at and updated_at inherited from BaseModel
