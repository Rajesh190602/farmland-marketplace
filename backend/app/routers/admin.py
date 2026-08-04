from fastapi import APIRouter, Depends,HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.database import get_db
from app.models import User, Land
from app.schemas import LandUpdate,UserUpdate 

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


@router.get("/dashboard")
def admin_dashboard(
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    total_users = db.query(User).count()
    total_lands = db.query(Land).count()

    total_farmers = (
        db.query(User)
        .filter(User.role == "farmer")
        .count()
    )

    total_buyers = (
        db.query(User)
        .filter(User.role == "buyer")
        .count()
    )

    total_admins = (
        db.query(User)
        .filter(User.role == "admin")
        .count()
    )
    return {
        "total_users": total_users,
        "total_lands": total_lands,
        "total_farmers": total_farmers,
        "total_buyers": total_buyers,
        "total_admins": total_admins
}
@router.get("/users")
def get_all_users(
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    users = db.query(User).all()

    return [
        {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "mobile": user.mobile,
            "role": user.role
        }
        for user in users
    ] 
@router.get("/lands")
def get_all_lands(
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    lands = db.query(Land).all()

    result = []

    for land in lands:

        owner = (
            db.query(User)
            .filter(User.id == land.owner_id)
            .first()
        )

        result.append({
            "id": land.id,
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

            "latitude": land.latitude,
            "longitude": land.longitude,

            "image_url": land.image_url,

            "owner_id": land.owner_id,
            "owner_name": owner.full_name if owner else "Unknown",
            "owner_email": owner.email if owner else "",
            "owner_mobile": owner.mobile if owner else ""
        })

    return result

@router.delete("/lands/{land_id}")
def delete_land_admin(
    land_id: int,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    land = db.query(Land).filter(Land.id == land_id).first()

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    db.delete(land)
    db.commit()

    return {
        "message": "Land deleted successfully"
    }
@router.put("/lands/{land_id}")
def update_land_admin(
    land_id: int,
    updated_land: LandUpdate,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    land = db.query(Land).filter(Land.id == land_id).first()

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    updates = updated_land.model_dump(exclude_unset=True)

    for key, value in updates.items():
        setattr(land, key, value)

    db.commit()
    db.refresh(land)

    return {
        "message": "Land updated successfully",
        "land": {
            "id": land.id,
            "title": land.title,
            "price": land.price,
            "village": land.village
        }
    }
@router.get("/lands/{land_id}")
def get_land_by_id(
    land_id: int,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    land = db.query(Land).filter(Land.id == land_id).first()

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    return {
        "id": land.id,
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
        "latitude": land.latitude,
        "longitude": land.longitude,
        "image_url": land.image_url
    }
@router.get("/users/{user_id}")
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    lands_count = (
        db.query(Land)
        .filter(Land.owner_id == user.id)
        .count()
    )

    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "mobile": user.mobile,
        "role": user.role,
        "total_lands": lands_count
    }
@router.put("/users/{user_id}")
def update_user_admin(
    user_id: int,
    updated_user: UserUpdate,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    updates = updated_user.model_dump(exclude_unset=True)

    for key, value in updates.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)

    return {
        "message": "User updated successfully",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "mobile": user.mobile,
            "role": user.role
        }
    }
@router.delete("/users/{user_id}")
def delete_user_admin(
    user_id: int,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    db.delete(user)
    db.commit()

    return {
        "message": "User deleted successfully"
    }