from datetime import datetime, timezone,timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.utils.activity_log import create_activity_log
from app.models import (
    User,
    Land,
    LandAvailability,
    LandInquiry,
    LandOffer,
    OfferNegotiationHistory,
    Reservation,
    SiteVisit,
    Notification,
    LandReport,
    UserReport,
)
from app.schemas import (
    LandAvailabilityResponse,
    LandInquiryCreate,
    LandInquiryResponse,
    LandInquiryStatusUpdate,
    LandOfferCreate,
    LandOfferResponse,
    LandOfferStatusUpdate,
    LandOfferCounterCreate,
    OfferNegotiationHistoryResponse,
    ReservationCreate,
    ReservationResponse,
    ReservationStatusUpdate,
    SiteVisitCreate,
    SiteVisitResponse,
    SiteVisitStatusUpdate,
    LandReportCreate,
    LandReportResponse,
    UserReportCreate,
    UserReportResponse,
)


router = APIRouter(
    prefix="/marketplace",
    tags=["Marketplace"],
)


# =========================================================
# HELPERS
# =========================================================

def get_user(
    db: Session,
    user_id: int,
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    return user


def get_land(
    db: Session,
    land_id: int,
):
    land = (
        db.query(Land)
        .filter(Land.id == land_id)
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found",
        )

    return land


def require_buyer(
    db: Session,
    user_id: int,
):
    user = get_user(db, user_id)

    if user.role != "buyer":
        raise HTTPException(
            status_code=403,
            detail="Only buyers can perform this action.",
        )

    return user


def require_farmer(
    db: Session,
    user_id: int,
):
    user = get_user(db, user_id)

    if user.role != "farmer":
        raise HTTPException(
            status_code=403,
            detail="Only farmers can perform this action.",
        )

    return user


def get_or_create_availability(
    db: Session,
    land: Land,
):
    availability = (
        db.query(LandAvailability)
        .filter(
            LandAvailability.land_id == land.id
        )
        .first()
    )

    if not availability:
        availability = LandAvailability(
            land_id=land.id,
            status="available",
        )

        db.add(availability)
        db.commit()
        db.refresh(availability)

    return availability


# =========================================================
# STEP 49 - LISTING LIFECYCLE RULES
# =========================================================
#
# Approval/publication and marketplace availability are separate
# concepts. A listing must be approved before its availability can
# be changed. Once approved, marketplace availability follows the
# controlled lifecycle below:
#
#   Available <-> Reserved -> Sold
#
# A listing cannot jump directly from Available to Sold, and a Sold
# listing cannot be reopened directly by a farmer.
#
ALLOWED_AVAILABILITY_TRANSITIONS = {
    "available": {"available", "reserved"},
    "reserved": {"reserved", "available", "sold"},
    "sold": {"sold"},
}


def get_or_create_availability_for_update(
    db: Session,
    land: Land,
):
    """Load a listing availability row with a row lock for lifecycle updates."""
    availability = (
        db.query(LandAvailability)
        .filter(
            LandAvailability.land_id == land.id
        )
        .with_for_update()
        .first()
    )

    if not availability:
        availability = LandAvailability(
            land_id=land.id,
            status="available",
        )
        db.add(availability)
        db.flush()

    return availability


def validate_availability_transition(
    current_status: str,
    requested_status: str,
):
    """Return a clear API error when a farmer attempts an invalid transition."""
    current = (current_status or "available").strip().lower()
    requested = (requested_status or "").strip().lower()

    allowed = ALLOWED_AVAILABILITY_TRANSITIONS.get(
        current,
        set(),
    )

    if requested not in allowed:
        if current == "available" and requested == "sold":
            detail = (
                "A land listing cannot be marked Sold directly from Available. "
                "Mark it Reserved first, then mark it Sold after the deal is completed."
            )
        elif current == "sold" and requested != "sold":
            detail = (
                "Sold land cannot be reopened directly. "
                "Contact an administrator if a correction is required."
            )
        else:
            detail = (
                f"Invalid availability transition: {current} -> {requested}. "
                "Allowed lifecycle is Available -> Reserved -> Sold, "
                "with Reserved -> Available allowed when a reservation is cancelled."
            )

        raise HTTPException(
            status_code=400,
            detail=detail,
        )

    return current, requested


def notify(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    target_type: str = "marketplace",
    target_id: int | None = None,
):
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        target_type=target_type,
        target_id=target_id,
    )

    db.add(notification)


# =========================================================
# LAND AVAILABILITY
# =========================================================

