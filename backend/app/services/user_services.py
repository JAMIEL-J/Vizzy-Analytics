from typing import Optional
from uuid import UUID

from sqlmodel import Session, select

from app.models.user import User, UserRole
from app.core.exceptions import InvalidOperation, ResourceNotFound
from app.core.audit import record_audit_event


def create_user(
    session: Session,
    email: str,
    hashed_password: str,
    role: UserRole = UserRole.USER,
) -> User:
    """
    Create a new user.

    Assumes password is already hashed.
    """
    existing = session.exec(
        select(User).where(User.email == email)
    ).first()

    if existing:
        raise InvalidOperation(
            operation="create_user",
            reason="User with this email already exists",
        )

    user = User(
        email=email,
        hashed_password=hashed_password,
        role=role,
        is_active=True,
    )

    session.add(user)
    session.commit()
    session.refresh(user)

    record_audit_event(
        event_type="USER_CREATED",
        user_id=str(user.id),
        metadata={"email": email, "role": role.value},
    )

    return user


def get_user_by_email(
    session: Session,
    email: str,
) -> Optional[User]:
    """
    Fetch a user by email.
    """
    return session.exec(
        select(User).where(User.email == email)
    ).first()


def activate_user(
    session: Session,
    user_id: UUID,
) -> User:
    """
    Activate a user account.
    """
    user = session.get(User, user_id)
    if not user:
        raise ResourceNotFound("User", str(user_id))

    if user.is_active:
        return user

    user.is_active = True
    session.add(user)
    session.commit()
    session.refresh(user)

    record_audit_event(
        event_type="USER_ACTIVATED",
        user_id=str(user.id),
    )

    return user


def deactivate_user(
    session: Session,
    user_id: UUID,
) -> User:
    """
    Deactivate a user account.
    """
    user = session.get(User, user_id)
    if not user:
        raise ResourceNotFound("User", str(user_id))

    if not user.is_active:
        return user

    user.is_active = False
    session.add(user)
    session.commit()
    session.refresh(user)

    record_audit_event(
        event_type="USER_DEACTIVATED",
        user_id=str(user.id),
    )

    return user


def get_user_by_id(
    session: Session,
    user_id: UUID,
) -> User:
    """
    Fetch a user by ID.

    Raises ResourceNotFound if user does not exist.
    """
    user = session.get(User, user_id)
    if not user:
        raise ResourceNotFound("User", str(user_id))
    return user


def list_users(
    session: Session,
    skip: int = 0,
    limit: int = 100,
    include_inactive: bool = False,
) -> tuple[list[User], int]:
    """
    List users with pagination.

    Returns tuple of (users, total_count).
    """
    from sqlmodel import func

    # Base query
    query = select(User)

    # Filter inactive if needed
    if not include_inactive:
        query = query.where(User.is_active == True)

    # Get total count
    count_query = select(func.count()).select_from(User)
    if not include_inactive:
        count_query = count_query.where(User.is_active == True)
    total = session.exec(count_query).one()

    # Apply pagination
    query = query.offset(skip).limit(limit)
    users = list(session.exec(query).all())

    return users, total


def delete_user(
    session: Session,
    user_id: UUID,
) -> None:
    """
    Permanently delete a user.

    This is a hard delete - use deactivate_user for soft deletion.
    """
    user = session.get(User, user_id)
    if not user:
        raise ResourceNotFound("User", str(user_id))

    # Record audit before deletion
    record_audit_event(
        event_type="USER_DELETED",
        user_id=str(user.id),
        metadata={"email": user.email},
    )

    session.delete(user)
    session.commit()
