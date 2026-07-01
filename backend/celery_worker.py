import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

from app.celery_app import celery_app  # noqa: E402
import app.tasks.workflow_tasks  # noqa: E402, F401
import app.tasks.document_tasks  # noqa: E402, F401
