from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import (
    User,
    Land,
    LandAvailability,
    LandInquiry,
    LandOffer,
    SiteVisit,
    Notification,
    LandReport,
)
from app.schemas import (
    LandAvailabilityResponse,
    LandInquiryCreate,
    LandInquiryResponse,
    LandInquiryStatusUpdate,
    LandOfferCreate,
    LandOfferResponse,
    LandOfferStatusUpdate,
    SiteVisitCreate,
    SiteVisitResponse,
    SiteVisitStatusUpdate,
    LandReportCreate,
    LandReportResponse,
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
            detail="Only approved land can be marked available, reserved, or sold.",
        )

    allowed_statuses = {
        "available",
        "reserved",
        "sold",
    }

    status = (
        data.status or ""
    ).strip().lower()

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid availability status. Use available, reserved, or sold.",
        )

    availability = get_or_create_availability(
        db,
        land,
    )

    # Prevent a farmer from reopening a sold listing
    # directly.
    if (
        availability.status == "sold"
        and status != "sold"
    ):
        raise HTTPException(
            status_code=400,
            detail="Sold land cannot be reopened directly.",
        )

    availability.status = status
    availability.updated_at = datetime.utcnow()

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
# BUYER - MAKE OFFER
# =========================================================

@router.post(
    "/offers",
    response_model=LandOfferResponse,
)
def create_offer(
    data: LandOfferCreate,
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
            detail="You cannot make an offer on your own land.",
        )

    availability = get_or_create_availability(
        db,
        land,
    )

    if availability.status != "available":
        raise HTTPException(
            status_code=400,
            detail=(
                f"Offers cannot be submitted because "
                f"this land is {availability.status}."
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
            detail="You already have a pending offer for this land.",
        )

    offer = LandOffer(
        land_id=land.id,
        buyer_id=buyer.id,
        amount=data.amount,
        message=data.message,
        status="pending",
    )

    db.add(offer)
    db.flush()
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

    db.commit()
    db.refresh(offer)

    return offer


# =========================================================
# FARMER - RECEIVED OFFERS
# =========================================================

@router.get(
    "/offers/received",
    response_model=list[LandOfferResponse],
)
def get_received_offers(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    farmer = require_farmer(
        db,
        current_user,
    )

    return (
        db.query(LandOffer)
        .join(
            Land,
            Land.id == LandOffer.land_id,
        )
        .filter(
            Land.owner_id == farmer.id
        )
        .order_by(
            LandOffer.created_at.desc()
        )
        .all()
    )


# =========================================================
# BUYER - MY OFFERS
# =========================================================

@router.get(
    "/offers/my",
    response_model=list[LandOfferResponse],
)
def get_my_offers(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    buyer = require_buyer(
        db,
        current_user,
    )

    return (
        db.query(LandOffer)
        .filter(
            LandOffer.buyer_id == buyer.id
        )
        .order_by(
            LandOffer.created_at.desc()
        )
        .all()
    )


# =========================================================
# FARMER - UPDATE OFFER
# =========================================================

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
    farmer = require_farmer(
        db,
        current_user,
    )

    offer = (
        db.query(LandOffer)
        .filter(
            LandOffer.id == offer_id
        )
        .first()
    )

    if not offer:
        raise HTTPException(
            status_code=404,
            detail="Offer not found.",
        )

    land = get_land(
        db,
        offer.land_id,
    )

    if land.owner_id != farmer.id:
        raise HTTPException(
            status_code=403,
            detail="You can update only offers for your own land.",
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
            detail="Invalid offer status.",
        )

    if (
        status == "accepted"
        and offer.status != "accepted"
    ):
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

        availability.status = "reserved"
        availability.updated_at = datetime.utcnow()

        # Reject other pending offers for the same land.
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
                (
                    f"Another offer was accepted for "
                    f"'{land.title}'."
                ),
                "offer",
                other_offer.id,
            )

    offer.status = status
    offer.updated_at = datetime.utcnow()

    if status == "accepted":
        notify(
            db,
            offer.buyer_id,
            "✅ Offer Accepted",
            (
                f"Your offer of ₹{offer.amount:,.2f} "
                f"for '{land.title}' was accepted."
            ),
            "offer",
            offer.id,
        )

    elif status == "rejected":
        notify(
            db,
            offer.buyer_id,
            "❌ Offer Rejected",
            (
                f"Your offer for '{land.title}' "
                f"was rejected."
            ),
            "offer",
            offer.id,
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

