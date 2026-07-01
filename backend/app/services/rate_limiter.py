from __future__ import annotations

import logging

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_organization
from app.models.organization import Organization
from app.services.usage_tracker import check_rate_limit

logger = logging.getLogger(__name__)


class RateLimitExceeded(Exception):
    def __init__(self, limit: int) -> None:
        self.limit = limit
        super().__init__(f"Rate limit exceeded: max {limit} runs per hour")


def enforce_workflow_rate_limit(
    org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
) -> None:
    allowed, limit = check_rate_limit(db, org.id)
    if not allowed:
        logger.warning("Rate limit hit for org %s (limit %d/hr)", org.id, limit)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": "Rate limit exceeded",
                "limit": limit,
                "window_hours": 1,
            },
        )
