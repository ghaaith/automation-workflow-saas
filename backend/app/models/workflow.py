import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TriggerType(str, enum.Enum):
    DOCUMENT_UPLOADED = "document_uploaded"
    WEBHOOK = "webhook"
    MANUAL = "manual"
    SCHEDULED = "scheduled"


class NodeType(str, enum.Enum):
    TRIGGER = "trigger"
    AI = "ai"
    ACTION = "action"
    CONDITION = "condition"
    DELAY = "delay"
    TRANSFORM = "transform"
    OUTPUT = "output"


class RunStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ExecutionStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"


class Workflow(Base):
    __tablename__ = "workflows"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    trigger_type: Mapped[TriggerType] = mapped_column(
        Enum(TriggerType, name="trigger_type_enum", create_constraint=True),
        nullable=False,
        default=TriggerType.MANUAL,
    )
    trigger_config: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=None)
    is_active: Mapped[bool] = mapped_column(default=True)
    workflow_definition: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True, default=None,
        doc="Full graph definition as JSON: { nodes: [...], edges: [...] }",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    organization: Mapped["Organization"] = relationship(  # noqa: F821
        "Organization", back_populates="workflows"
    )
    nodes: Mapped[list["WorkflowNode"]] = relationship(
        "WorkflowNode",
        back_populates="workflow",
        cascade="all, delete-orphan",
        order_by="WorkflowNode.created_at",
    )
    edges: Mapped[list["WorkflowEdge"]] = relationship(
        "WorkflowEdge",
        back_populates="workflow",
        cascade="all, delete-orphan",
    )
    runs: Mapped[list["WorkflowRun"]] = relationship(
        "WorkflowRun",
        back_populates="workflow",
        cascade="all, delete-orphan",
        order_by="WorkflowRun.started_at.desc()",
    )
    trigger_logs: Mapped[list["WorkflowTriggerLog"]] = relationship(
        "WorkflowTriggerLog",
        back_populates="workflow",
        cascade="all, delete-orphan",
        order_by="WorkflowTriggerLog.created_at.desc()",
    )


class WorkflowNode(Base):
    __tablename__ = "workflow_nodes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    workflow_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workflows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[NodeType] = mapped_column(
        Enum(NodeType, name="node_type_enum", create_constraint=True),
        nullable=False,
    )
    label: Mapped[str] = mapped_column(String, nullable=False)
    config: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    position_x: Mapped[float] = mapped_column(nullable=False, default=0.0)
    position_y: Mapped[float] = mapped_column(nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    workflow: Mapped["Workflow"] = relationship(
        "Workflow", back_populates="nodes"
    )
    outgoing_edges: Mapped[list["WorkflowEdge"]] = relationship(
        "WorkflowEdge",
        back_populates="from_node",
        foreign_keys="WorkflowEdge.from_node_id",
        cascade="all, delete-orphan",
    )
    incoming_edges: Mapped[list["WorkflowEdge"]] = relationship(
        "WorkflowEdge",
        back_populates="to_node",
        foreign_keys="WorkflowEdge.to_node_id",
        cascade="all, delete-orphan",
    )
    executions: Mapped[list["NodeExecution"]] = relationship(
        "NodeExecution",
        back_populates="node",
    )


class WorkflowEdge(Base):
    __tablename__ = "workflow_edges"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    workflow_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workflows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    from_node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workflow_nodes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    to_node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workflow_nodes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    condition_config: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    workflow: Mapped["Workflow"] = relationship(
        "Workflow", back_populates="edges"
    )
    from_node: Mapped["WorkflowNode"] = relationship(
        "WorkflowNode",
        back_populates="outgoing_edges",
        foreign_keys=[from_node_id],
    )
    to_node: Mapped["WorkflowNode"] = relationship(
        "WorkflowNode",
        back_populates="incoming_edges",
        foreign_keys=[to_node_id],
    )


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    workflow_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workflows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[RunStatus] = mapped_column(
        Enum(RunStatus, name="run_status_enum", create_constraint=True),
        nullable=False,
        default=RunStatus.PENDING,
        index=True,
    )
    trigger_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=None)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    workflow: Mapped["Workflow"] = relationship(
        "Workflow", back_populates="runs"
    )
    organization: Mapped["Organization"] = relationship(  # noqa: F821
        "Organization"
    )
    node_executions: Mapped[list["NodeExecution"]] = relationship(
        "NodeExecution",
        back_populates="run",
        cascade="all, delete-orphan",
        order_by="NodeExecution.created_at",
    )


class NodeExecution(Base):
    __tablename__ = "node_executions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workflow_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    node_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workflow_nodes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status: Mapped[ExecutionStatus] = mapped_column(
        Enum(ExecutionStatus, name="execution_status_enum", create_constraint=True),
        nullable=False,
        default=ExecutionStatus.PENDING,
        index=True,
    )
    input_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=None)
    output_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=None)
    logs: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    run: Mapped["WorkflowRun"] = relationship(
        "WorkflowRun", back_populates="node_executions"
    )
    node: Mapped["WorkflowNode | None"] = relationship(
        "WorkflowNode", back_populates="executions"
    )


class TemplateCategory(str, enum.Enum):
    MARKETING = "marketing"
    FINANCE = "finance"
    AUTOMATION = "automation"


class WorkflowTemplate(Base):
    __tablename__ = "workflow_templates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[TemplateCategory] = mapped_column(
        Enum(TemplateCategory, name="template_category_enum", create_constraint=True),
        nullable=False,
    )
    default_nodes: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class WorkflowTriggerLog(Base):
    __tablename__ = "workflow_triggers_log"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    workflow_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workflows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    workflow: Mapped["Workflow"] = relationship(
        "Workflow", back_populates="trigger_logs"
    )
