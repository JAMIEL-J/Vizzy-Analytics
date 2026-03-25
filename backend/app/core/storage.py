"""
Storage configuration module.

Provides paths for raw and cleaned data storage.
"""

from pathlib import Path
from uuid import UUID

from app.core.config import get_settings


def get_base_data_dir() -> Path:
    """Get base data directory from config."""
    settings = get_settings()
    return Path(settings.storage.data_dir)


def get_version_dir(dataset_id: UUID, version_id: UUID) -> Path:
    """Get directory for a specific version's data."""
    path = get_base_data_dir() / str(dataset_id) / str(version_id)
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_raw_data_path(dataset_id: UUID, version_id: UUID) -> Path:
    """Get path for raw data CSV."""
    return get_version_dir(dataset_id, version_id) / "raw.csv"


def get_cleaned_data_path(dataset_id: UUID, version_id: UUID) -> Path:
    """Get path for cleaned data CSV."""
    return get_version_dir(dataset_id, version_id) / "cleaned.csv"


def get_duckdb_path(dataset_id: UUID, version_id: UUID) -> Path:
    """Get path for DuckDB file (persistent analytical engine)."""
    return get_version_dir(dataset_id, version_id) / "data.duckdb"
