from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class PlanResponse(BaseModel):
    id: uuid.UUID
    name: str
    display_name: str
    workflow_limit: int
    rate_limit_per_hour: int
    price_cents: int

    model_config = {"from_attributes": True}


class SubscriptionResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    plan_id: uuid.UUID
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SubscriptionWithPlanResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    status: str
    created_at: datetime
    updated_at: datetime
    plan: PlanResponse

    model_config = {"from_attributes": True}


class AdminUsageSummary(BaseModel):
    total_users: int
    total_organizations: int
    total_workflows: int
    total_executions: int
    total_usage_logs: int


class AdminSystemStats(BaseModel):
    total_users: int
    total_workflows: int
    total_executions: int
    total_usage_logs: int
    organizations_by_plan: dict[str, int]
    usage_by_event_type: dict[str, int]
    recent_runs_24h: int
    active_workflows: int
