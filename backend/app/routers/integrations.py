from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_organization
from app.models.integration import Integration, IntegrationType
from app.models.organization import Organization
from app.models.workflow import Workflow
from app.schemas.integrations import (
    IntegrationCreate,
    IntegrationListResponse,
    IntegrationResponse,
    IntegrationTestResult,
    IntegrationUpdate,
    WebhookUrlResponse,
)
from app.services.credential_encryption import encrypt_sensitive_fields
from app.services.integrations.api_call_service import ApiCallService
from app.services.integrations.email_service import EmailService
from app.services.integrations.slack_service import SlackService
from app.services.integrations.webhook_service import generate_webhook_secret

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations", tags=["integrations"])

SERVICE_MAP = {
    IntegrationType.SLACK: SlackService,
    IntegrationType.EMAIL: EmailService,
    IntegrationType.API_CALL: ApiCallService,
}


def _integration_to_response(integration: Integration) -> IntegrationResponse:
    return IntegrationResponse(
        id=integration.id,
        organization_id=integration.organization_id,
        integration_type=integration.integration_type.value,
        name=integration.name,
        config=_mask_sensitive(integration.config),
        is_active=integration.is_active,
        created_at=integration.created_at,
        updated_at=integration.updated_at,
    )


SENSITIVE_MASK_KEYS = {"password", "api_key", "token", "webhook_url", "secret", "private_key"}


def _mask_sensitive(config: dict) -> dict:
    masked = {}
    for key, value in config.items():
        if key in SENSITIVE_MASK_KEYS and isinstance(value, str) and len(value) > 6:
            masked[key] = value[:4] + "****"
        else:
            masked[key] = value
    return masked


@router.get("")
def list_integrations(
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
    integration_type: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> IntegrationListResponse:
    query = db.query(Integration).filter(
        Integration.organization_id == org.id
    )

    if integration_type:
        query = query.filter(Integration.integration_type == integration_type)

    total = query.count()
    integrations = (
        query.order_by(Integration.updated_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return IntegrationListResponse(
        integrations=[_integration_to_response(i) for i in integrations],
        total=total,
    )


@router.get("/types")
def list_integration_types() -> list[str]:
    return [t.value for t in IntegrationType]


@router.get("/{integration_id}")
def get_integration(
    integration_id: UUID,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> IntegrationResponse:
    integration = (
        db.query(Integration)
        .filter(
            Integration.id == integration_id,
            Integration.organization_id == org.id,
        )
        .first()
    )
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found",
        )
    return _integration_to_response(integration)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_integration(
    body: IntegrationCreate,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> IntegrationResponse:
    try:
        itype = IntegrationType(body.integration_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid integration type: {body.integration_type}",
        )

    import asyncio

    service_cls = SERVICE_MAP.get(itype)
    if service_cls:
        errors = asyncio.run(service_cls().validate(body.config))
        if errors:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"message": "Invalid integration config", "errors": errors},
            )

    encrypted_config = encrypt_sensitive_fields(body.config)

    integration = Integration(
        organization_id=org.id,
        integration_type=itype,
        name=body.name,
        config=encrypted_config,
    )
    db.add(integration)
    db.commit()
    db.refresh(integration)

    logger.info("Integration '%s' created for org %s", body.name, org.id)
    return _integration_to_response(integration)


@router.put("/{integration_id}")
def update_integration(
    integration_id: UUID,
    body: IntegrationUpdate,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> IntegrationResponse:
    integration = (
        db.query(Integration)
        .filter(
            Integration.id == integration_id,
            Integration.organization_id == org.id,
        )
        .first()
    )
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found",
        )

    if body.config is not None:
        service_cls = SERVICE_MAP.get(integration.integration_type)
        if service_cls:
            merged = dict(integration.config)
            merged.update(body.config)
            errors = asyncio.run(service_cls().validate(merged))
            if errors:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={"message": "Invalid integration config", "errors": errors},
                )
        body.config = encrypt_sensitive_fields(body.config)

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(integration, key, value)

    db.commit()
    db.refresh(integration)
    return _integration_to_response(integration)


@router.delete("/{integration_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_integration(
    integration_id: UUID,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> None:
    integration = (
        db.query(Integration)
        .filter(
            Integration.id == integration_id,
            Integration.organization_id == org.id,
        )
        .first()
    )
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found",
        )
    db.delete(integration)
    db.commit()
    logger.info("Integration %s deleted", integration_id)


@router.post("/{integration_id}/test")
def test_integration(
    integration_id: UUID,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> IntegrationTestResult:
    integration = (
        db.query(Integration)
        .filter(
            Integration.id == integration_id,
            Integration.organization_id == org.id,
        )
        .first()
    )
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found",
        )

    service_cls = SERVICE_MAP.get(integration.integration_type)
    if not service_cls:
        return IntegrationTestResult(success=True, message="No test available for this integration type")

    import asyncio

    service = service_cls()
    success, message = asyncio.run(service.test_connection(integration.config))

    return IntegrationTestResult(success=success, message=message)


@router.post("/{workflow_id}/webhook-url")
def generate_webhook_url(
    workflow_id: UUID,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> WebhookUrlResponse:
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

    secret = generate_webhook_secret()
    tc = dict(workflow.trigger_config or {})
    tc["webhook_secret"] = secret
    workflow.trigger_config = tc
    db.commit()

    return WebhookUrlResponse(
        webhook_url=f"/api/v1/webhooks/external/{workflow_id}",
        webhook_secret=secret,
        webhook_id=workflow.id,
    )


@router.get("/types/{integration_type}/fields")
def get_integration_fields(integration_type: str) -> dict:
    schemas = {
        "slack": {
            "fields": [
                {"key": "webhook_url", "label": "Webhook URL", "type": "text", "required": False, "sensitive": True},
                {"key": "bot_token", "label": "Bot Token", "type": "text", "required": False, "sensitive": True},
                {"key": "channel", "label": "Default Channel", "type": "text", "required": False},
            ]
        },
        "email": {
            "fields": [
                {"key": "smtp_host", "label": "SMTP Host", "type": "text", "required": True},
                {"key": "smtp_port", "label": "SMTP Port", "type": "number", "required": True, "default": 587},
                {"key": "smtp_user", "label": "SMTP Username", "type": "text", "required": True},
                {"key": "smtp_password", "label": "SMTP Password", "type": "password", "required": True, "sensitive": True},
                {"key": "from_email", "label": "From Email", "type": "text", "required": False},
            ]
        },
        "api_call": {
            "fields": [
                {"key": "auth_type", "label": "Auth Type", "type": "select", "required": False, "options": ["none", "bearer", "basic"]},
                {"key": "auth.token", "label": "Bearer Token", "type": "password", "required": False, "sensitive": True},
            ]
        },
    }
    return schemas.get(integration_type, {"fields": []})
