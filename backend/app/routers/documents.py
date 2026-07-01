from __future__ import annotations

import logging
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.document import Document, DocumentStatus
from app.models.job import Job, JobStatus
from app.services.ai_service import DocumentIntelligenceService
from app.tasks.document_tasks import process_document_task

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])

# ── Constants ────────────────────────────────────────────────────────────────
MAX_FILE_SIZE_BYTES: int = 50 * 1024 * 1024  # 50 MB

ALLOWED_CONTENT_TYPES: set[str] = {
    # Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    # Text
    "text/plain",
    "text/csv",
    "text/markdown",
    # Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    # Data
    "application/json",
    "application/xml",
    "text/xml",
}


# ── Response schema ───────────────────────────────────────────────────────────
class DocumentResponse(BaseModel):
    id: str
    filename: str
    size: int
    content_type: str
    uploaded_at: str

    model_config = {"from_attributes": True}


# ── Helpers ───────────────────────────────────────────────────────────────────
def _get_uploads_dir() -> Path:
    uploads_dir = Path(settings.UPLOADS_DIR)
    uploads_dir.mkdir(parents=True, exist_ok=True)
    return uploads_dir


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a document",
    description="Upload a file and store it server-side. Returns document metadata.",
)
async def upload_document(
    file: UploadFile = File(..., description="The file to upload"),
    organization_id: str | None = Form(default=None, description="Target organization ID (optional — falls back to user's active org)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    # ── Resolve organization ──────────────────────────────────────────────
    if organization_id:
        try:
            org_uuid = uuid.UUID(organization_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid organization_id format (must be a UUID).",
            )
    else:
        # Fall back to the user's first membership (same pattern as get_current_organization)
        from app.models.organization_member import OrganizationMember
        membership = (
            db.query(OrganizationMember)
            .filter(OrganizationMember.user_id == current_user.id)
            .first()
        )
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No organization found for this user.",
            )
        org_uuid = membership.organization_id

    logger.info(
        "Upload started: filename=%s content_type=%s user=%s org=%s",
        file.filename,
        file.content_type,
        current_user.id,
        org_uuid,
    )

    # ── Validate content type ─────────────────────────────────────────────
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_CONTENT_TYPES:
        logger.warning("Upload failed: unsupported content type %s", content_type)
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File type '{content_type}' is not supported. "
                   f"Allowed types: {sorted(ALLOWED_CONTENT_TYPES)}",
        )

    # ── Read file into memory and validate size ───────────────────────────
    try:
        file_bytes = await file.read()
    except Exception as exc:
        logger.error("Upload failed: could not read file — %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read the uploaded file.",
        ) from exc

    file_size = len(file_bytes)
    if file_size > MAX_FILE_SIZE_BYTES:
        logger.warning(
            "Upload failed: file too large (%d bytes, max %d)",
            file_size,
            MAX_FILE_SIZE_BYTES,
        )
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.",
        )

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    # ── Sanitise filename and build storage path ──────────────────────────
    original_filename = file.filename or "upload"
    safe_filename = Path(original_filename).name  # strip any directory traversal
    doc_id = uuid.uuid4()
    # Store as  <org_id>/<doc_id>_<original_name>  to avoid collisions
    relative_path = os.path.join(str(org_uuid), f"{doc_id}_{safe_filename}")
    uploads_dir = _get_uploads_dir()
    dest_path = uploads_dir / relative_path
    dest_path.parent.mkdir(parents=True, exist_ok=True)

    # ── Write file to disk ────────────────────────────────────────────────
    try:
        with open(dest_path, "wb") as f:
            f.write(file_bytes)
    except OSError as exc:
        logger.error("Upload failed: could not write file — %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store the uploaded file.",
        ) from exc

    # ── Persist metadata in DB ────────────────────────────────────────────
    now = datetime.now(timezone.utc)
    extracted_text = None
    ext = original_filename.rsplit(".", 1)[-1].lower() if "." in original_filename else ""
    if ext in ("txt", "md", "csv", "json", "xml", "html"):
        extracted_text = file_bytes.decode("utf-8", errors="replace")

    document = Document(
        id=doc_id,
        organization_id=org_uuid,
        uploaded_by=current_user.id,
        filename=original_filename,
        content_type=content_type,
        size=file_size,
        storage_path=str(relative_path),
        uploaded_at=now,
        extracted_text=extracted_text,
        status=DocumentStatus.PROCESSED.value if extracted_text else DocumentStatus.PENDING.value,
    )
    db.add(document)
    try:
        db.commit()
        db.refresh(document)
    except Exception as exc:
        db.rollback()
        # Clean up the file we wrote
        try:
            dest_path.unlink(missing_ok=True)
        except OSError:
            pass
        logger.error("Upload failed: database error — %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save document metadata.",
        ) from exc

    job = Job(
        organization_id=org_uuid,
        job_type="document_processing",
        status=JobStatus.PENDING,
    )
    db.add(job)
    db.flush()
    db.refresh(job)
    logger.info("Job created: id=%s doc_id=%s type=document_processing", job.id, document.id)

    process_document_task.delay(str(document.id), str(job.id))
    logger.info("Document queued: doc_id=%s job_id=%s", document.id, job.id)

    db.commit()

    logger.info(
        "Upload successful: doc_id=%s filename=%s size=%d job_id=%s",
        document.id,
        document.filename,
        document.size,
        job.id,
    )

    return DocumentResponse(
        id=str(document.id),
        filename=document.filename,
        size=document.size,
        content_type=document.content_type,
        uploaded_at=document.uploaded_at.isoformat(),
    )



@router.get(
    "",
    response_model=list[DocumentResponse],
    summary="List documents for an organization",
)
def list_documents(
    organization_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DocumentResponse]:
    try:
        org_uuid = uuid.UUID(organization_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid organization_id.",
        )

    documents = (
        db.query(Document)
        .filter(Document.organization_id == org_uuid)
        .order_by(Document.uploaded_at.desc())
        .all()
    )
    return [
        DocumentResponse(
            id=str(d.id),
            filename=d.filename,
            size=d.size,
            content_type=d.content_type,
            uploaded_at=d.uploaded_at.isoformat(),
        )
        for d in documents
    ]


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Get a single document by ID",
)
def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid document_id.")

    document = db.query(Document).filter(Document.id == doc_uuid).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    return DocumentResponse(
        id=str(document.id),
        filename=document.filename,
        size=document.size,
        content_type=document.content_type,
        uploaded_at=document.uploaded_at.isoformat(),
    )


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="Delete a document",
)
def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid document_id.")

    document = db.query(Document).filter(Document.id == doc_uuid).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    # Remove file from disk
    uploads_dir = _get_uploads_dir()
    file_path = uploads_dir / document.storage_path
    try:
        file_path.unlink(missing_ok=True)
    except OSError as exc:
        logger.warning("Could not delete file %s: %s", file_path, exc)

    db.delete(document)
    db.commit()
    logger.info("Document deleted: doc_id=%s", document_id)
