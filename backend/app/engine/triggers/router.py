from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_organization
from app.engine.triggers.base import TriggerEvent
from app.engine.triggers.dispatcher import EventDispatcher
from app.models.organization import Organization
from app.models.workflow import TriggerType, Workflow
from app.services.rate_limiter import enforce_workflow_rate_limit

from app.schemas.triggers import (
    DocumentUploadedEvent,
    ManualTriggerRequest,
    TriggerDispatchResponse,
    WebhookTriggerRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workflows", tags=["triggers"])


@router.post("/{workflow_id}/trigger", status_code=status.HTTP_202_ACCEPTED)
def trigger_workflow_manual(
    workflow_id: UUID,
    body: ManualTriggerRequest,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
    _rate_limited: None = Depends(enforce_workflow_rate_limit),
) -> TriggerDispatchResponse:
    workflow = (
        db.query(Workflow)
        .filter(
            Workflow.id == workflow_id,
            Workflow.organization_id == org.id,
        )
        .first()
    )
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found",
        )

    event = TriggerEvent(
        trigger_type=TriggerType.MANUAL,
        organization_id=org.id,
        workflow_id=workflow_id,
        payload=body.trigger_data,
    )

    dispatcher = EventDispatcher(db)
    runs = dispatcher.dispatch(event)

    return TriggerDispatchResponse(
        runs_created=len(runs),
        message=f"Workflow '{workflow.name}' triggered manually",
        run_ids=[r.id for r in runs],
    )


@router.post("/triggers/document-uploaded", status_code=status.HTTP_202_ACCEPTED)
def trigger_document_uploaded(
    body: DocumentUploadedEvent,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
    _rate_limited: None = Depends(enforce_workflow_rate_limit),
) -> TriggerDispatchResponse:
    event = TriggerEvent(
        trigger_type=TriggerType.DOCUMENT_UPLOADED,
        organization_id=org.id,
        payload=body.model_dump(),
    )

    dispatcher = EventDispatcher(db)
    try:
        runs = dispatcher.dispatch(event)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )

    return TriggerDispatchResponse(
        runs_created=len(runs),
        message=f"Document uploaded event dispatched to {len(runs)} workflow(s)",
        run_ids=[r.id for r in runs],
    )


@router.post("/webhooks/{workflow_id}", status_code=status.HTTP_202_ACCEPTED)
def trigger_webhook(
    workflow_id: UUID,
    body: WebhookTriggerRequest,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
    _rate_limited: None = Depends(enforce_workflow_rate_limit),
) -> TriggerDispatchResponse:
    workflow = (
        db.query(Workflow)
        .filter(
            Workflow.id == workflow_id,
            Workflow.organization_id == org.id,
            Workflow.is_active == True,
        )
        .first()
    )
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found or inactive",
        )

    if workflow.trigger_type != TriggerType.WEBHOOK:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Workflow trigger type is '{workflow.trigger_type.value}', expected 'webhook'",
        )

    payload = body.model_dump()
    payload["_workflow_trigger_config"] = workflow.trigger_config or {}

    event = TriggerEvent(
        trigger_type=TriggerType.WEBHOOK,
        organization_id=org.id,
        workflow_id=workflow_id,
        payload=payload,
    )

    dispatcher = EventDispatcher(db)
    try:
        runs = dispatcher.dispatch(event)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        )

    return TriggerDispatchResponse(
        runs_created=len(runs),
        message="Webhook processed",
        run_ids=[r.id for r in runs],
    )
