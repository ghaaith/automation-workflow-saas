from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.workflow import TemplateCategory, WorkflowTemplate, WorkflowTriggerLog
from app.schemas.templates import (
    TemplateCreate,
    TemplateListResponse,
    TemplateResponse,
    TemplateUpdate,
    TriggerLogListResponse,
    TriggerLogResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("")
def list_templates(
    category: str | None = None,
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
) -> TemplateListResponse:
    query = db.query(WorkflowTemplate)

    if category:
        query = query.filter(WorkflowTemplate.category == category)

    total = query.count()
    templates = (
        query.order_by(WorkflowTemplate.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return TemplateListResponse(
        templates=[
            TemplateResponse.model_validate(t) for t in templates
        ],
        total=total,
    )


@router.get("/{template_id}")
def get_template(
    template_id: UUID,
    db: Session = Depends(get_db),
) -> TemplateResponse:
    template = db.query(WorkflowTemplate).filter(WorkflowTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    return TemplateResponse.model_validate(template)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_template(
    body: TemplateCreate,
    db: Session = Depends(get_db),
) -> TemplateResponse:
    template = WorkflowTemplate(
        name=body.name,
        description=body.description,
        category=body.category,
        default_nodes=body.default_nodes,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return TemplateResponse.model_validate(template)


@router.put("/{template_id}")
def update_template(
    template_id: UUID,
    body: TemplateUpdate,
    db: Session = Depends(get_db),
) -> TemplateResponse:
    template = db.query(WorkflowTemplate).filter(WorkflowTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(template, key, value)

    db.commit()
    db.refresh(template)
    return TemplateResponse.model_validate(template)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_template(
    template_id: UUID,
    db: Session = Depends(get_db),
) -> None:
    template = db.query(WorkflowTemplate).filter(WorkflowTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    db.delete(template)
    db.commit()


@router.get("/categories")
def list_categories() -> list[str]:
    return [c.value for c in TemplateCategory]


@router.get("/{template_id}/trigger-logs")
def list_template_trigger_logs(
    template_id: UUID,
    db: Session = Depends(get_db),
    limit: int = 20,
    offset: int = 0,
) -> TriggerLogListResponse:
    template = db.query(WorkflowTemplate).filter(WorkflowTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    # Trigger logs belong to workflows created from templates,
    # so this provides a way to see logs across template-derived workflows.
    from app.models.workflow import Workflow

    workflow_ids = (
        db.query(Workflow.id)
        .filter(Workflow.name == template.name)
        .subquery()
    )

    query = db.query(WorkflowTriggerLog).filter(
        WorkflowTriggerLog.workflow_id.in_(workflow_ids)
    )

    total = query.count()
    logs = (
        query.order_by(WorkflowTriggerLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return TriggerLogListResponse(
        logs=[TriggerLogResponse.model_validate(log) for log in logs],
        total=total,
    )
