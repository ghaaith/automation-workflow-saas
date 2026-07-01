from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.organization import OrganizationCreate, OrganizationResponse
from app.services.organization_service import (
    create_organization,
    get_current_organization,
)

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.post("", response_model=OrganizationResponse, status_code=201)
def create(
    request: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_organization(db, request, current_user)


@router.get("/current", response_model=OrganizationResponse)
def get_current(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_current_organization(db, current_user)
