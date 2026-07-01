from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class TemplateCreate(BaseModel):
    name: str
    description: str | None = None
    category: Literal["marketing", "finance", "automation"]
    default_nodes: list[dict] = Field(default_factory=list)


class TemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category: Literal["marketing", "finance", "automation"] | None = None
    default_nodes: list[dict] | None = None


class TemplateResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    category: str
    default_nodes: list
    created_at: datetime

    model_config = {"from_attributes": True}


class TemplateListResponse(BaseModel):
    templates: list[TemplateResponse]
    total: int


class TriggerLogResponse(BaseModel):
    id: UUID
    workflow_id: UUID
    event_type: str
    payload: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TriggerLogListResponse(BaseModel):
    logs: list[TriggerLogResponse]
    total: int
