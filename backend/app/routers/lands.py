from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app import models
from sqlalchemy import or_
from app.auth import get_current_user
from app.database import get_db
from app.models import (
    Land,
    User,
    RecentlyViewedLand,
    ListingView,
    LandAvailability,
    LandInquiry,
    LandOffer,
    SiteVisit,
)
from app.schemas import LandCreate
from app.utils.activity_log import create_activity_log
from typing import Optional
from datetime import datetime


router = APIRouter(
    prefix="/lands",
    tags=["Lands"]
)


# ==========================
# Create Land
# ==========================

@router.post("/")
def create_land(
    land: LandCreate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    # Only farmers can create land listings
    user = db.query(User).filter(User.id == current_user).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if user.role != "farmer":
        raise HTTPException(
            status_code=403,
            detail="Only farmers can add land"
        )

    # Create new land
    new_land = Land(
        title=land.title,
        description=land.description,
        image_url=land.image_url,
        price=land.price,
        area=land.area,
        village=land.village,
        mandal=land.mandal,
        district=land.district,
        state=land.state,
        pincode=land.pincode,
        survey_number=land.survey_number,
        soil_type=land.soil_type,
        water_source=land.water_source,
        crop_type=land.crop_type,
        latitude=land.latitude,
        longitude=land.longitude,
        status="pending",
        rejection_reason=None,
        owner_id=current_user
    )

    db.add(new_land)

    # Generate the land ID before creating the activity log
    db.flush()

    # Create activity log
    create_activity_log(
        db=db,
        user_id=current_user,
        action="CREATE_LAND",
        description=f'Created land "{new_land.title}"',
        target_type="LAND",
        target_id=new_land.id,
    )

    # Save both land and activity log together
    db.commit()

    # Refresh land after commit
    db.refresh(new_land)

    return {
        "message": "Land Added Successfully and is waiting for admin approval.",
        "land_id": new_land.id
    }


# =========================================================
# STEP 45 - BUYER RECOMMENDATIONS
# =========================================================

@router.get("/recommendations")
def get_buyer_recommendations(
    limit: int = Query(6, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    """
    Return personalized farmland recommendations for buyers.

    Recommendations are based on the buyer's existing marketplace
    activity: favorites, listing views, inquiries, offers, site visits,
    recently viewed lands, and saved searches.  Only approved and
    published marketplace listings are recommended.
    """
    user = db.query(User).filter(User.id == current_user).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role != "buyer":
        raise HTTPException(
            status_code=403,
            detail="Buyer recommendations are available only for buyers",
        )

    # Import existing marketplace models through the module so this
    # endpoint remains compatible with the current models.py.
    Favorite = models.Favorite
    LandInquiry = models.LandInquiry
    LandOffer = models.LandOffer
    SiteVisit = models.SiteVisit
    SavedSearch = models.SavedSearch

    # ---------------------------------------------------------
    # Collect the buyer's activity and convert it into weighted
    # preferences. Higher weights indicate stronger intent.
    # ---------------------------------------------------------
    activity_weights = {}
    activity_reason = {}

    def add_activity(land_id, weight, reason):
        if not land_id:
            return
        activity_weights[land_id] = activity_weights.get(land_id, 0) + weight
        activity_reason.setdefault(land_id, set()).add(reason)

    for row in db.query(Favorite).filter(Favorite.user_id == current_user).all():
        add_activity(row.land_id, 5, "favorited by you")

    for row in db.query(ListingView).filter(ListingView.user_id == current_user).all():
        add_activity(row.land_id, 4, "viewed by you")

    for row in db.query(RecentlyViewedLand).filter(RecentlyViewedLand.user_id == current_user).all():
        add_activity(row.land_id, 3, "recently viewed")

    for row in db.query(LandInquiry).filter(LandInquiry.buyer_id == current_user).all():
        add_activity(row.land_id, 6, "you inquired about similar land")

    for row in db.query(LandOffer).filter(LandOffer.buyer_id == current_user).all():
        add_activity(row.land_id, 8, "you made an offer on similar land")

    for row in db.query(SiteVisit).filter(SiteVisit.buyer_id == current_user).all():
        add_activity(row.land_id, 10, "you requested a site visit for similar land")

    saved_searches = db.query(SavedSearch).filter(SavedSearch.user_id == current_user).all()

    # Use interacted lands as the main preference source.
    interacted_ids = set(activity_weights.keys())
    interacted_lands = []
    if interacted_ids:
        interacted_lands = (
            db.query(Land)
            .filter(Land.id.in_(interacted_ids))
            .all()
        )

    # Weighted frequency of categorical preferences.
    preference_fields = [
        "district",
        "village",
        "mandal",
        "crop_type",
        "soil_type",
        "water_source",
    ]
    preference_scores = {field: {} for field in preference_fields}

    total_preference_weight = 0
    weighted_price = 0.0
    weighted_area = 0.0

    for land in interacted_lands:
        weight = activity_weights.get(land.id, 0)
        if weight <= 0:
            continue

        total_preference_weight += weight
        weighted_price += float(land.price or 0) * weight
        weighted_area += float(land.area or 0) * weight

        for field in preference_fields:
            value = getattr(land, field, None)
            if value:
                normalized = str(value).strip().lower()
                preference_scores[field][normalized] = (
                    preference_scores[field].get(normalized, 0) + weight
                )

    preferred_price = (
        weighted_price / total_preference_weight
        if total_preference_weight
        else None
    )
    preferred_area = (
        weighted_area / total_preference_weight
        if total_preference_weight
        else None
    )

    # ---------------------------------------------------------
    # Candidate listings: public marketplace only, excluding
    # the buyer's own records (normally none, but kept defensive).
    # ---------------------------------------------------------
    candidates = (
        db.query(Land)
        .filter(
            Land.status == "approved",
            Land.is_published == True,
            Land.owner_id != current_user,
        )
        .order_by(Land.id.desc())
        .all()
    )

    scored = []

    # Helper to format readable recommendation reasons.
    field_labels = {
        "district": "same district",
        "village": "same village",
        "mandal": "same mandal",
        "crop_type": "same crop type",
        "soil_type": "same soil type",
        "water_source": "same water source",
    }

    for land in candidates:
        score = 0.0
        reasons = []

        # Strong signal: similarity to listings the buyer actually used.
        for field in preference_fields:
            value = getattr(land, field, None)
            if not value:
                continue
            normalized = str(value).strip().lower()
            field_score = preference_scores[field].get(normalized, 0)
            if field_score > 0 and total_preference_weight:
                # Normalize the influence so one field cannot dominate.
                score += min(field_score / total_preference_weight, 1.0) * 18
                if field_score >= max(2, total_preference_weight * 0.20):
                    reasons.append(field_labels[field])

        # Price/area similarity to the buyer's historical activity.
        if preferred_price is not None and preferred_price > 0:
            price_distance = abs(float(land.price or 0) - preferred_price) / preferred_price
            if price_distance <= 0.10:
                score += 16
                reasons.append("similar price range")
            elif price_distance <= 0.25:
                score += 9

        if preferred_area is not None and preferred_area > 0:
            area_distance = abs(float(land.area or 0) - preferred_area) / preferred_area
            if area_distance <= 0.15:
                score += 10
                reasons.append("similar land area")
            elif area_distance <= 0.30:
                score += 5

        # Saved-search filters are explicit buyer preferences.
        for saved in saved_searches:
            search_match = 0
            search_total = 0

            for field in preference_fields:
                expected = getattr(saved, field, None)
                if expected:
                    search_total += 1
                    actual = getattr(land, field, None)
                    if actual and str(actual).strip().lower() == str(expected).strip().lower():
                        search_match += 1

            if saved.min_price is not None:
                search_total += 1
                if float(land.price or 0) >= float(saved.min_price):
                    search_match += 1
            if saved.max_price is not None:
                search_total += 1
                if float(land.price or 0) <= float(saved.max_price):
                    search_match += 1
            if saved.min_area is not None:
                search_total += 1
                if float(land.area or 0) >= float(saved.min_area):
                    search_match += 1
            if saved.max_area is not None:
                search_total += 1
                if float(land.area or 0) <= float(saved.max_area):
                    search_match += 1

            if search_total:
                ratio = search_match / search_total
                score += ratio * 30
                if ratio >= 0.75:
                    reasons.append("matches your saved search")
                    break

        # Mild popularity/freshness signal for buyers with little/no history.
        view_count = db.query(ListingView).filter(ListingView.land_id == land.id).count()
        score += min(view_count, 20) * 0.5

        # If there is no history, keep useful marketplace listings visible.
        if not activity_weights and not saved_searches:
            if view_count > 0:
                reasons.append("popular listing")
            else:
                reasons.append("new marketplace listing")

        # If there is activity but no explicit textual reason, provide a clear fallback.
        if not reasons:
            reasons.append("similar to your marketplace activity")

        # Avoid recommending listings the buyer has already interacted with.
        # They can still discover them through Favorites/Recently Viewed.
        if land.id in interacted_ids:
            continue

        scored.append({
            "land": land,
            "score": round(score, 2),
            "reasons": list(dict.fromkeys(reasons))[:3],
            "view_count": view_count,
        })

    scored.sort(key=lambda item: (item["score"], item["land"].id), reverse=True)

    results = []
    for item in scored[:limit]:
        land = item["land"]
        results.append({
            "id": land.id,
            "title": land.title,
            "description": land.description,
            "image_url": land.image_url,
            "price": land.price,
            "area": land.area,
            "village": land.village,
            "mandal": land.mandal,
            "district": land.district,
            "state": land.state,
            "pincode": land.pincode,
            "survey_number": land.survey_number,
            "soil_type": land.soil_type,
            "water_source": land.water_source,
            "crop_type": land.crop_type,
            "latitude": land.latitude,
            "longitude": land.longitude,
            "status": land.status,
            "is_published": land.is_published,
            "owner_id": land.owner_id,
            "recommendation_score": item["score"],
            "recommendation_reasons": item["reasons"],
            "view_count": item["view_count"],
        })

    return {
        "count": len(results),
        "based_on": {
            "favorites": sum(1 for land_id in activity_weights if "favorited by you" in activity_reason.get(land_id, set())),
            "views": sum(1 for land_id in activity_weights if "viewed by you" in activity_reason.get(land_id, set())),
            "inquiries": sum(1 for land_id in activity_weights if "you inquired about similar land" in activity_reason.get(land_id, set())),
            "offers": sum(1 for land_id in activity_weights if "you made an offer on similar land" in activity_reason.get(land_id, set())),
            "site_visits": sum(1 for land_id in activity_weights if "you requested a site visit for similar land" in activity_reason.get(land_id, set())),
            "saved_searches": len(saved_searches),
        },
        "recommendations": results,
    }


# ==========================
# Get Lands
# ==========================

@router.get("/")
def get_all_lands(
    search: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == current_user).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Buyers and admins can see approved marketplace lands.
    # Farmers can see only their own lands.
    query = db.query(models.Land)

    if user.role == "farmer":
        query = query.filter(
            models.Land.owner_id == current_user
        )
    else:
        query = query.filter(
            models.Land.status == "approved",
            models.Land.is_published == True
        )

    if search:
        query = query.filter(
            or_(
                models.Land.title.ilike(f"%{search}%"),
                models.Land.description.ilike(f"%{search}%"),
            )
        )

    if location:
        query = query.filter(
            or_(
                models.Land.village.ilike(f"%{location}%"),
                models.Land.mandal.ilike(f"%{location}%"),
                models.Land.district.ilike(f"%{location}%"),
                models.Land.state.ilike(f"%{location}%"),
            )
        )

    if min_price is not None:
        query = query.filter(
            models.Land.price >= min_price
        )

    if max_price is not None:
        query = query.filter(
            models.Land.price <= max_price
        )

    return query.order_by(
        models.Land.id.desc()
    ).all()


# ==========================
# Search & Filter Lands
# ==========================

@router.get("/search")
def search_lands(
    district: str | None = Query(None),
    village: str | None = Query(None),
    mandal: str | None = Query(None),
    crop_type: str | None = Query(None),
    soil_type: str | None = Query(None),
    water_source: str | None = Query(None),
    min_price: float | None = Query(None),
    max_price: float | None = Query(None),
    min_area: float | None = Query(None),
    max_area: float | None = Query(None),
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == current_user).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Buyers and admins can search approved marketplace lands.
    # Farmers are restricted to their own lands only.
    query = db.query(Land)

    if user.role == "farmer":
        query = query.filter(
            Land.owner_id == current_user
        )
    else:
        query = query.filter(
            Land.status == "approved",
            Land.is_published == True
        )

    if district:
        query = query.filter(
            Land.district.ilike(f"%{district}%")
        )

    if village:
        query = query.filter(
            Land.village.ilike(f"%{village}%")
        )

    if mandal:
        query = query.filter(
            Land.mandal.ilike(f"%{mandal}%")
        )

    if crop_type:
        query = query.filter(
            Land.crop_type.ilike(f"%{crop_type}%")
        )

    if soil_type:
        query = query.filter(
            Land.soil_type.ilike(f"%{soil_type}%")
        )

    if water_source:
        query = query.filter(
            Land.water_source.ilike(f"%{water_source}%")
        )

    if min_price is not None:
        query = query.filter(
            Land.price >= min_price
        )

    if max_price is not None:
        query = query.filter(
            Land.price <= max_price
        )

    if min_area is not None:
        query = query.filter(
            Land.area >= min_area
        )

    if max_area is not None:
        query = query.filter(
            Land.area <= max_area
        )

    return query.order_by(
        Land.id.desc()
    ).all()


# ==========================
# My Lands
# ==========================

@router.get("/my/lands")
def get_my_lands(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    lands = (
        db.query(Land)
        .filter(
            Land.owner_id == current_user
        )
        .order_by(Land.id.desc())
        .all()
    )

    return [
        {
            "id": land.id,
            "title": land.title,
            "description": land.description,
            "image_url": land.image_url,

            "images": [
                {
                    "id": image.id,
                    "image_url": image.image_url,
                }
                for image in land.images
            ],

            "price": land.price,
            "area": land.area,
            "village": land.village,
            "mandal": land.mandal,
            "district": land.district,
            "state": land.state,
            "pincode": land.pincode,
            "survey_number": land.survey_number,
            "soil_type": land.soil_type,
            "water_source": land.water_source,
            "crop_type": land.crop_type,

            "latitude": land.latitude,
            "longitude": land.longitude,

            "status": land.status,
            "rejection_reason": land.rejection_reason,
            "owner_id": land.owner_id,
        }
        for land in lands
    ]


# =========================================================
# PHASE 7 - FARMER LISTING ANALYTICS
# =========================================================

@router.get("/my/analytics")
def get_my_listing_analytics(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    """Return listing performance analytics for the logged-in farmer."""

    user = db.query(User).filter(User.id == current_user).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if user.role != "farmer":
        raise HTTPException(
            status_code=403,
            detail="Only farmers can access listing analytics"
        )

    lands = (
        db.query(Land)
        .filter(Land.owner_id == current_user)
        .order_by(Land.id.desc())
        .all()
    )

    records = []

    summary = {
        "total_lands": len(lands),
        "total_views": 0,
        "available": 0,
        "reserved": 0,
        "sold": 0,
        "total_inquiries": 0,
        "pending_inquiries": 0,
        "accepted_inquiries": 0,
        "rejected_inquiries": 0,
        "total_offers": 0,
        "pending_offers": 0,
        "accepted_offers": 0,
        "rejected_offers": 0,
        "total_site_visits": 0,
        "pending_site_visits": 0,
        "accepted_site_visits": 0,
        "rejected_site_visits": 0,
        "completed_site_visits": 0,
        "cancelled_site_visits": 0,
    }

    for land in lands:
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

        view_count = (
            db.query(ListingView)
            .filter(ListingView.land_id == land.id)
            .count()
        )

        inquiries = (
            db.query(LandInquiry)
            .filter(LandInquiry.land_id == land.id)
            .all()
        )
        offers = (
            db.query(LandOffer)
            .filter(LandOffer.land_id == land.id)
            .all()
        )
        site_visits = (
            db.query(SiteVisit)
            .filter(SiteVisit.land_id == land.id)
            .all()
        )

        inquiry_counts = {
            "total": len(inquiries),
            "pending": sum(1 for item in inquiries if item.status == "pending"),
            "accepted": sum(1 for item in inquiries if item.status == "accepted"),
            "rejected": sum(1 for item in inquiries if item.status == "rejected"),
        }

        offer_counts = {
            "total": len(offers),
            "pending": sum(1 for item in offers if item.status == "pending"),
            "accepted": sum(1 for item in offers if item.status == "accepted"),
            "rejected": sum(1 for item in offers if item.status == "rejected"),
        }

        visit_counts = {
            "total": len(site_visits),
            "pending": sum(1 for item in site_visits if item.status == "pending"),
            "accepted": sum(1 for item in site_visits if item.status == "accepted"),
            "rejected": sum(1 for item in site_visits if item.status == "rejected"),
            "completed": sum(1 for item in site_visits if item.status == "completed"),
            "cancelled": sum(1 for item in site_visits if item.status == "cancelled"),
        }

        if availability_status in ("available", "reserved", "sold"):
            summary[availability_status] += 1

        summary["total_views"] += view_count
        summary["total_inquiries"] += inquiry_counts["total"]
        summary["pending_inquiries"] += inquiry_counts["pending"]
        summary["accepted_inquiries"] += inquiry_counts["accepted"]
        summary["rejected_inquiries"] += inquiry_counts["rejected"]
        summary["total_offers"] += offer_counts["total"]
        summary["pending_offers"] += offer_counts["pending"]
        summary["accepted_offers"] += offer_counts["accepted"]
        summary["rejected_offers"] += offer_counts["rejected"]
        summary["total_site_visits"] += visit_counts["total"]
        summary["pending_site_visits"] += visit_counts["pending"]
        summary["accepted_site_visits"] += visit_counts["accepted"]
        summary["rejected_site_visits"] += visit_counts["rejected"]
        summary["completed_site_visits"] += visit_counts["completed"]
        summary["cancelled_site_visits"] += visit_counts["cancelled"]

        records.append({
            "id": land.id,
            "title": land.title,
            "status": land.status,
            "is_published": bool(land.is_published),
            "availability": availability_status,
            "views": view_count,
            "inquiries": inquiry_counts,
            "offers": offer_counts,
            "site_visits": visit_counts,
        })

    return {
        "summary": summary,
        "records": records,
    }



# =========================================================
# PHASE 7 - FARMER LISTING ANALYTICS DETAILS
# =========================================================

@router.get("/my/analytics/details")
def get_my_listing_analytics_details(
    category: str = Query(...),
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    """Return detailed records for a farmer analytics card."""

    user = db.query(User).filter(User.id == current_user).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role != "farmer":
        raise HTTPException(
            status_code=403,
            detail="Only farmers can access listing analytics"
        )

    allowed_categories = {
        "total_views",
        "my_listings",
        "available",
        "reserved",
        "sold",
        "inquiries",
        "offers",
        "site_visits",
    }

    category = category.strip().lower()

    if category not in allowed_categories:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid analytics category. Use one of: "
                + ", ".join(sorted(allowed_categories))
            ),
        )

    lands = (
        db.query(Land)
        .filter(Land.owner_id == current_user)
        .order_by(Land.id.desc())
        .all()
    )

    def availability_for(land):
        availability = (
            db.query(LandAvailability)
            .filter(LandAvailability.land_id == land.id)
            .first()
        )
        return (
            availability.status.lower()
            if availability and availability.status
            else "available"
        )

    # Listing-based cards show one row per listing.
    if category in {"my_listings", "available", "reserved", "sold", "total_views"}:
        records = []

        for land in lands:
            availability_status = availability_for(land)
            view_count = (
                db.query(ListingView)
                .filter(ListingView.land_id == land.id)
                .count()
            )

            if category == "available" and availability_status != "available":
                continue
            if category == "reserved" and availability_status != "reserved":
                continue
            if category == "sold" and availability_status != "sold":
                continue
            if category == "total_views" and view_count <= 0:
                continue

            records.append({
                "land_id": land.id,
                "title": land.title,
                "approval_status": land.status,
                "is_published": bool(land.is_published),
                "availability": availability_status,
                "views": view_count,
            })

        return {
            "category": category,
            "total": len(records),
            "records": records,
        }

    # Buyer activity cards show individual buyer activity.
    if category == "inquiries":
        inquiries = (
            db.query(LandInquiry)
            .filter(LandInquiry.land_id.in_([land.id for land in lands]))
            .order_by(LandInquiry.created_at.desc())
            .all()
        )

        records = []
        for inquiry in inquiries:
            buyer = db.query(User).filter(User.id == inquiry.buyer_id).first()
            land = db.query(Land).filter(Land.id == inquiry.land_id).first()
            records.append({
                "id": inquiry.id,
                "land_id": inquiry.land_id,
                "land_title": land.title if land else "",
                "buyer_id": inquiry.buyer_id,
                "buyer_name": buyer.full_name if buyer else "Unknown buyer",
                "buyer_mobile": buyer.mobile if buyer else "",
                "message": inquiry.message or "",
                "status": inquiry.status,
                "created_at": inquiry.created_at,
            })

        return {"category": category, "total": len(records), "records": records}

    if category == "offers":
        offers = (
            db.query(LandOffer)
            .filter(LandOffer.land_id.in_([land.id for land in lands]))
            .order_by(LandOffer.created_at.desc())
            .all()
        )

        records = []
        for offer in offers:
            buyer = db.query(User).filter(User.id == offer.buyer_id).first()
            land = db.query(Land).filter(Land.id == offer.land_id).first()
            records.append({
                "id": offer.id,
                "land_id": offer.land_id,
                "land_title": land.title if land else "",
                "buyer_id": offer.buyer_id,
                "buyer_name": buyer.full_name if buyer else "Unknown buyer",
                "buyer_mobile": buyer.mobile if buyer else "",
                "amount": offer.amount,
                "message": offer.message or "",
                "status": offer.status,
                "created_at": offer.created_at,
            })

        return {"category": category, "total": len(records), "records": records}

    site_visits = (
        db.query(SiteVisit)
        .filter(SiteVisit.land_id.in_([land.id for land in lands]))
        .order_by(SiteVisit.created_at.desc())
        .all()
    )

    records = []
    for visit in site_visits:
        buyer = db.query(User).filter(User.id == visit.buyer_id).first()
        land = db.query(Land).filter(Land.id == visit.land_id).first()
        records.append({
            "id": visit.id,
            "land_id": visit.land_id,
            "land_title": land.title if land else "",
            "buyer_id": visit.buyer_id,
            "buyer_name": buyer.full_name if buyer else "Unknown buyer",
            "buyer_mobile": buyer.mobile if buyer else "",
            "requested_date": visit.requested_date,
            "message": visit.message or "",
            "status": visit.status,
            "created_at": visit.created_at,
        })

    return {"category": category, "total": len(records), "records": records}

# ==========================
# Get My Land By ID
# ==========================

@router.get("/my/{land_id}")
def get_my_land_by_id(
    land_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    land = (
        db.query(Land)
        .filter(
            Land.id == land_id,
            Land.owner_id == current_user
        )
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found or you are not the owner"
        )

    owner = (
        db.query(User)
        .filter(User.id == land.owner_id)
        .first()
    )

    return {
        "id": land.id,
        "title": land.title,
        "description": land.description,
        "image_url": land.image_url,
        "price": land.price,
        "area": land.area,

        "village": land.village,
        "mandal": land.mandal,
        "district": land.district,
        "state": land.state,
        "pincode": land.pincode,

        "survey_number": land.survey_number,
        "soil_type": land.soil_type,
        "water_source": land.water_source,
        "crop_type": land.crop_type,

        "latitude": land.latitude,
        "longitude": land.longitude,

        "status": land.status,
        "rejection_reason": land.rejection_reason,

        "images": [
            {
                "id": image.id,
                "image_url": image.image_url
            }
            for image in land.images
        ],

        "owner_id": land.owner_id,
        "owner_name": owner.full_name if owner else "",
        "owner_email": owner.email if owner else "",
        "owner_mobile": owner.mobile if owner else ""
    }


# =========================================================
# RECENTLY VIEWED LANDS
# =========================================================

@router.post("/{land_id}/view")
def record_land_view(
    land_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    user = (
        db.query(User)
        .filter(User.id == current_user)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    land = (
        db.query(Land)
        .filter(Land.id == land_id)
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    # Only approved and published marketplace lands
    # should be added to recently viewed.
    if land.status != "approved" or not land.is_published:
        raise HTTPException(
            status_code=404,
            detail="Land is not available"
        )

    now = datetime.utcnow()

    # =====================================================
    # PHASE 6 - LISTING VIEWS
    # Record one unique view per authenticated user/listing.
    # Re-opening the same listing updates the timestamp but
    # does not inflate the view count.
    # =====================================================
    listing_view = (
        db.query(ListingView)
        .filter(
            ListingView.user_id == current_user,
            ListingView.land_id == land_id
        )
        .first()
    )

    if listing_view:
        listing_view.viewed_at = now
    else:
        listing_view = ListingView(
            user_id=current_user,
            land_id=land_id,
            viewed_at=now
        )
        db.add(listing_view)

    # =====================================================
    # EXISTING - RECENTLY VIEWED LANDS
    # =====================================================
    existing = (
        db.query(RecentlyViewedLand)
        .filter(
            RecentlyViewedLand.user_id == current_user,
            RecentlyViewedLand.land_id == land_id
        )
        .first()
    )

    if existing:
        existing.viewed_at = now
    else:
        viewed = RecentlyViewedLand(
            user_id=current_user,
            land_id=land_id,
            viewed_at=now
        )
        db.add(viewed)

    db.commit()

    # Keep only the latest 20 recently viewed lands.
    old_views = (
        db.query(RecentlyViewedLand)
        .filter(
            RecentlyViewedLand.user_id == current_user
        )
        .order_by(
            RecentlyViewedLand.viewed_at.desc()
        )
        .offset(20)
        .all()
    )

    for old_view in old_views:
        db.delete(old_view)

    db.commit()

    view_count = (
        db.query(ListingView)
        .filter(ListingView.land_id == land_id)
        .count()
    )

    return {
        "message": "Land view recorded",
        "land_id": land_id,
        "viewed_at": now,
        "view_count": view_count
    }


# =========================================================
# GET LISTING VIEW COUNT
# =========================================================

@router.get("/{land_id}/view-count")
def get_land_view_count(
    land_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    user = (
        db.query(User)
        .filter(User.id == current_user)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    land = (
        db.query(Land)
        .filter(Land.id == land_id)
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    # Farmers may see the count for their own listing.
    # Buyers/admins may see counts for approved marketplace listings.
    if user.role == "farmer":
        if land.owner_id != current_user:
            raise HTTPException(
                status_code=403,
                detail="Farmers can access only their own lands"
            )
    else:
        if land.status != "approved" or not land.is_published:
            raise HTTPException(
                status_code=404,
                detail="Land not found"
            )

    view_count = (
        db.query(ListingView)
        .filter(ListingView.land_id == land_id)
        .count()
    )

    return {
        "land_id": land_id,
        "view_count": view_count
    }


# =========================================================
# GET RECENTLY VIEWED LANDS
# =========================================================

@router.get("/recently-viewed")
def get_recently_viewed_lands(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    views = (
        db.query(RecentlyViewedLand)
        .filter(
            RecentlyViewedLand.user_id == current_user
        )
        .order_by(
            RecentlyViewedLand.viewed_at.desc()
        )
        .limit(20)
        .all()
    )

    result = []

    for view in views:
        land = (
            db.query(Land)
            .filter(
                Land.id == view.land_id,
                Land.status == "approved",
                Land.is_published == True
            )
            .first()
        )

        if not land:
            continue

        result.append({
            "id": land.id,
            "title": land.title,
            "description": land.description,
            "image_url": land.image_url,
            "price": land.price,
            "area": land.area,
            "village": land.village,
            "mandal": land.mandal,
            "district": land.district,
            "state": land.state,
            "pincode": land.pincode,
            "survey_number": land.survey_number,
            "soil_type": land.soil_type,
            "water_source": land.water_source,
            "crop_type": land.crop_type,
            "latitude": land.latitude,
            "longitude": land.longitude,
            "owner_id": land.owner_id,
            "viewed_at": view.viewed_at
        })

    return result


# =========================================================
# REMOVE ONE RECENTLY VIEWED LAND
# =========================================================

@router.delete("/recently-viewed/{land_id}")
def remove_recently_viewed_land(
    land_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    viewed = (
        db.query(RecentlyViewedLand)
        .filter(
            RecentlyViewedLand.user_id == current_user,
            RecentlyViewedLand.land_id == land_id
        )
        .first()
    )

    if not viewed:
        raise HTTPException(
            status_code=404,
            detail="Land is not in your recently viewed list"
        )

    db.delete(viewed)
    db.commit()

    return {
        "message": "Land removed from recently viewed",
        "land_id": land_id
    }



# =========================================================
# STEP 46 - SIMILAR FARMLAND
# =========================================================

@router.get("/{land_id}/similar")
def get_similar_lands(
    land_id: int,
    limit: int = Query(6, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    """
    Return similar approved and published farmland listings for buyers.
    Similarity is ranked using location, crop, soil, water source,
    price, and land area. The current listing is excluded.
    """
    user = db.query(User).filter(User.id == current_user).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role != "buyer":
        raise HTTPException(
            status_code=403,
            detail="Similar farmland is available only for buyers",
        )

    current_land = db.query(Land).filter(Land.id == land_id).first()

    if not current_land:
        raise HTTPException(status_code=404, detail="Land not found")

    if (
        current_land.status != "approved"
        or not current_land.is_published
    ):
        raise HTTPException(
            status_code=404,
            detail="Land not found",
        )

    candidates = (
        db.query(Land)
        .filter(
            Land.id != current_land.id,
            Land.status == "approved",
            Land.is_published == True,
            Land.owner_id != current_user,
        )
        .all()
    )

    def normalize(value):
        return str(value or "").strip().lower()

    current_price = float(current_land.price or 0)
    current_area = float(current_land.area or 0)

    field_rules = [
        ("district", "same district", 6),
        ("mandal", "same mandal", 5),
        ("village", "same village", 4),
        ("crop_type", "same crop type", 4),
        ("soil_type", "same soil type", 4),
        ("water_source", "same water source", 3),
    ]

    scored = []

    for candidate in candidates:
        score = 0.0
        reasons = []

        for field, label, points in field_rules:
            current_value = normalize(getattr(current_land, field, None))
            candidate_value = normalize(getattr(candidate, field, None))

            if (
                current_value
                and candidate_value
                and current_value == candidate_value
            ):
                score += points
                reasons.append(label)

        candidate_price = float(candidate.price or 0)
        if current_price > 0 and candidate_price > 0:
            price_difference = (
                abs(candidate_price - current_price) / current_price
            )
            if price_difference <= 0.10:
                score += 6
                reasons.append("very similar price")
            elif price_difference <= 0.25:
                score += 3
                reasons.append("similar price range")

        candidate_area = float(candidate.area or 0)
        if current_area > 0 and candidate_area > 0:
            area_difference = (
                abs(candidate_area - current_area) / current_area
            )
            if area_difference <= 0.15:
                score += 5
                reasons.append("very similar land area")
            elif area_difference <= 0.25:
                score += 2
                reasons.append("similar land area")

        view_count = db.query(ListingView).filter(
            ListingView.land_id == candidate.id
        ).count()

        # Small popularity tie-breaker; similarity remains the main signal.
        score += min(view_count, 20) * 0.25

        if score <= 0:
            continue

        availability = (
            db.query(LandAvailability)
            .filter(LandAvailability.land_id == candidate.id)
            .first()
        )

        # Buyer recommendations should contain only farmland that is
        # currently available. Sold/reserved listings are not useful
        # as actionable Similar Farmland recommendations.
        availability_status = (
            availability.status
            if availability
            else "available"
        )

        if normalize(availability_status) != "available":
            continue

        scored.append({
            "land": candidate,
            "score": round(score, 2),
            "reasons": list(dict.fromkeys(reasons))[:4],
            "view_count": view_count,
            "availability": availability_status,
        })

    scored.sort(
        key=lambda item: (item["score"], item["land"].id),
        reverse=True,
    )

    results = []

    for item in scored[:limit]:
        candidate = item["land"]

        results.append({
            "id": candidate.id,
            "title": candidate.title,
            "description": candidate.description,
            "image_url": candidate.image_url,
            "price": candidate.price,
            "area": candidate.area,
            "village": candidate.village,
            "mandal": candidate.mandal,
            "district": candidate.district,
            "state": candidate.state,
            "soil_type": candidate.soil_type,
            "water_source": candidate.water_source,
            "crop_type": candidate.crop_type,
            "status": candidate.status,
            "is_published": candidate.is_published,
            "owner_id": candidate.owner_id,
            "view_count": item["view_count"],
            "availability": item["availability"],
            "similarity_score": item["score"],
            "similarity_reasons": item["reasons"]
            or ["similar farmland characteristics"],
        })

    return {
        "land_id": current_land.id,
        "count": len(results),
        "recommendations": results,
    }


# =========================================================
# Get Land By ID
# =========================================================

@router.get("/{land_id}")
def get_land(
    land_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == current_user).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    land = (
        db.query(Land)
        .filter(
            Land.id == land_id
        )
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    # Farmers may access only their own land.
    if user.role == "farmer":
        if land.owner_id != current_user:
            raise HTTPException(
                status_code=403,
                detail="Farmers can access only their own lands"
            )
    else:
        # Buyers/admins can view only approved marketplace lands.
        if (
            land.status != "approved"
            or not land.is_published
        ):
            raise HTTPException(
                status_code=404,
                detail="Land not found"
            )

    owner = (
        db.query(User)
        .filter(User.id == land.owner_id)
        .first()
    )

    return {
        "id": land.id,
        "title": land.title,
        "description": land.description,
        "view_count": (
            db.query(ListingView)
            .filter(ListingView.land_id == land.id)
            .count()
        ),
        "image_url": land.image_url,
        "price": land.price,
        "area": land.area,
        "village": land.village,
        "mandal": land.mandal,
        "district": land.district,
        "state": land.state,
        "pincode": land.pincode,
        "survey_number": land.survey_number,
        "soil_type": land.soil_type,
        "water_source": land.water_source,
        "crop_type": land.crop_type,
        "latitude": land.latitude,
        "longitude": land.longitude,
        "status": land.status,
        "rejection_reason": land.rejection_reason,
        "owner_id": land.owner_id,

        # Multiple land images
        "images": [
            {
                "id": image.id,
                "image_url": image.image_url,
            }
            for image in land.images
        ],

        "owner_name": owner.full_name if owner else "",
        "owner_mobile": owner.mobile if owner else "",
    }


# ==========================
# Update Land
# ==========================

@router.put("/{land_id}")
def update_land(
    land_id: int,
    land: LandCreate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    existing_land = (
        db.query(Land)
        .filter(Land.id == land_id)
        .first()
    )

    if not existing_land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    # Only owner can update
    if existing_land.owner_id != current_user:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to update this land"
        )

    # =====================================================
    # CHECK IF ADMIN RE-APPROVAL IS REQUIRED
    #
    # Only these four fields require re-approval:
    # Village, Mandal, District, Survey Number
    # =====================================================

    approval_required = (
        existing_land.village != land.village
        or existing_land.mandal != land.mandal
        or existing_land.district != land.district
        or existing_land.survey_number != land.survey_number
    )

    # =====================================================
    # UPDATE LAND FIELDS
    # =====================================================

    existing_land.title = land.title
    existing_land.description = land.description
    existing_land.price = land.price
    existing_land.area = land.area
    existing_land.village = land.village
    existing_land.mandal = land.mandal
    existing_land.district = land.district
    existing_land.state = land.state
    existing_land.image_url = land.image_url
    existing_land.pincode = land.pincode
    existing_land.survey_number = land.survey_number
    existing_land.soil_type = land.soil_type
    existing_land.water_source = land.water_source
    existing_land.crop_type = land.crop_type
    existing_land.latitude = land.latitude
    existing_land.longitude = land.longitude

    # =====================================================
    # ADMIN RE-APPROVAL WORKFLOW
    # =====================================================

    if approval_required:
        existing_land.status = "pending"
        existing_land.rejection_reason = None

        success_message = (
            "Land updated successfully and is waiting for admin approval."
        )
    else:
        success_message = "Land updated successfully."

    # =====================================================
    # ACTIVITY LOG
    # =====================================================

    create_activity_log(
        db=db,
        user_id=current_user,
        action="UPDATE_LAND",
        description=f'Updated land "{existing_land.title}"',
        target_type="LAND",
        target_id=existing_land.id,
    )

    # =====================================================
    # SAVE
    # =====================================================

    db.commit()
    db.refresh(existing_land)

    return {
        "message": success_message,
        "status": existing_land.status,
        "approval_required": approval_required,
        "land": existing_land
    }


# ==========================
# Delete Land
# ==========================

@router.delete("/{land_id}")
def delete_land(
    land_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    land = (
        db.query(Land)
        .filter(Land.id == land_id)
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    # Only owner can delete
    if land.owner_id != current_user:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to delete this land"
        )

    # Save information before deleting the land
    land_title = land.title

    # Create activity log BEFORE deleting the land
    create_activity_log(
        db=db,
        user_id=current_user,
        action="DELETE_LAND",
        description=f'Deleted land "{land_title}"',
        target_type="LAND",
        target_id=land_id,
    )

    # Delete land
    db.delete(land)

    # Save deletion and activity log together
    db.commit()

    return {
        "message": "Land Deleted Successfully"
    }