from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Favorite, Land
from app.auth import get_current_user

router = APIRouter(
    prefix="/favorites",
    tags=["Favorites"]
)

@router.post("/{land_id}")
def add_favorite(
    land_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    land = db.query(Land).filter(Land.id == land_id).first()

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    existing = db.query(Favorite).filter(
        Favorite.user_id == current_user,
        Favorite.land_id == land_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Already in favorites"
        )

    favorite = Favorite(
        user_id=current_user,
        land_id=land_id
    )

    db.add(favorite)
    db.commit()

    return {
        "message": "Added to favorites"
    }
@router.delete("/{land_id}")
def remove_favorite(
    land_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    favorite = db.query(Favorite).filter(
        Favorite.user_id == current_user,
        Favorite.land_id == land_id
    ).first()

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
@router.get("/")
def get_my_favorites(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    favorites = (
        db.query(Favorite)
        .filter(Favorite.user_id == current_user)
        .all()
    )

    result = []

    for favorite in favorites:
        land = db.query(Land).filter(
            Land.id == favorite.land_id
        ).first()

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