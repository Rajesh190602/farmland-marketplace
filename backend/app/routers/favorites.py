from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Favorite,
    Land,
    Notification,
    User,
    ActivityLog
)
from app.auth import get_current_user


router = APIRouter(
    prefix="/favorites",
    tags=["Favorites"]
)


# =========================================================
# ADD FAVORITE
# =========================================================

@router.post("/{land_id}")
def add_favorite(
    land_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    # ----------------------------------
    # Get current user
    # ----------------------------------

    buyer = (
        db.query(User)
        .filter(
            User.id == current_user
        )
        .first()
    )

    if not buyer:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # ----------------------------------
    # Only buyers can add favorites
    # ----------------------------------

    if buyer.role != "buyer":
        raise HTTPException(
            status_code=403,
            detail="Only buyers can add lands to favorites"
        )

    # ----------------------------------
    # Only approved lands can be favorited
    # ----------------------------------

    land = (
        db.query(Land)
        .filter(
            Land.id == land_id,
            Land.status == "approved"
        )
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Approved land not found"
        )

    # ----------------------------------
    # Prevent owner from favoriting own land
    # ----------------------------------

    if land.owner_id == current_user:
        raise HTTPException(
            status_code=400,
            detail="You cannot favorite your own land"
        )

    # ----------------------------------
    # Check existing favorite
    # ----------------------------------

    existing = (
        db.query(Favorite)
        .filter(
            Favorite.user_id == current_user,
            Favorite.land_id == land_id
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Already in favorites"
        )

    # ----------------------------------
    # Create favorite
    # ----------------------------------

    favorite = Favorite(
        user_id=current_user,
        land_id=land_id
    )

    db.add(favorite)
    db.commit()
    db.refresh(favorite)

    # ----------------------------------
    # Security activity log
    # ----------------------------------

    activity_log = ActivityLog(
        user_id=current_user,
        action="LAND_FAVORITED",
        description=(
            f"Added land '{land.title}' "
            f"to favorites."
        ),
        target_type="land",
        target_id=land.id
    )

    db.add(activity_log)

    # ----------------------------------
    # Notification for land owner
    # ----------------------------------

    notification = Notification(
    user_id=land.owner_id,
    title="❤️ New Favorite",
    message=(
        f"{buyer.full_name} added your land "
        f"'{land.title}' to favorites."
    ),
    target_type="land",
    target_id=land.id
)

    db.add(notification)

    db.commit()

    return {
        "message": "Added to favorites",
        "favorite_id": favorite.id,
        "land_id": land.id
    }


# =========================================================
# REMOVE FAVORITE
# =========================================================
# =========================================================
# REMOVE FAVORITE
# =========================================================

@router.delete("/{land_id}")
def remove_favorite(
    land_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    # ----------------------------------
    # Get current buyer
    # ----------------------------------

    buyer = (
        db.query(User)
        .filter(
            User.id == current_user
        )
        .first()
    )

    if not buyer:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # ----------------------------------
    # Only buyers can remove favorites
    # ----------------------------------

    if buyer.role != "buyer":
        raise HTTPException(
            status_code=403,
            detail="Only buyers can remove lands from favorites"
        )

    # ----------------------------------
    # Find favorite belonging to current user
    # ----------------------------------

    favorite = (
        db.query(Favorite)
        .filter(
            Favorite.user_id == current_user,
            Favorite.land_id == land_id
        )
        .first()
    )

    if not favorite:
        raise HTTPException(
            status_code=404,
            detail="Favorite not found"
        )

    # ----------------------------------
    # Get land
    # ----------------------------------

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

    land_title = land.title

    # ----------------------------------
    # Delete favorite
    # ----------------------------------

    db.delete(favorite)

    # ----------------------------------
    # Security activity log
    # ----------------------------------

    activity_log = ActivityLog(
        user_id=current_user,
        action="LAND_UNFAVORITED",
        description=(
            f"Removed land '{land_title}' "
            f"from favorites."
        ),
        target_type="land",
        target_id=land_id
    )

    db.add(activity_log)

    # ----------------------------------
    # Notification for land owner
    # ----------------------------------

    notification = Notification(
        user_id=land.owner_id,
        title="Favorite Removed",
        message=(
            f"{buyer.full_name} removed your land "
            f"'{land.title}' from favorites."
        ),
        target_type="land",
        target_id=land.id
    )

    db.add(notification)

    # ----------------------------------
    # Save all changes
    # ----------------------------------

    db.commit()

    return {
        "message": "Removed from favorites",
        "land_id": land_id
    }


# =========================================================
# GET MY FAVORITES
# =========================================================

@router.get("/")
def get_my_favorites(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    # ----------------------------------
    # Get current user
    # ----------------------------------

    user = (
        db.query(User)
        .filter(
            User.id == current_user
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # ----------------------------------
    # Only buyers can view favorites
    # ----------------------------------

    if user.role != "buyer":
        raise HTTPException(
            status_code=403,
            detail="Only buyers can view favorites"
        )

    # ----------------------------------
    # Get favorites
    # ----------------------------------

    favorites = (
        db.query(Favorite)
        .filter(
            Favorite.user_id == current_user
        )
        .order_by(
            Favorite.created_at.desc()
        )
        .all()
    )

    result = []

    for favorite in favorites:

        # ----------------------------------
        # Only show approved lands
        # ----------------------------------

        land = (
            db.query(Land)
            .filter(
                Land.id == favorite.land_id,
                Land.status == "approved"
            )
            .first()
        )

        if not land:
            continue

        result.append({
            "favorite_id": favorite.id,
            "land_id": land.id,
            "title": land.title,
            "description": land.description,
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
            "image_url": land.image_url,
            "latitude": land.latitude,
            "longitude": land.longitude,
            "status": land.status,
            "favorited_at": favorite.created_at
        })

    return result


# =========================================================
# CHECK FAVORITE
# =========================================================

@router.get("/check/{land_id}")
def check_favorite(
    land_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    # ----------------------------------
    # Only buyers should use favorites
    # ----------------------------------

    user = (
        db.query(User)
        .filter(
            User.id == current_user
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if user.role != "buyer":
        raise HTTPException(
            status_code=403,
            detail="Only buyers can use favorites"
        )

    # ----------------------------------
    # Check favorite
    # ----------------------------------

    favorite = (
        db.query(Favorite)
        .filter(
            Favorite.user_id == current_user,
            Favorite.land_id == land_id
        )
        .first()
    )

    return {
        "land_id": land_id,
        "is_favorite": favorite is not None,
        "favorite_id": (
            favorite.id
            if favorite
            else None
        )
    }