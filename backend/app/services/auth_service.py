import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.organization import Organization
from app.models.organization_member import OrganizationMember, Role
from app.models.user import User
from app.schemas.auth import RegisterRequest


def register_user(db: Session, request: RegisterRequest) -> dict:
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=request.email,
        hashed_password=hash_password(request.password),
        full_name=request.full_name,
    )
    db.add(user)
    db.flush()

    org_slug = _generate_slug(request.full_name)
    organization = Organization(name=f"{request.full_name}'s Organization", slug=org_slug)
    db.add(organization)
    db.flush()

    membership = OrganizationMember(
        user_id=user.id,
        organization_id=organization.id,
        role=Role.ADMIN,
    )
    db.add(membership)
    db.commit()
    db.refresh(user)

    token = create_access_token(
        data={"sub": str(user.id), "org_id": str(organization.id), "role": Role.ADMIN.value}
    )

    return {"access_token": token, "token_type": "bearer"}


def authenticate_user(db: Session, email: str, password: str) -> dict:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    membership = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.user_id == user.id)
        .first()
    )
    org_id = str(membership.organization_id) if membership else ""
    role = membership.role.value if membership else Role.MEMBER.value

    token = create_access_token(
        data={"sub": str(user.id), "org_id": org_id, "role": role}
    )

    return {"access_token": token, "token_type": "bearer"}


def _generate_slug(name: str) -> str:
    base = name.lower().replace(" ", "-").replace("'", "")
    suffix = uuid.uuid4().hex[:6]
    return f"{base}-{suffix}"
