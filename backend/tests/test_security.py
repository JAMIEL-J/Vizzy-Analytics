"""
Unit Tests for Security Module

Tests: core/security.py

This module is responsible for:
- Password hashing (bcrypt)
- Password verification
- JWT token creation (access + refresh)
- Token verification and decoding
- Role-based access control
"""

import pytest
from datetime import timedelta


class TestPasswordHashing:
    """Tests for password hashing functionality."""

    def test_hash_password_returns_hash(self):
        """
        TEST: hash_password returns a bcrypt hash.
        
        ARCHITECTURE NOTE:
        - Uses passlib with bcrypt scheme
        - Hash is stored in User.hashed_password
        """
        from app.core.security import hash_password
        
        password = "secret123"
        hashed = hash_password(password)
        
        assert hashed != password
        assert hashed.startswith("$2b$")  # bcrypt prefix

    def test_hash_password_different_each_time(self):
        """
        TEST: Same password produces different hashes (salt).
        
        ARCHITECTURE NOTE:
        - bcrypt uses random salt per hash
        - Prevents rainbow table attacks
        """
        from app.core.security import hash_password
        
        password = "secret123"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        
        assert hash1 != hash2  # Different salts

    def test_verify_password_correct(self):
        """
        TEST: verify_password returns True for correct password.
        
        ARCHITECTURE NOTE:
        - Used during login (auth_routes.py)
        - Compares plaintext with stored hash
        """
        from app.core.security import hash_password, verify_password
        
        password = "secret123"
        hashed = hash_password(password)
        
        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """TEST: verify_password returns False for wrong password."""
        from app.core.security import hash_password, verify_password
        
        hashed = hash_password("correct_password")
        
        assert verify_password("wrong_password", hashed) is False


class TestJWTTokens:
    """Tests for JWT token functionality."""

    def test_create_access_token(self):
        """
        TEST: Access token is created successfully.
        
        ARCHITECTURE NOTE:
        - Token contains: user_id, role, exp (expiry)
        - Default expiry: 30 minutes (configurable)
        """
        from app.core.security import create_access_token, UserRole
        
        token = create_access_token(
            user_id="user-123",
            role=UserRole.USER,
        )
        
        assert token is not None
        assert len(token) > 50  # JWT is long

    def test_create_refresh_token(self):
        """
        TEST: Refresh token is created successfully.
        
        ARCHITECTURE NOTE:
        - Longer expiry than access token (7 days default)
        - Used to get new access tokens
        """
        from app.core.security import create_refresh_token, UserRole
        
        token = create_refresh_token(
            user_id="user-123",
            role=UserRole.USER,
        )
        
        assert token is not None

    def test_verify_valid_token(self):
        """
        TEST: Valid token is decoded correctly.
        
        ARCHITECTURE NOTE:
        - Returns TokenData with user_id, role, exp
        - Used by get_current_user dependency
        """
        from app.core.security import create_access_token, verify_token, UserRole
        
        token = create_access_token(
            user_id="user-123",
            role=UserRole.USER,
        )
        
        token_data = verify_token(token)
        
        assert token_data.user_id == "user-123"
        assert token_data.role == UserRole.USER


class TestUserRoles:
    """Tests for role-based access control."""

    def test_user_role_enum_values(self):
        """
        TEST: UserRole enum has expected values.
        
        ARCHITECTURE NOTE:
        - USER: Standard user, owns their datasets
        - ADMIN: Full access, can see all datasets
        """
        from app.core.security import UserRole
        
        assert UserRole.USER.value == "user"
        assert UserRole.ADMIN.value == "admin"

    def test_current_user_model(self):
        """
        TEST: CurrentUser model stores auth context.
        
        ARCHITECTURE NOTE:
        - Injected via FastAPI dependency
        - Available in all protected routes
        """
        from app.core.security import CurrentUser, UserRole
        
        user = CurrentUser(
            user_id="user-123",
            role=UserRole.ADMIN,
        )
        
        assert user.user_id == "user-123"
        assert user.role == UserRole.ADMIN
