"""
Database engine and session management.

Belongs to: models layer
Responsibility: SQLAlchemy engine, session factory, connection pooling
Restrictions: No business logic, no API concerns
"""

from pathlib import Path
from sqlmodel import SQLModel, Session, create_engine
from typing import Generator

from app.core.config import get_settings


# Get settings
settings = get_settings()

# Ensure data directory exists for SQLite
if settings.database.is_sqlite:
    db_path = Path(settings.database.sqlite_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)

# Create engine - different config for SQLite vs PostgreSQL
if settings.database.is_sqlite:
    engine = create_engine(
        settings.database.url,
        echo=settings.database.echo,
        connect_args={"check_same_thread": False},  # Required for SQLite + FastAPI
    )
else:
    engine = create_engine(
        settings.database.url,
        echo=settings.database.echo,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )


def init_db() -> None:
    """
    Initialize database tables.
    
    Call this on application startup to create all tables.
    In production, use Alembic migrations instead.
    """
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """
    Provide a database session.
    
    Used as a FastAPI dependency.
    Session is automatically closed after request.
    """
    with Session(engine) as session:
        yield session
