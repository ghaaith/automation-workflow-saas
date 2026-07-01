from __future__ import annotations

from app.core.config import settings
from app.engine.nodes.base import BaseNode, NodeResult
from app.engine.nodes.registry import NodeRegistry
from app.services.integrations.email_service import EmailService
from app.services.integrations.resend_service import ResendService


@NodeRegistry.register
class SendEmailNode(BaseNode):
    handler_type = "send_email"

    async def execute(self, context: dict, config: dict) -> NodeResult:
        has_resend_key = config.get("resend_api_key") or settings.RESEND_API_KEY
        use_resend = config.get("email_provider", "") == "resend" or (has_resend_key and not config.get("smtp_host"))

        service_config = {
            "to": config.get("to", ""),
            "subject": config.get("subject", "Workflow Notification"),
            "body": config.get("body", "Your workflow has been processed."),
            "from_email": config.get("from_email", ""),
        }

        if use_resend:
            service_config["resend_api_key"] = config.get("resend_api_key", "")
            service = ResendService()
        else:
            service_config.update({
                "cc": config.get("cc", ""),
                "bcc": config.get("bcc", ""),
                "smtp_host": config.get("smtp_host", ""),
                "smtp_port": config.get("smtp_port", 587),
                "smtp_user": config.get("smtp_user", ""),
                "smtp_password": config.get("smtp_password", ""),
            })
            service = EmailService()

        if config.get("integration_id"):
            from app.core.database import SessionLocal
            from app.models.integration import Integration

            db = SessionLocal()
            try:
                integration = db.query(Integration).filter(
                    Integration.id == config["integration_id"]
                ).first()
                if integration:
                    raw = dict(integration.config)
                    raw.update({k: v for k, v in service_config.items() if v})
                    service_config = raw
            finally:
                db.close()

        result = await service.execute(service_config, context)

        return NodeResult(
            output_data={
                "to": result.get("to", ""),
                "subject": result.get("subject", ""),
                "body_preview": result.get("body_preview", ""),
                "sent": result.get("sent", False),
            },
            logs=result.get("logs", []),
        )

    async def validate_config(self, config: dict) -> list[str]:
        errors = []
        if not config.get("to"):
            errors.append("recipient (to) is required")
        return errors
