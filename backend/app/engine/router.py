from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_organization
from app.models.job import Job, JobStatus
from app.models.organization import Organization
from app.models.workflow import RunStatus, Workflow, WorkflowRun
from app.services.rate_limiter import enforce_workflow_rate_limit
from app.schemas.execution import (
    NodeExecutionResponse,
    WorkflowRunResponse,
    WorkflowRunStatusResponse,
)
from app.tasks.workflow_tasks import execute_workflow_task

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workflows", tags=["workflows"])


class RunWorkflowResponse(BaseModel):
    run_id: UUID
    status: str
    message: str
    job_id: UUID | None = None


@router.get("/runs/{run_id}")
def get_run(
    run_id: UUID,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> WorkflowRunResponse:
    run = (
        db.query(WorkflowRun)
        .filter(
            WorkflowRun.id == run_id,
            WorkflowRun.organization_id == org.id,
        )
        .first()
    )
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Run not found",
        )

    return WorkflowRunResponse(
        id=run.id,
        workflow_id=run.workflow_id,
        organization_id=run.organization_id,
        status=run.status.value,
        trigger_data=run.trigger_data,
        error_message=run.error_message,
        started_at=run.started_at,
        finished_at=run.finished_at,
        node_executions=[
            NodeExecutionResponse.model_validate(ex)
            for ex in (run.node_executions or [])
        ],
    )


def _flatten_logs(run: WorkflowRun) -> list[dict]:
    logs: list[dict] = []
    for ex in (run.node_executions or []):
        if ex.logs:
            for idx, log_entry in enumerate(ex.logs):
                logs.append({
                    "id": f"{ex.id}_{idx}",
                    "run_id": str(run.id),
                    "level": log_entry.get("level", "info"),
                    "message": log_entry.get("message", ""),
                    "node_id": str(ex.node_id) if ex.node_id else None,
                    "created_at": ex.created_at.isoformat() if ex.created_at else "",
                })
        if ex.error_message:
            logs.append({
                "id": f"{ex.id}_error",
                "run_id": str(run.id),
                "level": "error",
                "message": ex.error_message,
                "node_id": str(ex.node_id) if ex.node_id else None,
                "created_at": ex.finished_at.isoformat() if ex.finished_at else "",
            })
    return logs


@router.get("/{workflow_id}/runs")
def list_workflow_runs(
    workflow_id: UUID,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
    limit: int = 20,
    offset: int = 0,
) -> list[WorkflowRunStatusResponse]:
    runs = (
        db.query(WorkflowRun)
        .options(joinedload(WorkflowRun.node_executions))
        .filter(
            WorkflowRun.workflow_id == workflow_id,
            WorkflowRun.organization_id == org.id,
        )
        .order_by(WorkflowRun.started_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [
        WorkflowRunStatusResponse(
            id=r.id,
            workflow_id=r.workflow_id,
            status=r.status.value,
            started_at=r.started_at,
            finished_at=r.finished_at,
            error_message=r.error_message,
            logs=_flatten_logs(r),
        )
        for r in runs
    ]


@router.post("/{workflow_id}/run", status_code=status.HTTP_202_ACCEPTED)
def run_workflow(
    workflow_id: UUID,
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
    _rate_limited: None = Depends(enforce_workflow_rate_limit),
) -> RunWorkflowResponse:
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

    logger.info("Workflow started: id=%s name=%s", workflow.id, workflow.name)

    run = WorkflowRun(
        workflow_id=workflow.id,
        organization_id=org.id,
        status=RunStatus.PENDING,
        started_at=datetime.now(timezone.utc),
        trigger_data={"triggered_by": "manual_run"},
    )
    db.add(run)
    db.flush()
    db.refresh(run)
    logger.info("Workflow run created: id=%s status=pending", run.id)

    job = Job(
        organization_id=org.id,
        job_type="workflow_execution",
        status=JobStatus.PENDING,
    )
    db.add(job)
    db.flush()
    db.refresh(job)
    logger.info("Job created: id=%s run_id=%s type=workflow_execution", job.id, run.id)

    execute_workflow_task.delay(str(run.id), str(job.id))
    logger.info("Workflow queued: run_id=%s job_id=%s", run.id, job.id)

    db.commit()

    return RunWorkflowResponse(
        run_id=run.id,
        status="queued",
        message=f"Workflow '{workflow.name}' queued for execution",
        job_id=job.id,
    )


@router.get("/runs")
def list_runs(
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
    limit: int = 20,
    offset: int = 0,
) -> list[WorkflowRunStatusResponse]:
    runs = (
        db.query(WorkflowRun)
        .options(joinedload(WorkflowRun.node_executions))
        .filter(WorkflowRun.organization_id == org.id)
        .order_by(WorkflowRun.started_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [
        WorkflowRunStatusResponse(
            id=r.id,
            workflow_id=r.workflow_id,
            status=r.status.value,
            started_at=r.started_at,
            finished_at=r.finished_at,
            error_message=r.error_message,
            logs=_flatten_logs(r),
        )
        for r in runs
    ]
