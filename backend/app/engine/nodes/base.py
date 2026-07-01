from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class NodeResult:
    output_data: dict = field(default_factory=dict)
    logs: list[dict] = field(default_factory=list)
    branch: str | None = None


class BaseNode(ABC):
    handler_type: str

    @abstractmethod
    async def execute(self, context: dict, config: dict) -> NodeResult: ...

    @abstractmethod
    async def validate_config(self, config: dict) -> list[str]: ...
