import asyncio
import logging
from datetime import datetime, timezone
from uuid import UUID

from app.celery_app import celery_app
from app.core.database import SessionLocal
from app.engine.executor import WorkflowExecutor
from app.models.job import Job, JobStatus
from app.models.workflow import RunStatus, WorkflowRun

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=0)
def execute_workflow_task(self, run_id: str, job_id: str) -> None:
    logger.info("Job created: id=%s type=workflow_execution run_id=%s", job_id, run_id)

    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == UUID(job_id)).first()
        run = db.query(WorkflowRun).filter(WorkflowRun.id == UUID(run_id)).first()
        if not job or not run:
            logger.error("Job %s or run %s not found", job_id, run_id)
            return

        job.status = JobStatus.RUNNING
        job.started_at = datetime.now(timezone.utc)
        run.status = RunStatus.RUNNING
        db.commit()
        logger.info("Job started: id=%s run_id=%s", job_id, run_id)

        logger.info("Workflow queued: run_id=%s", run_id)
        logger.info("Workflow executed: run_id=%s", run_id)

        executor = WorkflowExecutor(db, UUID(run_id))
        asyncio.run(executor.execute())
        db.commit()
        db.refresh(run)

        job.status = JobStatus.SUCCESS
        job.progress = 100
        job.finished_at = datetime.now(timezone.utc)
        db.commit()

        logger.info("Job completed: id=%s run_id=%s status=success", job_id, run_id)

    except Exception as exc:
        logger.exception("Job failed: id=%s run_id=%s", job_id, run_id)
        db.rollback()
        try:
            job = db.query(Job).filter(Job.id == UUID(job_id)).first()
            if job:
                job.status = JobStatus.FAILED
                job.error_message = str(exc)
                job.finished_at = datetime.now(timezone.utc)
                db.commit()
        except Exception:
            logger.exception("Failed to update job %s status", job_id)

        logger.info("Job failed: id=%s run_id=%s error=%s", job_id, run_id, str(exc))

    finally:
        db.close()
