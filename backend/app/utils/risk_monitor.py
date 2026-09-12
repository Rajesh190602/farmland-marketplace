"""
Step 76 - Fraud / Risk Monitoring

Centralized risk scoring and RiskEvent creation.

This module ONLY creates risk events.
It does NOT suspend, ban, delete, reject, or otherwise
automatically punish users.
"""

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models import (
    ActivityLog,
    LandOffer,
    LandReport,
    RiskEvent,
    UserReport,
)


# =========================================================
# RISK CONSTANTS
# =========================================================

RISK_LEVEL_LOW = "LOW"
RISK_LEVEL_MEDIUM = "MEDIUM"
RISK_LEVEL_HIGH = "HIGH"
RISK_LEVEL_CRITICAL = "CRITICAL"

RISK_STATUS_OPEN = "OPEN"
RISK_STATUS_REVIEWING = "REVIEWING"
RISK_STATUS_RESOLVED = "RESOLVED"
RISK_STATUS_DISMISSED = "DISMISSED"


# =========================================================
# RISK LEVEL
# =========================================================

def get_risk_level(score: int) -> str:
    """
    Convert a numeric risk score into a risk level.
    """

    score = max(int(score or 0), 0)

    if score >= 75:
        return RISK_LEVEL_CRITICAL

    if score >= 50:
        return RISK_LEVEL_HIGH

    if score >= 25:
        return RISK_LEVEL_MEDIUM

    return RISK_LEVEL_LOW


# =========================================================
# CREATE RISK EVENT
# =========================================================

def create_risk_event(
    db: Session,
    *,
    event_type: str,
    risk_score: int,
    description: str | None = None,
    user_id: int | None = None,
    target_type: str | None = None,
    target_id: int | None = None,
) -> RiskEvent:
    """
    Create a new RiskEvent.

    Duplicate OPEN/REVIEWING events with the same event type
    and target are avoided.
    """

    existing_query = (
        db.query(RiskEvent)
        .filter(
            RiskEvent.event_type == event_type,
            RiskEvent.status.in_([
                RISK_STATUS_OPEN,
                RISK_STATUS_REVIEWING,
            ]),
        )
    )

    if user_id is None:
        existing_query = existing_query.filter(
            RiskEvent.user_id.is_(None)
        )
    else:
        existing_query = existing_query.filter(
            RiskEvent.user_id == user_id
        )

    if target_type is None:
        existing_query = existing_query.filter(
            RiskEvent.target_type.is_(None)
        )
    else:
        existing_query = existing_query.filter(
            RiskEvent.target_type == target_type
        )

    if target_id is None:
        existing_query = existing_query.filter(
            RiskEvent.target_id.is_(None)
        )
    else:
        existing_query = existing_query.filter(
            RiskEvent.target_id == target_id
        )

    existing = existing_query.first()

    if existing:
        return existing

    score = max(int(risk_score or 0), 0)

    event = RiskEvent(
        user_id=user_id,
        event_type=event_type,
        risk_score=score,
        risk_level=get_risk_level(score),
        description=description,
        target_type=target_type,
        target_id=target_id,
        status=RISK_STATUS_OPEN,
    )

    db.add(event)
    db.flush()

    return event


# =========================================================
# REPORT RISK
# =========================================================

def check_user_report_risk(
    db: Session,
    reported_user_id: int,
    *,
    window_hours: int = 24,
    threshold: int = 3,
) -> RiskEvent | None:
    """
    Check whether a user has received reports from enough
    distinct reporters during the configured time window.
    """

    since = datetime.utcnow() - timedelta(hours=window_hours)

    reports = (
        db.query(UserReport)
        .filter(
            UserReport.reported_user_id == reported_user_id,
            UserReport.created_at >= since,
        )
        .all()
    )

    distinct_reporters = {
        report.reporter_id
        for report in reports
        if report.reporter_id != reported_user_id
    }

    if len(distinct_reporters) < threshold:
        return None

    score = 25

    if len(distinct_reporters) >= 5:
        score += 25

    if len(distinct_reporters) >= 10:
        score += 25

    return create_risk_event(
        db,
        event_type="MULTIPLE_REPORTS",
        risk_score=score,
        user_id=reported_user_id,
        target_type="USER",
        target_id=reported_user_id,
        description=(
            f"User received reports from "
            f"{len(distinct_reporters)} distinct reporters "
            f"within the last {window_hours} hours."
        ),
    )


