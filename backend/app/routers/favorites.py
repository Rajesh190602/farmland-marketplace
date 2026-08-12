from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Favorite, Land, Notification, User
from app.auth import get_current_user


router = APIRouter(
    prefix="/favorites",
    tags=["Favorites"]
)


# ==========================
# Add Favorite
# ==========================

@router.post("/{land_id}")
def add_favorite(
    land_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    # Get current user
    buyer = (
        db.query(User)
        .filter(User.id == current_user)
        .first()
    )

    if not buyer:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Only buyers can add favorites
    if buyer.role != "buyer":
        raise HTTPException(
            status_code=403,
            detail="Only buyers can add lands to favorites"
        )

    # Only approved lands can be favorited
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

    # Prevent owner from favoriting their own land
    if land.owner_id == current_user:
        raise HTTPException(
            status_code=400,
            detail="You cannot favorite your own land"
        )

    # Check if already favorited
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

    # Create favorite
    favorite = Favorite(
        user_id=current_user,
        land_id=land_id
    )

    db.add(favorite)

    # Create notification for land owner
    notification = Notification(
        user_id=land.owner_id,
        title="❤️ New Favorite",
        message=(
            f"{buyer.full_name} added your land "
            f"'{land.title}' to favorites."
        )
    )

    db.add(notification)

    # Save favorite and notification
    db.commit()

    return {
        "message": "Added to favorites"
    }


# ==========================
# Remove Favorite
# ==========================

@router.delete("/{land_id}")
def remove_favorite(
    land_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
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

    db.delete(favorite)
    db.commit()

    return {
        "message": "Removed from favorites"
    }


# ==========================
# Get My Favorites
# ==========================

@router.get("/")
def get_my_favorites(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    # Only buyers should use the favorites list
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

    if user.role != "buyer":
        raise HTTPException(
            status_code=403,
            detail="Only buyers can view favorites"
        )

    favorites = (
        db.query(Favorite)
        .filter(
            Favorite.user_id == current_user
        )
        .all()
    )

    result = []

    for favorite in favorites:
        # Only show currently approved lands
        land = (
            db.query(Land)
            .filter(
                Land.id == favorite.land_id,
                Land.status == "approved"
            )
            .first()
        )

        if land:
            result.append({
                "favorite_id": favorite.id,
                "land_id": land.id,
                "title": land.title,
                "price": land.price,
                "area": land.area,
                "village": land.village,
                "district": land.district,
                "state": land.state,
                "image_url": land.image_url,
            })

    return result