@router.get(
    "/lands/{land_id}/availability",
    response_model=LandAvailabilityResponse,
)
def get_land_availability(
    land_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    land = get_land(db, land_id)

    availability = get_or_create_availability(
        db,
        land,
    )

    # A farmer may see availability only for
    # their own land.
    if land.owner_id != current_user:
        user = get_user(
            db,
            current_user,
        )

        if user.role not in ["buyer", "admin"]:
            raise HTTPException(
                status_code=403,
                detail="You are not allowed to view this land.",
            )

        if land.status != "approved":
            raise HTTPException(
                status_code=404,
                detail="Approved land not found.",
            )

    return availability


@router.put(
    "/lands/{land_id}/availability",
    response_model=LandAvailabilityResponse,
)
def update_land_availability(
    land_id: int,
    data: LandAvailabilityResponse,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    """
    Step 49: enforce the complete farmer listing availability lifecycle.

    Approval status and publication remain controlled by Admin.
    Marketplace availability is controlled by the land owner only
    through these transitions:

        Available -> Reserved
        Reserved  -> Available
        Reserved  -> Sold

    A direct Available -> Sold transition is rejected, and Sold
    listings cannot be reopened directly.
    """
    farmer = require_farmer(
        db,
        current_user,
    )

    land = get_land(
        db,
        land_id,
    )

    if land.owner_id != farmer.id:
        raise HTTPException(
            status_code=403,
            detail="You can update availability only for your own land.",
        )

    if land.status != "approved":
        raise HTTPException(
            status_code=400,
            detail=(
                "Only approved land can be marked available, "
                "reserved, or sold."
            ),
        )

    requested_status = (
        data.status or ""
    ).strip().lower()

    if requested_status not in {
        "available",
        "reserved",
        "sold",
    }:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid availability status. "
                "Use available, reserved, or sold."
            ),
        )

    availability = get_or_create_availability_for_update(
        db,
        land,
    )

    current_status, requested_status = validate_availability_transition(
        availability.status,
        requested_status,
    )

    # No-op updates are safe and do not create duplicate activity logs.
    if current_status == requested_status:
        db.refresh(availability)
        return availability

    availability.status = requested_status
    availability.updated_at = datetime.utcnow()

    # If a listing is marked Sold, close stale pending marketplace
    # requests so buyers cannot continue acting on a completed listing.
    if requested_status == "sold":
        pending_inquiries = (
            db.query(LandInquiry)
            .filter(
                LandInquiry.land_id == land.id,
                LandInquiry.status == "pending",
            )
            .all()
        )

        for inquiry in pending_inquiries:
            inquiry.status = "rejected"
            inquiry.updated_at = datetime.utcnow()
            notify(
                db,
                inquiry.buyer_id,
                "🔴 Land Sold",
                (
                    f"Your inquiry for '{land.title}' was closed "
                    "because the land has been marked sold."
                ),
                "inquiry",
                inquiry.id,
            )

        pending_offers = (
            db.query(LandOffer)
            .filter(
                LandOffer.land_id == land.id,
                LandOffer.status == "pending",
            )
            .all()
        )

        for offer in pending_offers:
            offer.status = "rejected"
            offer.updated_at = datetime.utcnow()
            notify(
                db,
                offer.buyer_id,
                "🔴 Land Sold",
                (
                    f"Your offer for '{land.title}' was closed "
                    "because the land has been marked sold."
                ),
                "offer",
                offer.id,
            )

        pending_visits = (
            db.query(SiteVisit)
            .filter(
                SiteVisit.land_id == land.id,
                SiteVisit.status == "pending",
            )
            .all()
        )

        for visit in pending_visits:
            visit.status = "cancelled"
            visit.updated_at = datetime.utcnow()
            notify(
                db,
                visit.buyer_id,
                "🔴 Land Sold",
                (
                    f"Your site visit request for '{land.title}' "
                    "was cancelled because the land has been marked sold."
                ),
                "site_visit",
                visit.id,
            )

    create_activity_log(
        db=db,
        user_id=farmer.id,
        action="UPDATE_LAND_AVAILABILITY",
        description=(
            f'Changed land "{land.title}" availability '
            f"from {current_status} to {requested_status}."
        ),
        target_type="LAND",
        target_id=land.id,
    )

    db.commit()
    db.refresh(availability)

    return availability


# =========================================================
# BUYER - SEND INQUIRY
# =========================================================

