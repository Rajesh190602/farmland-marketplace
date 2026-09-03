from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app import models
from sqlalchemy import or_
from app.auth import get_current_user
from app.database import get_db
from app.models import Land, User, RecentlyViewedLand, ListingView
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