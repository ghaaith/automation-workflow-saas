import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.billing import OrganizationSubscription, Plan, PlanTier, SubscriptionStatus
from app.models.organization import Organization
from app.models.organization_member import OrganizationMember, Role
from app.models.user import User
from app.schemas.organization import OrganizationCreate


def create_organization(db: Session, request: OrganizationCreate, user: User) -> Organization:
    slug = request.slug or _generate_slug(request.name)

    existing = db.query(Organization).filter(Organization.slug == slug).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Organization with this slug already exists",
        )

    organization = Organization(name=request.name, slug=slug)
    db.add(organization)
    db.flush()

    membership = OrganizationMember(
        user_id=user.id,
        organization_id=organization.id,
        role=Role.ADMIN,
    )
    db.add(membership)

    plan = db.query(Plan).filter(Plan.name == PlanTier.PRO).first()
    if plan:
        sub = OrganizationSubscription(
            organization_id=organization.id,
            plan_id=plan.id,
            status=SubscriptionStatus.ACTIVE,
        )
        db.add(sub)

    db.commit()
    db.refresh(organization)

    return organization


def get_current_organization(db: Session, user: User) -> Organization:
    membership = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.user_id == user.id)
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No organization found for user",
        )

    org = db.query(Organization).filter(Organization.id == membership.organization_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )
    return org


def _generate_slug(name: str) -> str:
    base = name.lower().replace(" ", "-").replace("'", "")
    suffix = uuid.uuid4().hex[:6]
    return f"{base}-{suffix}"