@router.post(
    "/inquiries",
    response_model=LandInquiryResponse,
)
def create_inquiry(
    data: LandInquiryCreate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    buyer = require_buyer(
        db,
        current_user,
    )

    land = get_land(
        db,
        data.land_id,
    )

    if land.status != "approved":
        raise HTTPException(
            status_code=404,
            detail="Approved land not found.",
        )

    if land.owner_id == buyer.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot send an inquiry for your own land.",
        )

    availability = get_or_create_availability(
        db,
        land,
    )

    if availability.status != "available":
        raise HTTPException(
            status_code=400,
            detail=(
                f"This land is currently "
                f"{availability.status}."
            ),
        )

    message = (
        data.message or ""
    ).strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Inquiry message cannot be empty.",
        )

    existing = (
        db.query(LandInquiry)
        .filter(
            LandInquiry.land_id == land.id,
            LandInquiry.buyer_id == buyer.id,
            LandInquiry.status == "pending",
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="You already have a pending inquiry for this land.",
        )
        # ----------------------------------
    # ANTI-SPAM COOLDOWN
    # ----------------------------------

    recent_inquiry = (
        db.query(LandInquiry)
        .filter(
            LandInquiry.land_id == land.id,
            LandInquiry.buyer_id == buyer.id,
            LandInquiry.created_at >= (
                datetime.utcnow() - timedelta(minutes=5)
            ),
        )
        .first()
    )

    if recent_inquiry:
        raise HTTPException(
            status_code=429,
            detail="Please wait 5 minutes before sending another inquiry for this land.",
        )

    inquiry = LandInquiry(
        land_id=land.id,
        buyer_id=buyer.id,
        message=message,
        status="pending",
    )

    db.add(inquiry)
    db.flush()
    notify(
        db,
        land.owner_id,
        "🌾 New Land Inquiry",
        (
            f"{buyer.full_name} is interested in "
            f"your land '{land.title}'."
        ),
        "inquiry",
        inquiry.id,
    )

    db.commit()
    db.refresh(inquiry)

    return inquiry


# =========================================================
# FARMER - VIEW INQUIRIES
# =========================================================

@router.get(
    "/inquiries/received",
    response_model=list[LandInquiryResponse],
)
def get_received_inquiries(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    farmer = require_farmer(
        db,
        current_user,
    )

    inquiries = (
        db.query(LandInquiry)
        .join(
            Land,
            Land.id == LandInquiry.land_id,
        )
        .filter(
            Land.owner_id == farmer.id
        )
        .order_by(
            LandInquiry.created_at.desc()
        )
        .all()
    )

    return inquiries


# =========================================================
# BUYER - VIEW MY INQUIRIES
# =========================================================

@router.get(
    "/inquiries/my",
    response_model=list[LandInquiryResponse],
)
def get_my_inquiries(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    buyer = require_buyer(
        db,
        current_user,
    )

    return (
        db.query(LandInquiry)
        .filter(
            LandInquiry.buyer_id == buyer.id
        )
        .order_by(
            LandInquiry.created_at.desc()
        )
        .all()
    )


# =========================================================
# UPDATE INQUIRY STATUS
# =========================================================

@router.put(
    "/inquiries/{inquiry_id}/status",
    response_model=LandInquiryResponse,
)
def update_inquiry_status(
    inquiry_id: int,
    data: LandInquiryStatusUpdate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    farmer = require_farmer(
        db,
        current_user,
    )

    inquiry = (
        db.query(LandInquiry)
        .filter(
            LandInquiry.id == inquiry_id
        )
        .first()
    )

    if not inquiry:
        raise HTTPException(
            status_code=404,
            detail="Inquiry not found.",
        )

    land = get_land(
        db,
        inquiry.land_id,
    )

    if land.owner_id != farmer.id:
        raise HTTPException(
            status_code=403,
            detail="You can update only inquiries for your own land.",
        )

    status = (
        data.status or ""
    ).strip().lower()

    if status not in {
        "pending",
        "accepted",
        "rejected",
    }:
        raise HTTPException(
            status_code=400,
            detail="Invalid inquiry status.",
        )

    inquiry.status = status
    inquiry.updated_at = datetime.utcnow()

    if status == "accepted":
        notify(
            db,
            inquiry.buyer_id,
            "✅ Inquiry Accepted",
            (
                f"Your inquiry for '{land.title}' "
                f"was accepted by the farmer."
            ),
            "inquiry",
            inquiry.id,
        )

    elif status == "rejected":
        notify(
            db,
            inquiry.buyer_id,
            "❌ Inquiry Rejected",
            (
                f"Your inquiry for '{land.title}' "
                f"was rejected by the farmer."
            ),
            "inquiry",
            inquiry.id,
        )

    db.commit()
    db.refresh(inquiry)

    return inquiry


# =========================================================
# STEP 50 - OFFER NEGOTIATION / COUNTER-OFFER
# =========================================================

# The existing LandOffer row remains the active negotiation.
# Every offer/counter/status action is also stored in
# OfferNegotiationHistory so the complete negotiation is preserved.


def get_offer_for_update(db: Session, offer_id: int):
    offer = (
        db.query(LandOffer)
        .filter(LandOffer.id == offer_id)
        .with_for_update()
        .first()
    )

    if not offer:
        raise HTTPException(
            status_code=404,
            detail="Offer not found.",
        )

    return offer


def get_latest_offer_history(db: Session, offer: LandOffer):
    return (
        db.query(OfferNegotiationHistory)
        .filter(OfferNegotiationHistory.offer_id == offer.id)
        .order_by(OfferNegotiationHistory.id.desc())
        .first()
    )


def validate_offer_turn(db: Session, offer: LandOffer, current_user: int, land: Land):
    latest = get_latest_offer_history(db, offer)

    # Legacy offers created before Step 50 have no history. Their first
    # response is always the farmer's response because the original offer
    # was submitted by the buyer.
    if latest is None:
        if current_user != land.owner_id:
            raise HTTPException(
                status_code=409,
                detail="The offer is waiting for the farmer's response.",
            )
        return None

    if latest.sender_id == current_user:
        waiting_for = "buyer" if latest.sender_role == "farmer" else "farmer"
        raise HTTPException(
            status_code=409,
            detail=f"The offer is waiting for the {waiting_for}'s response.",
        )

    return latest


def add_offer_history(
    db: Session,
    offer: LandOffer,
    sender_id: int,
    sender_role: str,
    action: str,
    amount: float,
    message: str | None = None,
):
    history = OfferNegotiationHistory(
        offer_id=offer.id,
        sender_id=sender_id,
        sender_role=sender_role,
        action=action,
        amount=amount,
        message=message,
    )
    db.add(history)
    db.flush()
    return history


@router.post(
    "/offers",
    response_model=LandOfferResponse,
)
def create_offer(
    data: LandOfferCreate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    buyer = require_buyer(db, current_user)
    land = get_land(db, data.land_id)

    if land.status != "approved":
        raise HTTPException(
            status_code=404,
            detail="Approved land not found.",
        )

    if land.owner_id == buyer.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot make an offer on your own land.",
        )

    availability = get_or_create_availability(db, land)
    if availability.status != "available":
        raise HTTPException(
            status_code=400,
            detail=(
                f"Offers cannot be submitted because this land is "
                f"{availability.status}."
            ),
        )

    if data.amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Offer amount must be greater than zero.",
        )

    existing = (
        db.query(LandOffer)
        .filter(
            LandOffer.land_id == land.id,
            LandOffer.buyer_id == buyer.id,
            LandOffer.status == "pending",
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="You already have an active offer for this land.",
        )

    recent_offer = (
        db.query(LandOffer)
        .filter(
            LandOffer.land_id == land.id,
            LandOffer.buyer_id == buyer.id,
            LandOffer.created_at >= (datetime.utcnow() - timedelta(minutes=5)),
        )
        .first()
    )
    if recent_offer:
        raise HTTPException(
            status_code=429,
            detail="Please wait 5 minutes before submitting another offer for this land.",
        )

    message = (data.message or "").strip() or None

    offer = LandOffer(
        land_id=land.id,
        buyer_id=buyer.id,
        amount=data.amount,
        message=message,
        status="pending",
    )
    db.add(offer)
    db.flush()

    add_offer_history(
        db=db,
        offer=offer,
        sender_id=buyer.id,
        sender_role="buyer",
        action="offer",
        amount=data.amount,
        message=message,
    )

    notify(
        db,
        land.owner_id,
        "💰 New Land Offer",
        (
            f"{buyer.full_name} submitted an offer of "
            f"₹{data.amount:,.2f} for '{land.title}'."
        ),
        "offer",
        offer.id,
    )

    create_activity_log(
        db=db,
        user_id=buyer.id,
        action="CREATE_OFFER",
        description=(
            f'Submitted offer of ₹{data.amount:,.2f} for land "{land.title}".'
        ),
        target_type="OFFER",
        target_id=offer.id,
    )

    db.commit()
    db.refresh(offer)
    return offer


@router.get(
    "/offers/received",
    response_model=list[LandOfferResponse],
)
def get_received_offers(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    farmer = require_farmer(db, current_user)
    return (
        db.query(LandOffer)
        .join(Land, Land.id == LandOffer.land_id)
        .filter(Land.owner_id == farmer.id)
        .order_by(LandOffer.updated_at.desc(), LandOffer.created_at.desc())
        .all()
    )


@router.get(
    "/offers/my",
    response_model=list[LandOfferResponse],
)
def get_my_offers(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    buyer = require_buyer(db, current_user)
    return (
        db.query(LandOffer)
        .filter(LandOffer.buyer_id == buyer.id)
        .order_by(LandOffer.updated_at.desc(), LandOffer.created_at.desc())
        .all()
    )


@router.get(
    "/offers/{offer_id}/history",
    response_model=list[OfferNegotiationHistoryResponse],
)
def get_offer_history(
    offer_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    offer = db.query(LandOffer).filter(LandOffer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found.")

    land = get_land(db, offer.land_id)
    if current_user not in {offer.buyer_id, land.owner_id}:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to view this offer negotiation.",
        )

    history = (
        db.query(OfferNegotiationHistory)
        .filter(OfferNegotiationHistory.offer_id == offer.id)
        .order_by(OfferNegotiationHistory.created_at.asc(), OfferNegotiationHistory.id.asc())
        .all()
    )

    # Legacy offer compatibility: expose its original offer as history even
    # when the database predates Step 50 and has no history row.
    if not history:
        history = [
            OfferNegotiationHistory(
                id=0,
                offer_id=offer.id,
                sender_id=offer.buyer_id,
                sender_role="buyer",
                action="offer",
                amount=offer.amount,
                message=offer.message,
                created_at=offer.created_at,
            )
        ]

    return history


def get_active_reservation_for_land(
    db: Session,
    land_id: int,
    lock: bool = False,
):
    query = (
        db.query(Reservation)
        .filter(
            Reservation.land_id == land_id,
            Reservation.status.in_(["pending", "confirmed"]),
        )
    )
    if lock:
        query = query.with_for_update()
    return query.order_by(Reservation.id.desc()).first()


def create_confirmed_reservation_for_offer(
    db: Session,
    offer: LandOffer,
    land: Land,
):
    """Create the Step 51 reservation that represents an accepted offer."""
    existing = (
        db.query(Reservation)
        .filter(Reservation.offer_id == offer.id)
        .first()
    )
    if existing:
        if existing.status == "confirmed":
            return existing
        raise HTTPException(
            status_code=409,
            detail="A reservation already exists for this accepted offer.",
        )

    confirmed = (
        db.query(Reservation)
        .filter(
            Reservation.land_id == land.id,
            Reservation.status == "confirmed",
        )
        .with_for_update()
        .first()
    )
    if confirmed and confirmed.buyer_id != offer.buyer_id:
        raise HTTPException(
            status_code=409,
            detail="This land already has a confirmed reservation.",
        )

    pending_reservations = (
        db.query(Reservation)
        .filter(
            Reservation.land_id == land.id,
            Reservation.status == "pending",
            Reservation.buyer_id != offer.buyer_id,
        )
        .with_for_update()
        .all()
    )
    for other_reservation in pending_reservations:
        other_reservation.status = "rejected"
        other_reservation.updated_at = datetime.utcnow()
        notify(
            db,
            other_reservation.buyer_id,
            "❌ Reservation Rejected",
            f"Another negotiated offer was accepted for '{land.title}'.",
            "reservation",
            other_reservation.id,
        )

    active = (
        db.query(Reservation)
        .filter(
            Reservation.land_id == land.id,
            Reservation.buyer_id == offer.buyer_id,
            Reservation.status.in_(["pending", "confirmed"]),
        )
        .with_for_update()
        .first()
    )

    if active:
        reservation = active
        reservation.offer_id = offer.id
        reservation.amount = offer.amount
        reservation.message = offer.message
        reservation.status = "confirmed"
    else:
        reservation = Reservation(
            land_id=land.id,
            buyer_id=offer.buyer_id,
            farmer_id=land.owner_id,
            offer_id=offer.id,
            amount=offer.amount,
            status="confirmed",
            message=offer.message,
        )
        db.add(reservation)
        db.flush()

    now = datetime.utcnow()
    reservation.updated_at = now
    reservation.confirmed_at = reservation.confirmed_at or now
    reservation.cancelled_at = None
    db.flush()
    return reservation


@router.post(
    "/reservations",
    response_model=ReservationResponse,
)
def create_reservation(
    data: ReservationCreate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    buyer = require_buyer(db, current_user)
    land = get_land(db, data.land_id)

    if land.status != "approved":
        raise HTTPException(status_code=404, detail="Approved land not found.")
    if land.owner_id == buyer.id:
        raise HTTPException(status_code=400, detail="You cannot reserve your own land.")

    availability = get_or_create_availability_for_update(db, land)
    if availability.status != "available":
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"This land is currently {availability.status} and cannot be reserved.",
        )

    if data.offer_id is not None:
        offer = (
            db.query(LandOffer)
            .filter(LandOffer.id == data.offer_id)
            .with_for_update()
            .first()
        )
        if not offer:
            db.rollback()
            raise HTTPException(status_code=404, detail="Offer not found.")
        if offer.land_id != land.id or offer.buyer_id != buyer.id:
            db.rollback()
            raise HTTPException(status_code=403, detail="This offer does not belong to you for this land.")
        if offer.status != "accepted":
            db.rollback()
            raise HTTPException(status_code=400, detail="Only an accepted offer can be attached to a reservation.")
        amount = offer.amount
        message = offer.message
    else:
        offer = None
        # A direct reservation uses the current published listing price.
        # Negotiated pricing is represented by an accepted offer instead.
        amount = land.price
        if amount <= 0:
            db.rollback()
            raise HTTPException(status_code=400, detail="The land listing price must be greater than zero.")
        message = (data.message or "").strip() or None

    existing_buyer = (
        db.query(Reservation)
        .filter(
            Reservation.land_id == land.id,
            Reservation.buyer_id == buyer.id,
            Reservation.status.in_(["pending", "confirmed"]),
        )
        .first()
    )
    if existing_buyer:
        db.rollback()
        raise HTTPException(status_code=409, detail="You already have an active reservation for this land.")

    reservation = Reservation(
        land_id=land.id,
        buyer_id=buyer.id,
        farmer_id=land.owner_id,
        offer_id=offer.id if offer else None,
        amount=amount,
        status="pending",
        message=message,
    )
    db.add(reservation)
    db.flush()

    notify(
        db,
        land.owner_id,
        "📌 Reservation Request",
        f"{buyer.full_name} requested a reservation for '{land.title}'.",
        "reservation",
        reservation.id,
    )
    create_activity_log(
        db=db,
        user_id=buyer.id,
        action="CREATE_RESERVATION",
        description=f'Requested reservation for land "{land.title}".',
        target_type="RESERVATION",
        target_id=reservation.id,
    )

    db.commit()
    db.refresh(reservation)
    return reservation


@router.get(
    "/reservations/my",
    response_model=list[ReservationResponse],
)
def get_my_reservations(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    buyer = require_buyer(db, current_user)
    return (
        db.query(Reservation)
        .filter(Reservation.buyer_id == buyer.id)
        .order_by(Reservation.updated_at.desc(), Reservation.created_at.desc())
        .all()
    )


@router.get(
    "/reservations/received",
    response_model=list[ReservationResponse],
)
def get_received_reservations(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    farmer = require_farmer(db, current_user)
    return (
        db.query(Reservation)
        .filter(Reservation.farmer_id == farmer.id)
        .order_by(Reservation.updated_at.desc(), Reservation.created_at.desc())
        .all()
    )


def _update_reservation_status(
    reservation_id: int,
    data: ReservationStatusUpdate,
    db: Session,
    current_user: int,
):
    reservation = (
        db.query(Reservation)
        .filter(Reservation.id == reservation_id)
        .with_for_update()
        .first()
    )
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found.")

    land = get_land(db, reservation.land_id)
    actor = get_user(db, current_user)
    if current_user not in {reservation.buyer_id, reservation.farmer_id}:
        raise HTTPException(status_code=403, detail="You are not part of this reservation.")

    status = (data.status or "").strip().lower()
    allowed = {"confirmed", "rejected", "cancelled"}
    if status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid reservation status. Use confirmed, rejected, or cancelled.")

    if reservation.status in {"rejected", "cancelled"}:
        raise HTTPException(status_code=409, detail=f"This reservation is already {reservation.status} and cannot be changed.")

    if status == "confirmed":
        if actor.role != "farmer" or reservation.farmer_id != current_user:
            raise HTTPException(status_code=403, detail="Only the farmer can confirm a reservation.")
        if reservation.status != "pending":
            raise HTTPException(status_code=409, detail="Only a pending reservation can be confirmed.")

        availability = get_or_create_availability_for_update(db, land)
        if availability.status != "available":
            raise HTTPException(status_code=409, detail=f"This land is currently {availability.status}.")

        competing = (
            db.query(Reservation)
            .filter(
                Reservation.land_id == land.id,
                Reservation.id != reservation.id,
                Reservation.status == "pending",
            )
            .with_for_update()
            .all()
        )
        for other in competing:
            other.status = "rejected"
            other.updated_at = datetime.utcnow()
            notify(
                db,
                other.buyer_id,
                "❌ Reservation Rejected",
                f"Another reservation was confirmed for '{land.title}'.",
                "reservation",
                other.id,
            )

        availability.status = "reserved"
        availability.updated_at = datetime.utcnow()
        reservation.status = "confirmed"
        reservation.confirmed_at = datetime.utcnow()
        reservation.updated_at = datetime.utcnow()

        notify(
            db,
            reservation.buyer_id,
            "✅ Reservation Confirmed",
            f"Your reservation for '{land.title}' has been confirmed by the farmer.",
            "reservation",
            reservation.id,
        )
        action = "CONFIRM_RESERVATION"

    elif status == "rejected":
        if actor.role != "farmer" or reservation.farmer_id != current_user:
            raise HTTPException(status_code=403, detail="Only the farmer can reject a reservation.")
        if reservation.status != "pending":
            raise HTTPException(status_code=409, detail="Only a pending reservation can be rejected.")
        reservation.status = "rejected"
        reservation.updated_at = datetime.utcnow()
        notify(
            db,
            reservation.buyer_id,
            "❌ Reservation Rejected",
            f"Your reservation request for '{land.title}' was rejected by the farmer.",
            "reservation",
            reservation.id,
        )
        action = "REJECT_RESERVATION"

    else:  # cancelled
        if actor.role == "buyer":
            if reservation.buyer_id != current_user:
                raise HTTPException(status_code=403, detail="You can cancel only your own reservation.")
        elif actor.role == "farmer":
            if reservation.farmer_id != current_user:
                raise HTTPException(status_code=403, detail="You can cancel only reservations for your own land.")
        else:
            raise HTTPException(status_code=403, detail="Only the buyer or farmer can cancel a reservation.")

        if reservation.status == "confirmed":
            availability = get_or_create_availability_for_update(db, land)
            if availability.status != "reserved":
                raise HTTPException(status_code=409, detail=f"This land is currently {availability.status}.")
            availability.status = "available"
            availability.updated_at = datetime.utcnow()

        reservation.status = "cancelled"
        reservation.cancelled_at = datetime.utcnow()
        reservation.updated_at = datetime.utcnow()

        other_user_id = reservation.farmer_id if actor.role == "buyer" else reservation.buyer_id
        notify(
            db,
            other_user_id,
            "⚠️ Reservation Cancelled",
            f"The reservation for '{land.title}' was cancelled by the {actor.role}.",
            "reservation",
            reservation.id,
        )
        action = "CANCEL_RESERVATION"

    create_activity_log(
        db=db,
        user_id=current_user,
        action=action,
        description=f'{actor.role.title()} {status} reservation #{reservation.id} for land "{land.title}".',
        target_type="RESERVATION",
        target_id=reservation.id,
    )

    db.commit()
    db.refresh(reservation)
    return reservation


@router.put(
    "/reservations/{reservation_id}/status",
    response_model=ReservationResponse,
)
def update_reservation_status(
    reservation_id: int,
    data: ReservationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    return _update_reservation_status(reservation_id, data, db, current_user)


def _update_offer_status(
    offer_id: int,
    data: LandOfferStatusUpdate,
    db: Session,
    current_user: int,
):
    offer = get_offer_for_update(db, offer_id)

    if offer.status != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"This offer is already {offer.status} and cannot be changed.",
        )

    land = get_land(db, offer.land_id)
    if current_user not in {offer.buyer_id, land.owner_id}:
        raise HTTPException(
            status_code=403,
            detail="Only the buyer or farmer involved in this offer can respond.",
        )

    actor = get_user(db, current_user)
    validate_offer_turn(db, offer, current_user, land)

    status = (data.status or "").strip().lower()
    if status not in {"accepted", "rejected"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid offer status. Use accepted or rejected.",
        )

    if status == "accepted":
        availability = get_or_create_availability_for_update(db, land)
        if availability.status != "available":
            raise HTTPException(
                status_code=400,
                detail=f"This land is currently {availability.status}.",
            )

        availability.status = "reserved"
        availability.updated_at = datetime.utcnow()

        # Step 51: an accepted negotiated offer is represented by a confirmed reservation.
        create_confirmed_reservation_for_offer(db, offer, land)

        other_offers = (
            db.query(LandOffer)
            .filter(
                LandOffer.land_id == land.id,
                LandOffer.id != offer.id,
                LandOffer.status == "pending",
            )
            .all()
        )
        for other_offer in other_offers:
            other_offer.status = "rejected"
            other_offer.updated_at = datetime.utcnow()
            notify(
                db,
                other_offer.buyer_id,
                "❌ Offer Rejected",
                f"Another offer was accepted for '{land.title}'.",
                "offer",
                other_offer.id,
            )

    offer.status = status
    offer.updated_at = datetime.utcnow()
    add_offer_history(
        db=db,
        offer=offer,
        sender_id=current_user,
        sender_role=actor.role,
        action=status,
        amount=offer.amount,
        message=offer.message,
    )

    if status == "accepted":
        notify(
            db,
            offer.buyer_id,
            "✅ Offer Accepted",
            f"Your offer of ₹{offer.amount:,.2f} for '{land.title}' was accepted.",
            "offer",
            offer.id,
        )
    else:
        other_user_id = land.owner_id if current_user == offer.buyer_id else offer.buyer_id
        notify(
            db,
            other_user_id,
            "❌ Offer Rejected",
            f"The offer for '{land.title}' was rejected by the {actor.role}.",
            "offer",
            offer.id,
        )

    create_activity_log(
        db=db,
        user_id=current_user,
        action="ACCEPT_OFFER" if status == "accepted" else "REJECT_OFFER",
        description=(
            f'{actor.role.title()} {status} offer #{offer.id} for land "{land.title}" '
            f'at ₹{offer.amount:,.2f}.'
        ),
        target_type="OFFER",
        target_id=offer.id,
    )

    db.commit()
    db.refresh(offer)
    return offer


@router.put(
    "/offers/{offer_id}/status",
    response_model=LandOfferResponse,
)
def update_offer_status(
    offer_id: int,
    data: LandOfferStatusUpdate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    return _update_offer_status(offer_id, data, db, current_user)


@router.post(
    "/offers/{offer_id}/counter",
    response_model=LandOfferResponse,
)
def counter_offer(
    offer_id: int,
    data: LandOfferCounterCreate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    offer = get_offer_for_update(db, offer_id)

    if offer.status != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"This offer is already {offer.status} and cannot be negotiated further.",
        )

    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Counter-offer amount must be greater than zero.")

    land = get_land(db, offer.land_id)
    if current_user not in {offer.buyer_id, land.owner_id}:
        raise HTTPException(
            status_code=403,
            detail="Only the buyer or farmer involved in this offer can counter it.",
        )

    actor = get_user(db, current_user)
    validate_offer_turn(db, offer, current_user, land)

    availability = get_or_create_availability(db, land)
    if availability.status != "available":
        raise HTTPException(
            status_code=400,
            detail=f"Counter-offers cannot be made because this land is {availability.status}.",
        )

    message = (data.message or "").strip() or None
    offer.amount = data.amount
    offer.message = message
    offer.updated_at = datetime.utcnow()

    add_offer_history(
        db=db,
        offer=offer,
        sender_id=current_user,
        sender_role=actor.role,
        action="counter",
        amount=data.amount,
        message=message,
    )

    recipient_id = land.owner_id if current_user == offer.buyer_id else offer.buyer_id
    notify(
        db,
        recipient_id,
        "🔄 New Counter-Offer",
        (
            f"{actor.full_name} countered the offer for '{land.title}' "
            f"with ₹{data.amount:,.2f}."
        ),
        "offer",
        offer.id,
    )

    create_activity_log(
        db=db,
        user_id=current_user,
        action="COUNTER_OFFER",
        description=(
            f'{actor.role.title()} countered offer #{offer.id} for land "{land.title}" '
            f'at ₹{data.amount:,.2f}.'
        ),
        target_type="OFFER",
        target_id=offer.id,
    )

    db.commit()
    db.refresh(offer)
    return offer



# =========================================================
# BUYER - REQUEST SITE VISIT
# =========================================================

@router.post(
    "/site-visits",
    response_model=SiteVisitResponse,
)
def create_site_visit(
    data: SiteVisitCreate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    buyer = require_buyer(
        db,
        current_user,
    )

    land = get_land(
        db,
        data.land_id,
    )

    if land.status != "approved":
        raise HTTPException(
            status_code=404,
            detail="Approved land not found.",
        )

    if land.owner_id == buyer.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot request a visit for your own land.",
        )

    availability = get_or_create_availability(
        db,
        land,
    )

    if availability.status != "available":
        raise HTTPException(
            status_code=400,
            detail=(
                f"Site visits cannot be requested because "
                f"this land is {availability.status}."
            ),
        )

    requested_date = data.requested_date

    if requested_date.tzinfo is not None:
        requested_date = requested_date.astimezone(
            timezone.utc
        ).replace(
            tzinfo=None
        )

    if requested_date <= datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="Site visit date must be in the future.",
        )

    existing = (
        db.query(SiteVisit)
        .filter(
            SiteVisit.land_id == land.id,
            SiteVisit.buyer_id == buyer.id,
            SiteVisit.status == "pending",
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="You already have a pending site visit request for this land.",
        )
        # ----------------------------------
    # ANTI-SPAM COOLDOWN
    # ----------------------------------

    recent_visit = (
        db.query(SiteVisit)
        .filter(
            SiteVisit.land_id == land.id,
            SiteVisit.buyer_id == buyer.id,
            SiteVisit.created_at >= (
                datetime.utcnow() - timedelta(minutes=5)
            ),
        )
        .first()
    )

    if recent_visit:
        raise HTTPException(
            status_code=429,
            detail="Please wait 5 minutes before requesting another site visit for this land.",
        )

    visit = SiteVisit(
        land_id=land.id,
        buyer_id=buyer.id,
        requested_date=requested_date,
        message=data.message,
        status="pending",
    )

    db.add(visit)
    db.flush()
    notify(
        db,
        land.owner_id,
        "📅 New Site Visit Request",
        (
            f"{buyer.full_name} requested a site visit "
            f"for '{land.title}'."
        ),
        "site_visit",
        visit.id,
    )

    db.commit()
    db.refresh(visit)

    return visit


# =========================================================
# FARMER - RECEIVED SITE VISITS
# =========================================================

@router.get(
    "/site-visits/received",
    response_model=list[SiteVisitResponse],
)
def get_received_site_visits(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    farmer = require_farmer(
        db,
        current_user,
    )

    return (
        db.query(SiteVisit)
        .join(
            Land,
            Land.id == SiteVisit.land_id,
        )
        .filter(
            Land.owner_id == farmer.id
        )
        .order_by(
            SiteVisit.requested_date.asc()
        )
        .all()
    )


# =========================================================
# BUYER - MY SITE VISITS
# =========================================================

@router.get(
    "/site-visits/my",
    response_model=list[SiteVisitResponse],
)
def get_my_site_visits(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    buyer = require_buyer(
        db,
        current_user,
    )

    return (
        db.query(SiteVisit)
        .filter(
            SiteVisit.buyer_id == buyer.id
        )
        .order_by(
            SiteVisit.requested_date.asc()
        )
        .all()
    )


# =========================================================
# FARMER - UPDATE SITE VISIT
# =========================================================

@router.put(
    "/site-visits/{visit_id}/status",
    response_model=SiteVisitResponse,
)
def update_site_visit_status(
    visit_id: int,
    data: SiteVisitStatusUpdate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    farmer = require_farmer(
        db,
        current_user,
    )

    visit = (
        db.query(SiteVisit)
        .filter(
            SiteVisit.id == visit_id
        )
        .first()
    )

    if not visit:
        raise HTTPException(
            status_code=404,
            detail="Site visit not found.",
        )

    land = get_land(
        db,
        visit.land_id,
    )

    if land.owner_id != farmer.id:
        raise HTTPException(
            status_code=403,
            detail="You can update only site visits for your own land.",
        )

    status = (
        data.status or ""
    ).strip().lower()

    allowed_statuses = {
        "pending",
        "accepted",
        "rejected",
        "completed",
        "cancelled",
    }

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid site visit status.",
        )

    visit.status = status
    visit.updated_at = datetime.utcnow()

    if status == "accepted":
        notify(
            db,
            visit.buyer_id,
            "✅ Site Visit Accepted",
            (
                f"Your site visit request for "
                f"'{land.title}' was accepted."
            ),
            "site_visit",
            visit.id,
        )

    elif status == "rejected":
        notify(
            db,
            visit.buyer_id,
            "❌ Site Visit Rejected",
            (
                f"Your site visit request for "
                f"'{land.title}' was rejected."
            ),
            "site_visit",
            visit.id,
        )

    elif status == "completed":
        notify(
            db,
            visit.buyer_id,
            "🏡 Site Visit Completed",
            (
                f"The site visit for '{land.title}' "
                f"has been marked completed."
            ),
            "site_visit",
            visit.id,
        )

    elif status == "cancelled":
        notify(
            db,
            visit.buyer_id,
            "⚠️ Site Visit Cancelled",
            (
                f"The site visit for '{land.title}' "
                f"has been cancelled."
            ),
            "site_visit",
            visit.id,
        )

    db.commit()
    db.refresh(visit)

    return visit

# =========================================================
# PHASE 2 - TRUST & SAFETY
# #8 REPORT LAND
# =========================================================

@router.post(
    "/lands/{land_id}/report",
    response_model=LandReportResponse,
)
def report_land(
    land_id: int,
    data: LandReportCreate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    """
    Allow an authenticated user to report an approved land listing.

    A report only creates a pending moderation record. It does not
    automatically hide, delete, reserve, or change the land status.
    """

    # The path and body must refer to the same land.
    if data.land_id != land_id:
        raise HTTPException(
            status_code=400,
            detail="Land ID in the request does not match the selected land.",
        )

    reporter = get_user(
        db,
        current_user,
    )

    land = get_land(
        db,
        land_id,
    )

    if land.status != "approved":
        raise HTTPException(
            status_code=404,
            detail="Approved land not found.",
        )

    # A land owner cannot report their own listing.
    if land.owner_id == reporter.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot report your own land.",
        )

    reason = (data.reason or "").strip()
    description = (
        data.description.strip()
        if data.description
        else None
    )

    if not reason:
        raise HTTPException(
            status_code=400,
            detail="Report reason is required.",
        )

    if len(reason) > 100:
        raise HTTPException(
            status_code=400,
            detail="Report reason is too long.",
        )

    if description and len(description) > 1000:
        raise HTTPException(
            status_code=400,
            detail="Report description must be 1000 characters or less.",
        )

    # Prevent repeated active reports from the same user for the same land.
    existing = (
        db.query(LandReport)
        .filter(
            LandReport.land_id == land.id,
            LandReport.reporter_id == reporter.id,
            LandReport.status == "pending",
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="You already have a pending report for this land.",
        )

    report = LandReport(
        land_id=land.id,
        reporter_id=reporter.id,
        reason=reason,
        description=description,
        status="pending",
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    return report


@router.get(
    "/land-reports/my",
    response_model=list[LandReportResponse],
)
def get_my_land_reports(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    """
    Return reports submitted by the currently authenticated user.

    This endpoint is included for transparency and future Phase 2 UI.
    Admin moderation is intentionally handled in later Phase 2 items.
    """

    return (
        db.query(LandReport)
        .filter(
            LandReport.reporter_id == current_user,
        )
        .order_by(
            LandReport.created_at.desc(),
        )
        .all()
    )
# =========================================================
# PHASE 2 - TRUST & SAFETY
# #9 REPORT USER
# =========================================================

@router.post(
    "/users/{user_id}/report",
    response_model=UserReportResponse,
)
def report_user(
    user_id: int,
    data: UserReportCreate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    """
    Allow an authenticated user to report another user.

    The report is stored as pending and does not automatically
    suspend, block, or otherwise modify the reported user.
    """

    # The path and request body must refer to the same user.
    if data.reported_user_id != user_id:
        raise HTTPException(
            status_code=400,
            detail="Reported user ID does not match the selected user.",
        )

    reporter = get_user(
        db,
        current_user,
    )

    reported_user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not reported_user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    # A user cannot report themselves.
    if reporter.id == reported_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot report yourself.",
        )

    reason = (data.reason or "").strip()

    description = (
        data.description.strip()
        if data.description
        else None
    )

    if not reason:
        raise HTTPException(
            status_code=400,
            detail="Report reason is required.",
        )

    if len(reason) > 100:
        raise HTTPException(
            status_code=400,
            detail="Report reason must be 100 characters or less.",
        )

    if description and len(description) > 1000:
        raise HTTPException(
            status_code=400,
            detail="Report description must be 1000 characters or less.",
        )

    # Prevent duplicate pending reports from the same reporter
    # against the same user.
    existing = (
        db.query(UserReport)
        .filter(
            UserReport.reporter_id == reporter.id,
            UserReport.reported_user_id == reported_user.id,
            UserReport.status == "pending",
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="You already have a pending report for this user.",
        )

    report = UserReport(
        reporter_id=reporter.id,
        reported_user_id=reported_user.id,
        reason=reason,
        description=description,
        status="pending",
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    return report


@router.get(
    "/user-reports/my",
    response_model=list[UserReportResponse],
)
def get_my_user_reports(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    """
    Return reports submitted by the currently authenticated user.
    """

    return (
        db.query(UserReport)
        .filter(
            UserReport.reporter_id == current_user,
        )
        .order_by(
            UserReport.created_at.desc(),
        )
        .all()
    )
