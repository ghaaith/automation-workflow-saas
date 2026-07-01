from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field


class DocumentUploadedEvent(BaseModel):
    document_id: UUID
    filename: str
    file_url: str = ""
    file_size_bytes: int = 0
    mime_type: str = ""


class ManualTriggerRequest(BaseModel):
    trigger_data: dict = Field(default_factory=dict)


class WebhookTriggerRequest(BaseModel):
    headers: dict = Field(default_factory=dict)
    body: dict = Field(default_factory=dict)
    query_params: dict = Field(default_factory=dict)


class TriggerDispatchResponse(BaseModel):
    runs_created: int
    message: str
    run_ids: list[UUID]


class TriggeredRunSummary(BaseModel):
    id: UUID
    workflow_id: UUID
    workflow_name: str
    status: str
