from __future__ import annotations

import re

from app.engine.nodes.base import BaseNode, NodeResult
from app.engine.nodes.registry import NodeRegistry


@NodeRegistry.register
class ConditionNode(BaseNode):
    handler_type = "condition"

    async def execute(self, context: dict, config: dict) -> NodeResult:
        expression = config.get("expression", "")
        source_field = config.get("source_field", "")

        if not expression:
            return NodeResult(
                output_data={"branch": "default", "evaluated": False},
                logs=[{"level": "warn", "message": "No expression defined, using default branch"}],
            )

        resolved = self._resolve_expression(expression, context, source_field)
        result = self._evaluate(resolved)
        branch = "true" if result else "false"

        logs = [
            {"level": "info", "message": f"Condition evaluated: {resolved} = {result}"},
            {"level": "info", "message": f"Following branch: {branch}"},
        ]

        return NodeResult(
            output_data={
                "expression": expression,
                "resolved": resolved,
                "result": result,
                "branch": branch,
            },
            logs=logs,
            branch=branch,
        )

    async def validate_config(self, config: dict) -> list[str]:
        errors = []
        if not config.get("expression"):
            errors.append("expression is required for condition nodes")
        return errors

    def _resolve_expression(self, expression: str, context: dict, source_field: str) -> str:
        def replace_var(match: re.Match) -> str:
            path = match.group(1).strip()
            parts = path.split(".")
            val: dict | str | int | float | None = context
            for part in parts:
                if isinstance(val, dict):
                    val = val.get(part)
                else:
                    return "null"
            if val is None:
                return "null"
            if isinstance(val, (int, float)):
                return str(val)
            if isinstance(val, bool):
                return str(val).lower()
            return f'"{str(val)}"'

        resolved = re.sub(r"\{\{(.*?)\}\}", replace_var, expression)
        return resolved

    def _evaluate(self, resolved: str) -> bool:
        resolved = resolved.strip()

        if resolved == "true":
            return True
        if resolved == "false":
            return False
        if resolved == "null":
            return False

        operators = [
            (r"(\d+(?:\.\d+)?)\s*>\s*(\d+(?:\.\d+)?)", lambda m: float(m.group(1)) > float(m.group(2))),
            (r"(\d+(?:\.\d+)?)\s*<\s*(\d+(?:\.\d+)?)", lambda m: float(m.group(1)) < float(m.group(2))),
            (r"(\d+(?:\.\d+)?)\s*>=\s*(\d+(?:\.\d+)?)", lambda m: float(m.group(1)) >= float(m.group(2))),
            (r"(\d+(?:\.\d+)?)\s*<=\s*(\d+(?:\.\d+)?)", lambda m: float(m.group(1)) <= float(m.group(2))),
            (r"(\d+(?:\.\d+)?)\s*==\s*(\d+(?:\.\d+)?)", lambda m: float(m.group(1)) == float(m.group(2))),
            (r"(\d+(?:\.\d+)?)\s*!=\s*(\d+(?:\.\d+)?)", lambda m: float(m.group(1)) != float(m.group(2))),
            (r'"([^"]*)"\s*==\s*"([^"]*)"', lambda m: m.group(1) == m.group(2)),
            (r'"([^"]*)"\s*!=\s*"([^"]*)"', lambda m: m.group(1) != m.group(2)),
            (r'"([^"]*)"\s*in\s*"([^"]*)"', lambda m: m.group(1) in m.group(2)),
        ]

        for pattern, handler in operators:
            m = re.match(pattern, resolved)
            if m:
                return handler(m)

        return bool(resolved) if resolved else False
