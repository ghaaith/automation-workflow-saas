from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class TriggerWorkflowRequest(BaseModel):
    workflow_id: UUID
    trigger_data: dict = {}


class NodeExecutionResponse(BaseModel):
    id: UUID
    node_id: UUID | None
    status: str
    input_data: dict | None
    output_data: dict | None
    logs: list | None
    error_message: str | None
    retry_count: int
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkflowRunResponse(BaseModel):
    id: UUID
    workflow_id: UUID
    organization_id: UUID
    status: str
    trigger_data: dict | None
    error_message: str | None
    started_at: datetime
    finished_at: datetime | None
    node_executions: list[NodeExecutionResponse] = []

    model_config = {"from_attributes": True}


class WorkflowRunStatusResponse(BaseModel):
    id: UUID
    workflow_id: UUID
    status: str
    started_at: datetime
    finished_at: datetime | None
    error_message: str | None
    logs: list[dict] = []

    model_config = {"from_attributes": True}
