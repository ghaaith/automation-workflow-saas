from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class IntegrationCreate(BaseModel):
    integration_type: str
    name: str
    config: dict = Field(default_factory=dict)


class IntegrationUpdate(BaseModel):
    name: str | None = None
    config: dict | None = None
    is_active: bool | None = None


class IntegrationResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    integration_type: str
    name: str
    config: dict
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class IntegrationListResponse(BaseModel):
    integrations: list[IntegrationResponse]
    total: int


class IntegrationTestResult(BaseModel):
    success: bool
    message: str


class WebhookUrlResponse(BaseModel):
    webhook_url: str
    webhook_secret: str
    webhook_id: uuid.UUID
