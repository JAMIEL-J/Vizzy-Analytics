"""
Database engine and session management.

Belongs to: models layer
Responsibility: SQLAlchemy engine, session factory, connection pooling
Restrictions: No business logic, no API concerns
"""

from pathlib import Path
from sqlmodel import SQLModel, Session, create_engine
from typing import Generator
from sqlalchemy import inspect, text

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
    _ensure_users_name_column()


def _ensure_users_name_column() -> None:
    """Best-effort schema patch for legacy DBs missing users.name."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    columns = {col["name"] for col in inspector.get_columns("users")}
    if "name" in columns:
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN name VARCHAR(120)"))

        if settings.database.is_sqlite:
            conn.execute(
                text(
                    """
                    UPDATE users
                    SET name = CASE
                        WHEN instr(email, '@') > 0 THEN substr(email, 1, instr(email, '@') - 1)
                        ELSE email
                    END
                    WHERE name IS NULL
                    """
                )
            )
        else:
            conn.execute(
                text(
                    """
                    UPDATE users
                    SET name = CASE
                        WHEN position('@' in email) > 0 THEN split_part(email, '@', 1)
                        ELSE email
                    END
                    WHERE name IS NULL
                    """
                )
            )


def get_session() -> Generator[Session, None, None]:
    """
    Provide a database session.
    
    Used as a FastAPI dependency.
    Session is automatically closed after request.
    """
    with Session(engine) as session:
        yield session
