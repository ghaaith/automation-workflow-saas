from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.engine.triggers.base import TriggerEvent, TriggerHandler
from app.engine.triggers.handlers import (
    DocumentUploadedHandler,
    ManualTriggerHandler,
    ScheduledTriggerHandler,
    WebhookTriggerHandler,
)
from app.models.job import Job, JobStatus
from app.models.workflow import TriggerType, Workflow, WorkflowRun, WorkflowTriggerLog
from app.tasks.workflow_tasks import execute_workflow_task

logger = logging.getLogger(__name__)


class EventDispatcher:
    _handler_registry: dict[TriggerType, TriggerHandler] = {}

    @classmethod
    def register_handler(cls, handler: TriggerHandler) -> None:
        cls._handler_registry[handler.trigger_type()] = handler

    @classmethod
    def get_handler(cls, trigger_type: TriggerType) -> TriggerHandler:
        handler = cls._handler_registry.get(trigger_type)
        if not handler:
            msg = f"No handler registered for trigger type: {trigger_type}"
            raise ValueError(msg)
        return handler

    def __init__(self, db: Session) -> None:
        self.db = db

    def find_matching_workflows(
        self,
        trigger_type: TriggerType,
        organization_id: UUID,
        workflow_id: UUID | None = None,
    ) -> list[Workflow]:
        query = self.db.query(Workflow).filter(
            Workflow.organization_id == organization_id,
            Workflow.trigger_type == trigger_type,
            Workflow.is_active == True,
        )

        if workflow_id:
            query = query.filter(Workflow.id == workflow_id)

        return query.all()

    def dispatch(self, event: TriggerEvent) -> list[WorkflowRun]:
        handler = self.get_handler(event.trigger_type)

        errors = handler.validate_event(event)
        if errors:
            msg = f"Event validation failed: {'; '.join(errors)}"
            raise ValueError(msg)

        workflows = self.find_matching_workflows(
            trigger_type=event.trigger_type,
            organization_id=event.organization_id,
            workflow_id=event.workflow_id,
        )

        if not workflows:
            self._log_trigger_event(
                workflow_id=event.workflow_id or UUID(int=0),
                event_type=event.trigger_type.value,
                payload={**event.payload, "status": "no_matching_workflows"},
            )
            return []

        trigger_data = handler.enrich_trigger_data(event)
        runs: list[WorkflowRun] = []

        for workflow in workflows:
            run = WorkflowRun(
                workflow_id=workflow.id,
                organization_id=event.organization_id,
                trigger_data=trigger_data,
            )
            self.db.add(run)
            self.db.flush()
            self.db.refresh(run)
            runs.append(run)
            logger.info("Workflow run created: id=%s workflow_id=%s org_id=%s", run.id, workflow.id, event.organization_id)

        self.db.commit()

        for run in runs:
            self._log_trigger_event(
                workflow_id=run.workflow_id,
                event_type=event.trigger_type.value,
                payload={**event.payload, "run_id": str(run.id), "status": "dispatched"},
            )

        self.db.commit()

        for run in runs:
            job = Job(
                organization_id=event.organization_id,
                job_type="workflow_execution",
                status=JobStatus.PENDING,
            )
            self.db.add(job)
            self.db.flush()
            self.db.refresh(job)
            logger.info("Job created: id=%s run_id=%s type=workflow_execution", job.id, run.id)

            execute_workflow_task.delay(str(run.id), str(job.id))
            logger.info("Workflow queued: run_id=%s job_id=%s", run.id, job.id)

        self.db.commit()

        logger.info(
            "Dispatched %d workflow run(s) for org=%s trigger=%s",
            len(runs), event.organization_id, event.trigger_type.value,
        )

        return runs

    def _log_trigger_event(
        self,
        workflow_id: UUID,
        event_type: str,
        payload: dict,
    ) -> None:
        log_entry = WorkflowTriggerLog(
            workflow_id=workflow_id,
            event_type=event_type,
            payload=payload,
        )
        self.db.add(log_entry)


EventDispatcher.register_handler(DocumentUploadedHandler())
EventDispatcher.register_handler(ManualTriggerHandler())
EventDispatcher.register_handler(WebhookTriggerHandler())
EventDispatcher.register_handler(ScheduledTriggerHandler())
