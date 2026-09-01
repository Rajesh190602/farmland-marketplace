from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import SavedSearch


router = APIRouter(
    prefix="/saved-searches",
    tags=["Saved Searches"],
)


# =========================================================
# CREATE SAVED SEARCH
# =========================================================

@router.post("/")
def create_saved_search(
    data: dict,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    name = str(data.get("name") or "").strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Saved search name is required.",
        )

    if len(name) > 100:
        raise HTTPException(
            status_code=400,
            detail="Saved search name cannot exceed 100 characters.",
        )

    saved_search = SavedSearch(
        user_id=current_user,
        name=name,
        district=data.get("district") or None,
        village=data.get("village") or None,
        mandal=data.get("mandal") or None,
        crop_type=data.get("crop_type") or None,
        soil_type=data.get("soil_type") or None,
        water_source=data.get("water_source") or None,
        min_price=data.get("min_price"),
        max_price=data.get("max_price"),
        min_area=data.get("min_area"),
        max_area=data.get("max_area"),
    )

    db.add(saved_search)
    db.commit()
    db.refresh(saved_search)

    return saved_search


# =========================================================
# GET MY SAVED SEARCHES
# =========================================================

@router.get("/")
def get_saved_searches(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    return (
        db.query(SavedSearch)
        .filter(
            SavedSearch.user_id == current_user
        )
        .order_by(
            SavedSearch.created_at.desc()
        )
        .all()
    )


# =========================================================
# GET ONE SAVED SEARCH
# =========================================================

@router.get("/{saved_search_id}")
def get_saved_search(
    saved_search_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    saved_search = (
        db.query(SavedSearch)
        .filter(
            SavedSearch.id == saved_search_id,
            SavedSearch.user_id == current_user,
        )
        .first()
    )

    if not saved_search:
        raise HTTPException(
            status_code=404,
            detail="Saved search not found.",
        )

    return saved_search


# =========================================================
# DELETE SAVED SEARCH
# =========================================================

@router.delete("/{saved_search_id}")
def delete_saved_search(
    saved_search_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    saved_search = (
        db.query(SavedSearch)
        .filter(
            SavedSearch.id == saved_search_id,
            SavedSearch.user_id == current_user,
        )
        .first()
    )

    if not saved_search:
        raise HTTPException(
            status_code=404,
            detail="Saved search not found.",
        )

    db.delete(saved_search)
    db.commit()

    return {
        "message": "Saved search deleted successfully.",
        "id": saved_search_id,
    }