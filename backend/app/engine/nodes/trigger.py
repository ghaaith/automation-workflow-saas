from __future__ import annotations

import logging

from app.core.database import SessionLocal
from app.engine.nodes.base import BaseNode, NodeResult
from app.engine.nodes.registry import NodeRegistry
from app.models.document import Document

logger = logging.getLogger(__name__)


@NodeRegistry.register
class DocumentUploadedTrigger(BaseNode):
    handler_type = "trigger_document_uploaded"

    async def execute(self, context: dict, config: dict) -> NodeResult:
        document_id = config.get("document_id")
        filename = config.get("filename", "unknown")
        file_url = config.get("file_url", "")

        text_content = ""
        if document_id:
            try:
                db = SessionLocal()
                try:
                    doc = db.query(Document).filter(Document.id == document_id).first()
                    if doc and doc.extracted_text:
                        text_content = doc.extracted_text
                finally:
                    db.close()
            except Exception as e:
                logger.warning("Failed to load document text: %s", e)

        extracted = {
            "document_id": document_id,
            "filename": filename,
            "file_url": file_url,
            "file_type": filename.rsplit(".", 1)[-1].lower() if "." in filename else "unknown",
            "text": text_content,
            "content": text_content,
            "extracted_text": text_content,
            "triggered_at": context.get("triggered_at"),
        }

        return NodeResult(
            output_data=extracted,
            logs=[{"level": "info", "message": f"Document trigger fired: {filename}"}],
        )

    async def validate_config(self, config: dict) -> list[str]:
        errors = []
        if not config.get("document_id"):
            errors.append("document_id is required")
        if not config.get("filename"):
            errors.append("filename is required")
        return errors


@NodeRegistry.register
class WebhookTrigger(BaseNode):
    handler_type = "trigger_webhook"

    async def execute(self, context: dict, config: dict) -> NodeResult:
        payload = config.get("payload", {})
        return NodeResult(
            output_data={"payload": payload},
            logs=[{"level": "info", "message": "Webhook trigger fired"}],
        )

    async def validate_config(self, config: dict) -> list[str]:
        return []
