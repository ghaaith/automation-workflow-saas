from __future__ import annotations

from app.engine.nodes.base import BaseNode


class NodeRegistry:
    _handlers: dict[str, type[BaseNode]] = {}

    @classmethod
    def register(cls, handler: type[BaseNode]) -> type[BaseNode]:
        cls._handlers[handler.handler_type] = handler
        return handler

    @classmethod
    def get(cls, handler_type: str) -> type[BaseNode]:
        handler = cls._handlers.get(handler_type)
        if not handler:
            msg = f"Unknown node handler: {handler_type}"
            raise ValueError(msg)
        return handler

    @classmethod
    def list_types(cls) -> list[str]:
        return list(cls._handlers.keys())
