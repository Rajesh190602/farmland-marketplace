from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models import Land, LandAvailability, ListingExpiry, Notification
from app.utils.activity_log import create_activity_log


# Step 57: approved marketplace listings are published for 30 days by default.
LISTING_EXPIRY_DAYS = 30
EXPIRING_SOON_DAYS = 7


def get_listing_expiry(db: Session, land_id: int):
    return (
        db.query(ListingExpiry)
        .filter(ListingExpiry.land_id == land_id)
        .first()
    )


def ensure_listing_expiry(
    db: Session,
    land: Land,
    now: datetime | None = None,
):
    """Create an expiry record when a published listing has none yet."""
    now = now or datetime.utcnow()
    expiry = get_listing_expiry(db, land.id)

    if expiry:
        return expiry

    expiry = ListingExpiry(
        land_id=land.id,
        published_at=now,
        expires_at=now + timedelta(days=LISTING_EXPIRY_DAYS),
        renewal_count=0,
        expired_at=None,
    )
    db.add(expiry)
    db.flush()
    return expiry


def start_or_renew_listing_expiry(
    db: Session,
    land: Land,
    now: datetime | None = None,
):
    """Start a fresh 30-day period when Admin publishes or farmer renews."""
    now = now or datetime.utcnow()
    expiry = get_listing_expiry(db, land.id)

    if not expiry:
        expiry = ListingExpiry(
            land_id=land.id,
            published_at=now,
            expires_at=now + timedelta(days=LISTING_EXPIRY_DAYS),
            renewal_count=0,
            expired_at=None,
        )
        db.add(expiry)
    else:
        expiry.published_at = now
        expiry.expires_at = now + timedelta(days=LISTING_EXPIRY_DAYS)
        expiry.renewed_at = now
        expiry.renewal_count = int(expiry.renewal_count or 0) + 1
        expiry.expired_at = None
        expiry.updated_at = now

    db.flush()
    return expiry


def sync_listing_expiry(
    db: Session,
    land: Land,
    now: datetime | None = None,
):
    """Expire an available published listing when its expiry date is reached.

    Reserved and sold listings are never automatically expired because their
    marketplace lifecycle is already controlled by the reservation/sale flow.
    """
    now = now or datetime.utcnow()

    if land.status != "approved" or not land.is_published:
        return get_listing_expiry(db, land.id), False

    expiry = ensure_listing_expiry(db, land, now)

    if expiry.expires_at > now:
        return expiry, False

    availability = (
        db.query(LandAvailability)
        .filter(LandAvailability.land_id == land.id)
        .first()
    )
    availability_status = (
        availability.status.lower()
        if availability and availability.status
        else "available"
    )

    if availability_status in {"reserved", "sold"}:
        return expiry, False

    land.is_published = False
    expiry.expired_at = expiry.expired_at or now
    expiry.updated_at = now

    notification = Notification(
        user_id=land.owner_id,
        title="Listing Expired",
        message=(
            f'Your land listing "{land.title}" has expired and is no longer '
            "visible to buyers. Renew the listing from My Lands to publish it again."
        ),
        target_type="land",
        target_id=land.id,
    )
    db.add(notification)

    create_activity_log(
        db=db,
        user_id=land.owner_id,
        action="EXPIRE_LAND_LISTING",
        description=f'Listing "{land.title}" expired and was unpublished.',
        target_type="LAND",
        target_id=land.id,
    )

    return expiry, True


def sync_all_published_listings(db: Session):
    """Synchronize expiry state for currently published approved listings."""
    now = datetime.utcnow()
    lands = (
        db.query(Land)
        .filter(
            Land.status == "approved",
            Land.is_published == True,
        )
        .all()
    )

    changed = False
    for land in lands:
        _, expired = sync_listing_expiry(db, land, now)
        changed = changed or expired

    # Creating missing expiry records is also a database change.
    if lands:
        db.commit()

    return changed


def get_expiry_status(expiry: ListingExpiry | None, is_published: bool):
    if not expiry:
        return "published" if is_published else "unpublished"

    now = datetime.utcnow()
    if expiry.expired_at or expiry.expires_at <= now:
        return "expired"

    if not is_published:
        return "unpublished"

    if expiry.expires_at <= now + timedelta(days=EXPIRING_SOON_DAYS):
        return "expiring_soon"

    return "active"
