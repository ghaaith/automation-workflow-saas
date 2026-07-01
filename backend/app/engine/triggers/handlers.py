from __future__ import annotations

from uuid import UUID

from app.engine.triggers.base import TriggerEvent, TriggerHandler
from app.models.workflow import TriggerType


class DocumentUploadedHandler(TriggerHandler):
    def trigger_type(self) -> TriggerType:
        return TriggerType.DOCUMENT_UPLOADED

    def validate_event(self, event: TriggerEvent) -> list[str]:
        errors: list[str] = []
        payload = event.payload

        doc_id = payload.get("document_id")
        if not doc_id:
            errors.append("document_id is required")

        if doc_id:
            try:
                UUID(str(doc_id))
            except (ValueError, AttributeError):
                errors.append("document_id must be a valid UUID")

        if not payload.get("filename"):
            errors.append("filename is required")

        return errors

    def enrich_trigger_data(self, event: TriggerEvent) -> dict:
        return {
            "trigger_type": "document_uploaded",
            "document_id": str(event.payload.get("document_id", "")),
            "filename": event.payload.get("filename", ""),
            "file_url": event.payload.get("file_url", ""),
            "file_size_bytes": event.payload.get("file_size_bytes", 0),
            "mime_type": event.payload.get("mime_type", ""),
        }


class ManualTriggerHandler(TriggerHandler):
    def trigger_type(self) -> TriggerType:
        return TriggerType.MANUAL

    def validate_event(self, event: TriggerEvent) -> list[str]:
        return []

    def enrich_trigger_data(self, event: TriggerEvent) -> dict:
        return {
            "trigger_type": "manual",
            **event.payload,
        }


class WebhookTriggerHandler(TriggerHandler):
    def trigger_type(self) -> TriggerType:
        return TriggerType.WEBHOOK

    def validate_event(self, event: TriggerEvent) -> list[str]:
        errors: list[str] = []

        payload = event.payload
        workflow_config = payload.get("_workflow_trigger_config", {})

        expected_secret = workflow_config.get("secret")
        if expected_secret:
            provided_secret = (
                payload.get("headers", {}).get("x-webhook-secret")
                or payload.get("headers", {}).get("X-Webhook-Secret")
            )
            if provided_secret != expected_secret:
                errors.append("webhook secret mismatch")

        return errors

    def enrich_trigger_data(self, event: TriggerEvent) -> dict:
        return {
            "trigger_type": "webhook",
            "headers": event.payload.get("headers", {}),
            "body": event.payload.get("body", {}),
            "query_params": event.payload.get("query_params", {}),
        }


class ScheduledTriggerHandler(TriggerHandler):
    def trigger_type(self) -> TriggerType:
        return TriggerType.SCHEDULED

    def validate_event(self, event: TriggerEvent) -> list[str]:
        return []

    def enrich_trigger_data(self, event: TriggerEvent) -> dict:
        return {
            "trigger_type": "scheduled",
            **event.payload,
        }
