"""
Chat message model.

Belongs to: models layer
Responsibility: Stores individual messages in a chat session
Restrictions: No business logic, data contract only
"""

from typing import Optional, Literal
from uuid import UUID
from enum import Enum

from sqlmodel import Field, Column, JSON

from .base import BaseModel


class MessageRole(str, Enum):
    """Role of the message sender."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ChatMessage(BaseModel, table=True):
    """
    Chat message model.
    
    Stores each message in a conversation with its role,
    content, and any associated metadata (charts, results).
    """

    __tablename__ = "chat_messages"

    # Parent session
    session_id: UUID = Field(nullable=False, index=True, foreign_key="chat_sessions.id")

    # Message content
    role: MessageRole = Field(nullable=False)
    content: str = Field(nullable=False)

    # For assistant messages: structured output
    # Contains chart specs, dashboard data, or analysis results
    output_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    # Intent classification result (for assistant messages)
    intent_type: Optional[str] = Field(default=None, max_length=50)

    # Sequence number within session
    sequence: int = Field(default=0, nullable=False)
