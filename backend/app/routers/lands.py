from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Land, User
from app.schemas import LandCreate

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
        owner_id=current_user
    )

    db.add(new_land)
    db.commit()
    db.refresh(new_land)

    return {
        "message": "Land Added Successfully",
        "land_id": new_land.id
    }


# ==========================
# Get All Lands
# ==========================
@router.get("/")
def get_all_lands(db: Session = Depends(get_db)):
    return db.query(Land).all()


# ==========================
# Get Land By ID
# ==========================
@router.get("/{land_id}")
def get_land(land_id: int, db: Session = Depends(get_db)):

    land = db.query(Land).filter(Land.id == land_id).first()

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    owner = db.query(User).filter(User.id == land.owner_id).first()

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

    existing_land = db.query(Land).filter(
        Land.id == land_id
    ).first()

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

    db.commit()
    db.refresh(existing_land)

    return {
        "message": "Land Updated Successfully",
        "land": existing_land
    }
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
        .filter(Land.owner_id == current_user)
        .all()
    )

    return lands


# ==========================
# Delete Land
# ==========================
@router.delete("/{land_id}")
def delete_land(
    land_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):

    land = db.query(Land).filter(
        Land.id == land_id
    ).first()

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

    db.delete(land)
    db.commit()

    return {
        "message": "Land Deleted Successfully"
    }