def check_land_report_risk(
    db: Session,
    land_id: int,
    *,
    window_hours: int = 24,
    threshold: int = 3,
) -> RiskEvent | None:
    """
    Check whether a land listing has received reports from
    enough distinct reporters during the configured window.
    """

    since = datetime.utcnow() - timedelta(hours=window_hours)

    reports = (
        db.query(LandReport)
        .filter(
            LandReport.land_id == land_id,
            LandReport.created_at >= since,
        )
        .all()
    )

    distinct_reporters = {
        report.reporter_id
        for report in reports
    }

    if len(distinct_reporters) < threshold:
        return None

    score = 25

    if len(distinct_reporters) >= 5:
        score += 25

    if len(distinct_reporters) >= 10:
        score += 25

    return create_risk_event(
        db,
        event_type="MULTIPLE_REPORTS",
        risk_score=score,
        target_type="LAND",
        target_id=land_id,
        description=(
            f"Land listing received reports from "
            f"{len(distinct_reporters)} distinct reporters "
            f"within the last {window_hours} hours."
        ),
    )


# =========================================================
# RAPID OFFER RISK
# =========================================================

def check_rapid_offer_risk(
    db: Session,
    buyer_id: int,
    *,
    window_minutes: int = 30,
    threshold: int = 5,
) -> RiskEvent | None:
    """
    Detect unusually high offer creation volume by one buyer.

    This is intentionally conservative because legitimate buyers
    may make several offers.
    """

    since = datetime.utcnow() - timedelta(minutes=window_minutes)

    count = (
        db.query(LandOffer)
        .filter(
            LandOffer.buyer_id == buyer_id,
            LandOffer.created_at >= since,
        )
        .count()
    )

    if count < threshold:
        return None

    score = 20

    if count >= 10:
        score += 25

    if count >= 20:
        score += 30

    return create_risk_event(
        db,
        event_type="RAPID_OFFERS",
        risk_score=score,
        user_id=buyer_id,
        target_type="USER",
        target_id=buyer_id,
        description=(
            f"Buyer created {count} offers within "
            f"the last {window_minutes} minutes."
        ),
    )


# =========================================================
# REPEATED KYC FAILURE
# =========================================================

def check_repeated_kyc_failure_risk(
    db: Session,
    user_id: int,
    *,
    window_days: int = 30,
    threshold: int = 2,
) -> RiskEvent | None:
    """
    Detect repeated KYC rejection/change requests from ActivityLog.

    KYC verification itself is one-to-one, so historical review
    actions are read from ActivityLog.
    """

    since = datetime.utcnow() - timedelta(days=window_days)

    failures = (
        db.query(ActivityLog)
        .filter(
            ActivityLog.user_id == user_id,
            ActivityLog.action.in_([
                "KYC_REJECT",
                "KYC_CHANGES_REQUESTED",
            ]),
            ActivityLog.created_at >= since,
        )
        .count()
    )

    if failures < threshold:
        return None

    score = 30

    if failures >= 4:
        score += 25

    if failures >= 6:
        score += 20

    return create_risk_event(
        db,
        event_type="REPEATED_KYC_FAILURE",
        risk_score=score,
        user_id=user_id,
        target_type="USER",
        target_id=user_id,
        description=(
            f"User had {failures} KYC rejection/change-request "
            f"actions within the last {window_days} days."
        ),
    )