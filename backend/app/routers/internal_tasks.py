import hmac
import os
import time

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db, engine
from app.utils.listing_expiry import sync_all_published_listings
from app.utils.notification_worker import (
    process_notification_delivery_jobs,
)

router = APIRouter(
    prefix="/internal",
    tags=["Internal Tasks"],
)


def _validate_internal_secret(x_cron_secret: str | None) -> None:
    expected_secret = os.getenv("LISTING_EXPIRY_CRON_SECRET")

    if not expected_secret:
        raise HTTPException(
            status_code=503,
            detail="Internal task secret is not configured.",
        )

    if not x_cron_secret or not hmac.compare_digest(
        x_cron_secret,
        expected_secret,
    ):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized.",
        )


@router.post("/listing-expiry")
def process_listing_expiry(
    x_cron_secret: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    _validate_internal_secret(x_cron_secret)

    try:
        changed = sync_all_published_listings(db)

        return {
            "message": "Listing expiry processing completed.",
            "changes_made": changed,
        }

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Listing expiry processing failed.",
        )


@router.get("/db-pool-health")
def measure_db_pool_health(
    x_cron_secret: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    """
    Step 2E production diagnostic.

    Measures the SQLAlchemy connection acquisition and a simple SELECT 1
    from the deployed Render backend to Neon PostgreSQL.

    This endpoint does not modify database data and must remain protected
    by the existing internal task secret.
    """
    _validate_internal_secret(x_cron_secret)

    pool_before = engine.pool.status()

    try:
        connection_start = time.perf_counter()

        # SQLAlchemy SessionLocal is lazy: get_db creates the Session,
        # but the database connection is normally acquired when the
        # Session first needs it. db.connection() therefore measures
        # connection acquisition from the production backend.
        connection = db.connection()

        connection_acquired_ms = (
            time.perf_counter() - connection_start
        ) * 1000

        query_start = time.perf_counter()
        connection.exec_driver_sql("SELECT 1")
        select_1_ms = (time.perf_counter() - query_start) * 1000

        return {
            "message": "Database pool measurement completed.",
            "environment": os.getenv("ENVIRONMENT", "unknown"),
            "pool_configuration": {
                "pool_size": engine.pool.size(),
                "checked_in_connections": engine.pool.checkedin(),
                "checked_out_connections": engine.pool.checkedout(),
                "overflow": engine.pool.overflow(),
            },
            "pool_status_before": pool_before,
            "pool_status_after": engine.pool.status(),
            "measurement_ms": {
                "connection_acquired": round(connection_acquired_ms, 2),
                "select_1": round(select_1_ms, 2),
            },
        }

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database pool measurement failed.",
        )
@router.post("/notification-delivery")
def process_notification_delivery(
    x_cron_secret: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    """
    Process a bounded batch of pending notification delivery jobs.

    External email and push delivery happens outside the original
    marketplace transaction.
    """
    _validate_internal_secret(x_cron_secret)

    try:
        result = process_notification_delivery_jobs(
            db=db,
            batch_size=10,
        )

        return {
            "message": "Notification delivery processing completed.",
            **result,
        }

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Notification delivery processing failed.",
        )
