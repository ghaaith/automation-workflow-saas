import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(
        String, unique=True, nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    memberships: Mapped[list["OrganizationMember"]] = relationship(  # noqa: F821
        "OrganizationMember",
        back_populates="organization",
        cascade="all, delete-orphan",
    )
    workflows: Mapped[list["Workflow"]] = relationship(  # noqa: F821
        "Workflow", back_populates="organization"
    )
    workflow_runs: Mapped[list["WorkflowRun"]] = relationship(  # noqa: F821
        "WorkflowRun", back_populates="organization"
    )
    integrations: Mapped[list["Integration"]] = relationship(  # noqa: F821
        "Integration", back_populates="organization", cascade="all, delete-orphan"
    )
    usage_logs: Mapped[list["UsageLog"]] = relationship(  # noqa: F821
        "UsageLog", back_populates="organization", cascade="all, delete-orphan"
    )
