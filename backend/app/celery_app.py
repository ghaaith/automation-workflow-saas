from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "ai_workflow_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

import app.tasks.workflow_tasks  # noqa: E402, F401
import app.tasks.document_tasks  # noqa: E402, F401
