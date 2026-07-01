from __future__ import annotations

import json

from app.engine.nodes.base import BaseNode, NodeResult
from app.engine.nodes.registry import NodeRegistry


@NodeRegistry.register
class AISummarizeNode(BaseNode):
    handler_type = "ai_summarize"

    async def execute(self, context: dict, config: dict) -> NodeResult:
        source = config.get("source", "")
        prompt = config.get("prompt", "Summarize the key points")
        max_length = config.get("max_length", 200)
        model = config.get("model", "gpt-4")

        input_text = self._resolve_source(context, source)

        if not input_text:
            return NodeResult(
                output_data={"error": "No input data", "summary": ""},
                logs=[{"level": "warn", "message": "AI summarize skipped — no input"}],
            )

        summary = self._simulate_summary(input_text, max_length)

        return NodeResult(
            output_data={
                "summary": summary,
                "model_used": model,
                "max_length": max_length,
                "characters_processed": len(input_text),
            },
            logs=[
                {"level": "info", "message": f"AI summarization completed via {model}"},
                {"level": "info", "message": f"Summary: {len(summary)} chars from {len(input_text)} input chars"},
            ],
        )

    async def validate_config(self, config: dict) -> list[str]:
        errors = []
        if not config.get("prompt"):
            errors.append("prompt is required")
        return errors

    def _resolve_source(self, context: dict, source: str | None) -> str:
        if not source:
            for val in context.values():
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

    def _simulate_summary(self, text: str, max_length: int) -> str:
        words = text.split()
        summary_words = words[:40]
        summary = " ".join(summary_words)
        if len(words) > 40:
            summary += "..."
        if len(summary) > max_length:
            summary = summary[:max_length] + "..."
        return summary
