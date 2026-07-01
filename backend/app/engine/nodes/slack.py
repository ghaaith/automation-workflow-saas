from __future__ import annotations

from app.engine.nodes.base import BaseNode, NodeResult
from app.engine.nodes.registry import NodeRegistry
from app.services.integrations.slack_service import SlackService


@NodeRegistry.register
class SendSlackNode(BaseNode):
    handler_type = "send_slack"

    async def execute(self, context: dict, config: dict) -> NodeResult:
        service = SlackService()
        service_config = {
            "webhook_url": config.get("webhook_url", ""),
            "bot_token": config.get("bot_token", ""),
            "channel": config.get("channel", "#general"),
            "message": "",
        }

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
                    raw.update({k: v for k, v in service_config.items() if v or k == "message"})
                    service_config = raw
            finally:
                db.close()

        result = await service.execute(service_config, context)

        return NodeResult(
            output_data={
                "channel": result.get("channel", ""),
                "message": result.get("message", ""),
                "sent": result.get("sent", False),
            },
            logs=result.get("logs", []),
        )

    async def validate_config(self, config: dict) -> list[str]:
        return await SlackService().validate(config)
