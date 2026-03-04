"""
Seed script to create a default admin user.

Run with: python scripts/seed_admin.py
"""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session

from app.models.database import engine
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.services.user_services import get_user_by_email


# Default admin credentials
ADMIN_EMAIL = "admin@vizzy.com"
ADMIN_PASSWORD = "Admin@123"


def seed_admin():
    """Create a default admin user if it doesn't exist."""
    with Session(engine) as session:
        # Check if admin already exists
        existing_admin = get_user_by_email(session, ADMIN_EMAIL)
        
        if existing_admin:
            print(f"Admin user already exists: {ADMIN_EMAIL}")
            return
        
        # Create admin user
        admin_user = User(
            email=ADMIN_EMAIL,
            hashed_password=hash_password(ADMIN_PASSWORD),
            role=UserRole.ADMIN,
            is_active=True,
        )
        
        session.add(admin_user)
        session.commit()
        session.refresh(admin_user)
        
        print("=" * 50)
        print("Default Admin User Created!")
        print("=" * 50)
        print(f"Email:    {ADMIN_EMAIL}")
        print(f"Password: {ADMIN_PASSWORD}")
        print("=" * 50)
        print("IMPORTANT: Change these credentials in production!")
        print("=" * 50)


if __name__ == "__main__":
    seed_admin()
