import logging
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from app.celery_app import celery_app
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.document import Document, DocumentStatus
from app.models.job import Job, JobStatus
from app.services.ai_service import DocumentIntelligenceService

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=0)
def process_document_task(self, document_id: str, job_id: str) -> None:
    logger.info("Document processing started: doc_id=%s job_id=%s", document_id, job_id)

    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == UUID(job_id)).first()
        if not job:
            logger.error("Job %s not found", job_id)
            return

        job.status = JobStatus.RUNNING
        job.started_at = datetime.now(timezone.utc)
        db.commit()

        doc = db.query(Document).filter(Document.id == UUID(document_id)).first()
        if not doc:
            msg = f"Document {document_id} not found"
            raise ValueError(msg)

        if doc.extracted_text:
            job.status = JobStatus.SUCCESS
            job.progress = 100
            job.finished_at = datetime.now(timezone.utc)
            db.commit()
            logger.info("Document already processed: doc_id=%s", document_id)
            return

        job.progress = 30
        db.commit()

        doc.status = DocumentStatus.PROCESSING.value
        db.commit()

        file_path = Path(settings.UPLOADS_DIR) / doc.storage_path
        if not file_path.exists():
            msg = f"File not found: {file_path}"
            raise FileNotFoundError(msg)

        with open(file_path, "rb") as f:
            file_bytes = f.read()

        job.progress = 60
        db.commit()

        service = DocumentIntelligenceService()
        result = None
        try:
            import asyncio
            result = asyncio.run(service.extract_text(file_bytes, doc.filename))
        except Exception as exc:
            logger.warning("Text extraction failed for %s: %s", doc.filename, exc)

        if result and result.text:
            doc.extracted_text = result.text
            doc.status = DocumentStatus.PROCESSED.value
        elif doc.filename.rsplit(".", 1)[-1].lower() in ("pdf", "png", "jpg", "jpeg", "docx"):
            doc.status = DocumentStatus.FAILED.value
            logger.warning("Extraction not supported for %s — install pdfplumber/python-docx/Tesseract", doc.filename)
        else:
            doc.status = DocumentStatus.PROCESSED.value

        db.commit()

        job.status = JobStatus.SUCCESS
        job.progress = 100
        job.finished_at = datetime.now(timezone.utc)
        db.commit()

        logger.info("Document processed: doc_id=%s status=%s", document_id, doc.status)

    except Exception as exc:
        logger.exception("Document processing failed: doc_id=%s job_id=%s", document_id, job_id)
        db.rollback()
        try:
            job = db.query(Job).filter(Job.id == UUID(job_id)).first()
            if job:
                job.status = JobStatus.FAILED
                job.error_message = str(exc)
                job.finished_at = datetime.now(timezone.utc)
                db.commit()

            doc = db.query(Document).filter(Document.id == UUID(document_id)).first()
            if doc:
                doc.status = DocumentStatus.FAILED.value
                db.commit()
        except Exception:
            logger.exception("Failed to update job %s status", job_id)

        logger.info("Job failed: id=%s type=document_processing error=%s", job_id, str(exc))

    finally:
        db.close()
