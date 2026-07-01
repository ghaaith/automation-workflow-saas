from __future__ import annotations

import json

from app.core.config import settings
from app.engine.nodes.base import BaseNode, NodeResult
from app.engine.nodes.registry import NodeRegistry
from app.services.ai_service import DocumentIntelligenceService, OpenAIProvider


@NodeRegistry.register
class AIExtractNode(BaseNode):
    handler_type = "ai_extract"

    async def execute(self, context: dict, config: dict) -> NodeResult:
        source = config.get("source", "")
        schema_json = config.get("schema", "")
        model = config.get("model", settings.OPENAI_MODEL)

        input_text = self._resolve_source(context, source)

        if not input_text:
            return NodeResult(
                output_data={"error": "No input data available", "extracted": None},
                logs=[{"level": "warn", "message": "AI extract skipped — no input data"}],
            )

        if not schema_json:
            return NodeResult(
                output_data={"error": "No output schema configured", "extracted": None},
                logs=[{"level": "warn", "message": "AI extract skipped — no schema provided"}],
            )

        schema_str = schema_json if isinstance(schema_json, str) else json.dumps(schema_json, indent=2)

        provider = OpenAIProvider(api_key=settings.OPENAI_API_KEY, model=model, base_url=settings.OPENAI_BASE_URL)
        service = DocumentIntelligenceService(provider=provider)

        workflow_context = {
            k: v for k, v in context.items()
            if isinstance(v, (str, int, float, bool, list, dict))
        }

        result = await service.structured_extract(
            text=input_text,
            schema_json=schema_str,
            workflow_context=workflow_context,
        )

        if isinstance(result, dict) and "error" in result:
            return NodeResult(
                output_data=result,
                logs=[{"level": "error", "message": result.get("reason", "Extraction failed")}],
            )

        return NodeResult(
            output_data={
                "extracted": result,
                "model_used": model,
                "schema": schema_str,
                "characters_processed": len(input_text),
            },
            logs=[
                {"level": "info", "message": f"AI extraction completed via {model}"},
                {"level": "info", "message": f"Extracted data from {len(input_text)} chars"},
            ],
        )

    async def validate_config(self, config: dict) -> list[str]:
        errors = []
        if not config.get("schema"):
            errors.append("schema is required — provide a JSON schema defining the output structure")
        return errors

    def _resolve_source(self, context: dict, source: str | None) -> str:
        if not source:
            for key, val in context.items():
                if isinstance(val, dict):
                    text = (
                        val.get("text")
                        or val.get("content")
                        or val.get("extracted_text")
                        or json.dumps(val.get("extracted_fields", {}))
                    )
                    if text:
                        return str(text)
        if source and source in context:
            val = context[source]
            if isinstance(val, dict):
                return json.dumps(val)
            return str(val)
        return ""
