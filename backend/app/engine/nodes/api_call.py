from __future__ import annotations

from app.engine.nodes.base import BaseNode, NodeResult
from app.engine.nodes.registry import NodeRegistry
from app.services.integrations.api_call_service import ApiCallService


@NodeRegistry.register
class ApiCallNode(BaseNode):
    handler_type = "api_call"

    async def execute(self, context: dict, config: dict) -> NodeResult:
        service = ApiCallService()
        service_config = {
            "url": config.get("url", ""),
            "method": config.get("method", "GET"),
            "headers": config.get("headers", {}),
            "body": config.get("body", ""),
            "auth_type": config.get("auth_type", "none"),
            "auth": config.get("auth", {}),
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
                    raw.update({k: v for k, v in service_config.items() if v})
                    service_config = raw
            finally:
                db.close()

        result = await service.execute(service_config, context)
        success = result.get("success", result.get("status_code", 500) < 400)

        return NodeResult(
            output_data={
                "url": result.get("url", ""),
                "method": result.get("method", config.get("method", "GET")),
                "status_code": result.get("status_code", 0),
                "response": result.get("response"),
                "success": success,
            },
            logs=result.get("logs", []),
        )

    async def validate_config(self, config: dict) -> list[str]:
        return await ApiCallService().validate(config)
