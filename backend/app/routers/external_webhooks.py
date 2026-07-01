from __future__ import annotations

import hashlib
import hmac
import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, status

from app.core.database import SessionLocal
from app.engine.triggers.base import TriggerEvent
from app.engine.triggers.dispatcher import EventDispatcher
from app.models.workflow import TriggerType, Workflow

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks/external", tags=["webhooks"])


@router.post("/{workflow_id}", status_code=status.HTTP_202_ACCEPTED)
def handle_external_webhook(workflow_id: UUID, request: Request) -> dict:
    signature = request.headers.get("x-webhook-signature", "")
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Webhook-Signature header",
        )

    db = SessionLocal()
    try:
        workflow = (
            db.query(Workflow)
            .filter(
                Workflow.id == workflow_id,
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

        webhook_secret = (workflow.trigger_config or {}).get("webhook_secret", "")
        if not webhook_secret:
            raise HTTPException(
                status_code=status.HTTP_412_PRECONDITION_FAILED,
                detail="Webhook secret not configured for this workflow. Generate one via the integrations API.",
            )

        import asyncio

        body_bytes = asyncio.run(request.body())
        expected_sig = hmac.new(
            webhook_secret.encode(),
            body_bytes,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected_sig, signature):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature",
            )

        event = TriggerEvent(
            trigger_type=TriggerType.WEBHOOK,
            organization_id=workflow.organization_id,
            workflow_id=workflow_id,
            payload={
                "headers": dict(request.headers),
                "_workflow_trigger_config": workflow.trigger_config or {},
                "_signature_verified": True,
            },
        )

        dispatcher = EventDispatcher(db)
        try:
            runs = dispatcher.dispatch(event)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            )

        return {
            "runs_created": len(runs),
            "message": "Webhook processed",
            "run_ids": [str(r.id) for r in runs],
        }
    finally:
        db.close()
