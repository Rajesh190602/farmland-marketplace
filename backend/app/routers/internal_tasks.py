import hmac
import os

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.listing_expiry import sync_all_published_listings


router = APIRouter(
    prefix="/internal",
    tags=["Internal Tasks"],
)


@router.post("/listing-expiry")
def process_listing_expiry(
    x_cron_secret: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    expected_secret = os.getenv("LISTING_EXPIRY_CRON_SECRET")

    if not expected_secret:
        raise HTTPException(
            status_code=503,
            detail="Listing expiry scheduler is not configured.",
        )

    if not x_cron_secret or not hmac.compare_digest(
        x_cron_secret,
        expected_secret,
    ):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized.",
        )

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