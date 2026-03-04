"""
Vizzy Analytics Platform API

A production-grade, trust-first analytics system.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.logger import get_logger
from app.core.exceptions import (
    VizzyException,
    AuthenticationError,
    AuthorizationError,
    ResourceNotFound,
    InvalidOperation,
)
from app.api.router import api_router


logger = get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Initialize database tables
    from app.models.database import init_db
    init_db()
    logger.info("Database tables initialized")
    
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Environment: {settings.environment}")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Production-grade, trust-first analytics platform",
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    lifespan=lifespan,
)


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ] if settings.is_development else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(AuthenticationError)
async def authentication_error_handler(request: Request, exc: AuthenticationError):
    return JSONResponse(
        status_code=401,
        content={"detail": exc.message},
    )


@app.exception_handler(AuthorizationError)
async def authorization_error_handler(request: Request, exc: AuthorizationError):
    return JSONResponse(
        status_code=403,
        content={"detail": exc.message},
    )


@app.exception_handler(ResourceNotFound)
async def not_found_handler(request: Request, exc: ResourceNotFound):
    return JSONResponse(
        status_code=404,
        content={"detail": exc.message},
    )


@app.exception_handler(InvalidOperation)
async def invalid_operation_handler(request: Request, exc: InvalidOperation):
    return JSONResponse(
        status_code=400,
        content={"detail": exc.message, "reason": exc.reason},
    )


@app.exception_handler(VizzyException)
async def app_exception_handler(request: Request, exc: VizzyException):
    return JSONResponse(
        status_code=500,
        content={"detail": exc.message},
    )


# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "app": settings.app_name}


# Include API router
app.include_router(api_router, prefix=settings.api_prefix)
