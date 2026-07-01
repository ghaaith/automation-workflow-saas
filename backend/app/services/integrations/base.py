from __future__ import annotations

from abc import ABC, abstractmethod


class BaseIntegrationService(ABC):
    @abstractmethod
    async def execute(self, config: dict, context: dict) -> dict:
        ...

    @abstractmethod
    async def validate(self, config: dict) -> list[str]:
        ...

    @abstractmethod
    async def test_connection(self, config: dict) -> tuple[bool, str]:
        ...
