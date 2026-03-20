from fastapi import APIRouter, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field

from app.api.deps import DBSession
from app.services.user_services import get_user_by_email, create_user
from app.models.user import UserRole
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_token,
    hash_password,
    verify_password,
    UserRole as SecurityUserRole,
)
from app.core.audit import record_audit_event


router = APIRouter()


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    message: str


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def register(
    request: RegisterRequest,
    session: DBSession,
) -> MessageResponse:
    """
    Register a new user (PUBLIC - no auth required).
    """
    # Check if user exists
    existing = get_user_by_email(session, request.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    # Create user
    hashed = hash_password(request.password)
    user = create_user(
        session=session,
        email=request.email,
        hashed_password=hashed,
        name=request.name,
        role=UserRole.USER,
    )

    record_audit_event(
        event_type="USER_REGISTERED",
        user_id=str(user.id),
        metadata={"email": request.email, "name": request.name},
    )

    return MessageResponse(message="Registration successful")


@router.post("/login", response_model=TokenResponse)
def login(
    request: LoginRequest,
    session: DBSession,
) -> TokenResponse:
    """
    Authenticate user and issue tokens (PUBLIC - no auth required).
    This is the generic login endpoint. Consider using /login/user or /login/admin.
    """
    user = get_user_by_email(session, request.email)

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    access_token = create_access_token(
        user_id=str(user.id),
        role=SecurityUserRole(user.role.value),
    )

    refresh_token = create_refresh_token(
        user_id=str(user.id),
        role=SecurityUserRole(user.role.value),
    )

    record_audit_event(
        event_type="USER_LOGIN",
        user_id=str(user.id),
        metadata={"email": user.email},
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/login/user", response_model=TokenResponse)
def login_user(
    request: LoginRequest,
    session: DBSession,
) -> TokenResponse:
    """
    Authenticate a standard user and issue tokens (PUBLIC - no auth required).
    Only allows users with role USER.
    """
    user = get_user_by_email(session, request.email)

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # Check role - must be USER
    if user.role != UserRole.USER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. This login is for standard users only.",
        )

    access_token = create_access_token(
        user_id=str(user.id),
        role=SecurityUserRole(user.role.value),
    )

    refresh_token = create_refresh_token(
        user_id=str(user.id),
        role=SecurityUserRole(user.role.value),
    )

    record_audit_event(
        event_type="USER_LOGIN",
        user_id=str(user.id),
        metadata={"email": user.email, "login_type": "user"},
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/login/admin", response_model=TokenResponse)
def login_admin(
    request: LoginRequest,
    session: DBSession,
) -> TokenResponse:
    """
    Authenticate an admin user and issue tokens (PUBLIC - no auth required).
    Only allows users with role ADMIN.
    """
    user = get_user_by_email(session, request.email)

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # Check role - must be ADMIN
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. This login is for administrators only.",
        )

    access_token = create_access_token(
        user_id=str(user.id),
        role=SecurityUserRole(user.role.value),
    )

    refresh_token = create_refresh_token(
        user_id=str(user.id),
        role=SecurityUserRole(user.role.value),
    )

    record_audit_event(
        event_type="ADMIN_LOGIN",
        user_id=str(user.id),
        metadata={"email": user.email, "login_type": "admin"},
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh_token_endpoint(
    request: RefreshRequest,
) -> AccessTokenResponse:
    """
    Issue a new access token using a refresh token.
    """
    try:
        token_data = verify_token(request.refresh_token, token_type="refresh")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    access_token = create_access_token(
        user_id=token_data.user_id,
        role=token_data.role,
    )

    record_audit_event(
        event_type="TOKEN_REFRESHED",
        user_id=token_data.user_id,
    )

    return AccessTokenResponse(access_token=access_token)
