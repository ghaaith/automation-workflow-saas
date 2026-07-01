from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_organization
from app.models.job import Job
from app.models.organization import Organization
from app.schemas.job import JobResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("")
def list_jobs(
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
    limit: int = 20,
    offset: int = 0,
) -> list[JobResponse]:
    jobs = (
        db.query(Job)
        .filter(Job.organization_id == org.id)
        .order_by(Job.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [JobResponse.model_validate(j) for j in jobs]


@router.get("/{job_id}")
def get_job(
    job_id: UUID,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> JobResponse:
    job = (
        db.query(Job)
        .filter(
            Job.id == job_id,
            Job.organization_id == org.id,
        )
        .first()
    )
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    return JobResponse.model_validate(job)
