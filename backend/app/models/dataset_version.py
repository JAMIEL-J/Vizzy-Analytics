from enum import Enum
from typing import Optional
from uuid import UUID

from sqlmodel import Field

from .base import BaseModel


class SourceType(str, Enum):
    UPLOAD = "upload"
    SQL = "sql"


class DatasetVersion(BaseModel, table=True):
    __tablename__ = "dataset_versions"

    dataset_id: UUID = Field(nullable=False, index=True)
    version_number: int = Field(nullable=False)

    source_type: SourceType = Field(nullable=False)

    # RAW DATA location (csv saved on disk)
    source_reference: str = Field(nullable=False)

    # CLEANED DATA location (csv saved on disk)
    cleaned_reference: Optional[str] = Field(default=None, nullable=True)

    row_count: Optional[int] = Field(default=None)
    schema_hash: str = Field(nullable=False)

    created_by: UUID = Field(nullable=False)
    is_active: bool = Field(default=True)
