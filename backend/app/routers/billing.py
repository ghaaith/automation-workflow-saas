from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_organization, get_current_user
from app.models.billing import Plan, PlanTier, SubscriptionStatus, UsageEventType, UsageLog, OrganizationSubscription
from app.models.organization import Organization
from app.models.user import User
from app.models.workflow import RunStatus, Workflow, WorkflowRun
from app.schemas.billing import (
    AdminSystemStats,
    AdminUsageSummary,
    PlanResponse,
    SubscriptionWithPlanResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["billing"])
admin_router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/subscription", response_model=SubscriptionWithPlanResponse)
def get_my_subscription(
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> OrganizationSubscription:
    sub = (
        db.query(OrganizationSubscription)
        .filter(
            OrganizationSubscription.organization_id == org.id,
            OrganizationSubscription.status == SubscriptionStatus.ACTIVE,
        )
        .first()
    )
    if not sub:
        plan = db.query(Plan).filter(Plan.name == PlanTier.PRO).first()
        sub = OrganizationSubscription(
            organization_id=org.id,
            plan_id=plan.id,
            status=SubscriptionStatus.ACTIVE,
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)

    return sub


@router.get("/plans", response_model=list[PlanResponse])
def list_plans(
    db: Session = Depends(get_db),
) -> list[Plan]:
    return db.query(Plan).order_by(Plan.price_cents).all()


@router.get("/usage/my")
def get_my_usage(
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> dict:
    now = datetime.now(timezone.utc)
    hour_ago = now - timedelta(hours=1)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    hourly_runs = (
        db.query(func.count(UsageLog.id))
        .filter(
            UsageLog.organization_id == org.id,
            UsageLog.event_type == UsageEventType.WORKFLOW_RUN,
            UsageLog.created_at >= hour_ago,
        )
        .scalar()
        or 0
    )

    daily_ai_calls = (
        db.query(func.count(UsageLog.id))
        .filter(
            UsageLog.organization_id == org.id,
            UsageLog.event_type == UsageEventType.AI_CALL,
            UsageLog.created_at >= today_start,
        )
        .scalar()
        or 0
    )

    total_runs = (
        db.query(func.count(UsageLog.id))
        .filter(
            UsageLog.organization_id == org.id,
            UsageLog.event_type == UsageEventType.WORKFLOW_RUN,
        )
        .scalar()
        or 0
    )

    return {
        "hourly_workflow_runs": hourly_runs,
        "daily_ai_calls": daily_ai_calls,
        "total_workflow_runs": total_runs,
    }


@admin_router.get("/usage-summary", response_model=AdminUsageSummary)
def admin_usage_summary(
    db: Session = Depends(get_db),
) -> AdminUsageSummary:
    return AdminUsageSummary(
        total_users=db.query(func.count(User.id)).scalar() or 0,
        total_organizations=db.query(func.count(Organization.id)).scalar() or 0,
        total_workflows=db.query(func.count(Workflow.id)).scalar() or 0,
        total_executions=db.query(func.count(WorkflowRun.id))
        .filter(WorkflowRun.status.in_([RunStatus.SUCCESS, RunStatus.FAILED, RunStatus.RUNNING]))
        .scalar() or 0,
        total_usage_logs=db.query(func.count(UsageLog.id)).scalar() or 0,
    )


@admin_router.get("/system-stats", response_model=AdminSystemStats)
def admin_system_stats(
    db: Session = Depends(get_db),
) -> AdminSystemStats:
    now = datetime.now(timezone.utc)
    twenty_four_hours_ago = now - timedelta(hours=24)

    orgs_by_plan = (
        db.query(Plan.name, func.count(OrganizationSubscription.organization_id))
        .join(OrganizationSubscription, Plan.id == OrganizationSubscription.plan_id, isouter=True)
        .group_by(Plan.name)
        .all()
    )

    usage_by_type = (
        db.query(UsageLog.event_type, func.count(UsageLog.id))
        .group_by(UsageLog.event_type)
        .all()
    )

    return AdminSystemStats(
        total_users=db.query(func.count(User.id)).scalar() or 0,
        total_workflows=db.query(func.count(Workflow.id)).scalar() or 0,
        total_executions=db.query(func.count(WorkflowRun.id))
        .filter(WorkflowRun.status.in_([RunStatus.SUCCESS, RunStatus.FAILED, RunStatus.RUNNING]))
        .scalar() or 0,
        total_usage_logs=db.query(func.count(UsageLog.id)).scalar() or 0,
        organizations_by_plan={str(row[0].value if hasattr(row[0], 'value') else row[0]): row[1] for row in orgs_by_plan},
        usage_by_event_type={str(row[0].value if hasattr(row[0], 'value') else row[0]): row[1] for row in usage_by_type},
        recent_runs_24h=db.query(func.count(UsageLog.id))
        .filter(
            UsageLog.event_type == UsageEventType.WORKFLOW_RUN,
            UsageLog.created_at >= twenty_four_hours_ago,
        )
        .scalar() or 0,
        active_workflows=db.query(func.count(Workflow.id))
        .filter(Workflow.is_active == True)
        .scalar() or 0,
    )
