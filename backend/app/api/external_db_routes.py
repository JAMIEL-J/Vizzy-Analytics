"""
External database connection routes.

Allows users to:
1. Test database connections
2. List available tables
3. Ingest data from external databases
"""

from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Body
from pydantic import BaseModel, SecretStr
from typing import Optional, List

from app.api.deps import DBSession, RateLimitedUser
from app.services.ingestion_execution.external_db import (
    DatabaseConnection,
    test_database_connection,
    create_external_engine,
)
from app.services.ingestion_service import ingest_sql_query
from app.core.exceptions import InvalidOperation, ResourceNotFound
from sqlalchemy import text, inspect


router = APIRouter()


# Request/Response Models
class TestConnectionRequest(BaseModel):
    """Test database connection request."""
    type: str
    host: Optional[str] = None
    port: Optional[int] = None
    database: str
    username: Optional[str] = None
    password: Optional[SecretStr] = None
    file_path: Optional[str] = None
    ssl_mode: Optional[str] = None


class TestConnectionResponse(BaseModel):
    """Test connection response."""
    status: str
    message: str
    database_version: Optional[str] = None
    details: Optional[str] = None


class ListTablesRequest(BaseModel):
    """List database tables request."""
    type: str
    host: Optional[str] = None
    port: Optional[int] = None
    database: str
    username: Optional[str] = None
    password: Optional[SecretStr] = None
    file_path: Optional[str] = None


class IngestFromExternalDBRequest(BaseModel):
    """Ingest from external database request."""
    connection: TestConnectionRequest
    query: str


@router.post(
    "/external-db/test",
    response_model=TestConnectionResponse,
    status_code=status.HTTP_200_OK,
)
def test_external_database_connection(
    request: TestConnectionRequest,
    current_user: RateLimitedUser,
):
    """
    Test connection to external database.
    
    Supports:
    - PostgreSQL
    - MySQL
    - Microsoft SQL Server
    - SQLite
    """
    config = DatabaseConnection(**request.model_dump())
    result = test_database_connection(config)
    return result


@router.post(
    "/external-db/tables",
    response_model=List[str],
    status_code=status.HTTP_200_OK,
)
def list_external_database_tables(
    request: ListTablesRequest,
    current_user: RateLimitedUser,
):
    """
    List all tables in external database.
    """
    try:
        config = DatabaseConnection(**request.model_dump())
        engine = create_external_engine(config)
        
        # Get table names using SQLAlchemy inspector
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        engine.dispose()
        
        return tables
        
    except InvalidOperation as e:
        raise HTTPException(status_code=400, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/datasets/{dataset_id}/external-db/ingest",
    status_code=status.HTTP_201_CREATED,
)
def ingest_from_external_database(
    dataset_id: UUID,
    request: IngestFromExternalDBRequest,
    session: DBSession,
    current_user: RateLimitedUser,
):
    """
    Ingest data from external database into dataset.
    
    Steps:
    1. Connects to external database
    2. Executes SELECT query
    3. Ingests results into dataset
    4. Creates new dataset version
    """
    try:
        # Create external database connection
        config = DatabaseConnection(**request.connection.model_dump())
        external_engine = create_external_engine(config)
        
        # Ingest using the external engine
        result = ingest_sql_query(
            session=session,
            dataset_id=dataset_id,
            user_id=UUID(current_user.user_id),
            role=current_user.role,
            query=request.query,
            external_engine=external_engine,
        )
        
        # Cleanup
        external_engine.dispose()
        
        return result
        
    except ResourceNotFound as e:
        raise HTTPException(status_code=404, detail=e.message)
    except InvalidOperation as e:
        raise HTTPException(status_code=400, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
