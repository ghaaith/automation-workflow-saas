from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.billing import Plan, PlanTier, UsageEventType, UsageLog

logger = logging.getLogger(__name__)


def log_usage(
    db: Session,
    organization_id: UUID,
    event_type: UsageEventType,
    metadata: dict | None = None,
) -> UsageLog:
    log_entry = UsageLog(
        organization_id=organization_id,
        event_type=event_type,
        event_metadata=metadata or {},
    )
    db.add(log_entry)
    db.flush()
    return log_entry


def count_org_usage_in_window(
    db: Session,
    organization_id: UUID,
    event_type: UsageEventType | None = None,
    window_minutes: int = 60,
) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)
    query = db.query(func.count(UsageLog.id)).filter(
        UsageLog.organization_id == organization_id,
        UsageLog.created_at >= cutoff,
    )
    if event_type:
        query = query.filter(UsageLog.event_type == event_type)
    return query.scalar() or 0


def get_org_plan(db: Session, organization_id: UUID) -> Plan | None:
    from app.models.billing import OrganizationSubscription

    sub = (
        db.query(OrganizationSubscription)
        .filter(
            OrganizationSubscription.organization_id == organization_id,
            OrganizationSubscription.status == "active",
        )
        .first()
    )
    if sub:
        return sub.plan

    default_plan = (
        db.query(Plan).filter(Plan.name == PlanTier.PRO).first()
    )
    return default_plan


def check_rate_limit(db: Session, organization_id: UUID) -> tuple[bool, int]:
    plan = get_org_plan(db, organization_id)
    if plan is None:
        return True, 0

    if plan.name == PlanTier.BUSINESS:
        return True, 0

    current_count = count_org_usage_in_window(db, organization_id, UsageEventType.WORKFLOW_RUN, 60)
    if current_count >= plan.rate_limit_per_hour:
        return False, plan.rate_limit_per_hour

    return True, plan.rate_limit_per_hour
