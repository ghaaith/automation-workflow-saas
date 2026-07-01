from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.models.billing import Plan, PlanTier

logger = logging.getLogger(__name__)

DEFAULT_PLANS = [
    {
        "name": PlanTier.FREE,
        "display_name": "Free",
        "workflow_limit": 5,
        "rate_limit_per_hour": 10,
        "price_cents": 0,
    },
    {
        "name": PlanTier.PRO,
        "display_name": "Pro",
        "workflow_limit": 50,
        "rate_limit_per_hour": 100,
        "price_cents": 2900,
    },
    {
        "name": PlanTier.BUSINESS,
        "display_name": "Business",
        "workflow_limit": 999999,
        "rate_limit_per_hour": 999999,
        "price_cents": 9900,
    },
]


def seed_plans(db: Session) -> None:
    existing_count = db.query(Plan).count()
    if existing_count > 0:
        return

    for plan_data in DEFAULT_PLANS:
        plan = Plan(**plan_data)
        db.add(plan)

    db.commit()
    logger.info("Seeded %d default plans", len(DEFAULT_PLANS))
