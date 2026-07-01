from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from uuid import UUID

from app.models.workflow import TriggerType


@dataclass
class TriggerEvent:
    trigger_type: TriggerType
    organization_id: UUID
    workflow_id: UUID | None = None
    payload: dict = field(default_factory=dict)


class TriggerHandler(ABC):
    """Validates and enriches a trigger event before dispatch."""

    @abstractmethod
    def trigger_type(self) -> TriggerType:
        """The trigger type this handler supports."""
        ...

    @abstractmethod
    def validate_event(self, event: TriggerEvent) -> list[str]:
        """Validate the event payload. Return list of error messages (empty = valid)."""
        ...

    def enrich_trigger_data(self, event: TriggerEvent) -> dict:
        """Add handler-specific fields to trigger_data stored in WorkflowRun."""
        return event.payload
