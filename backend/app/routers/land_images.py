from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import List

import cloudinary.uploader

from app import models
from app.auth import get_current_user
from app.database import get_db


router = APIRouter(
    prefix="/lands",
    tags=["Land Images"]
)


# =========================================================
# Upload Multiple Images for a Land
# =========================================================

@router.post("/{land_id}/images")
async def upload_land_images(
    land_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    # Find land
    land = (
        db.query(models.Land)
        .filter(models.Land.id == land_id)
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    # Only the land owner can upload images
    if land.owner_id != current_user:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to upload images for this land"
        )

    uploaded_images = []

    for file in files:
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail=f"{file.filename} is not a valid image file"
            )

        try:
            result = cloudinary.uploader.upload(
                file.file,
                folder=f"farmland-marketplace/lands/{land_id}"
            )

            image = models.LandImage(
                image_url=result["secure_url"],
                land_id=land_id
            )

            db.add(image)
            db.flush()

            uploaded_images.append({
                "id": image.id,
                "image_url": image.image_url
            })

        except Exception as e:
            db.rollback()

            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload {file.filename}: {str(e)}"
            )

    db.commit()

    return {
        "message": "Land images uploaded successfully",
        "land_id": land_id,
        "images": uploaded_images
    }


# =========================================================
# Get Images for a Land
# =========================================================

@router.get("/{land_id}/images")
def get_land_images(
    land_id: int,
    db: Session = Depends(get_db)
):
    land = (
        db.query(models.Land)
        .filter(models.Land.id == land_id)
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    images = (
        db.query(models.LandImage)
        .filter(models.LandImage.land_id == land_id)
        .order_by(models.LandImage.id.asc())
        .all()
    )

    return [
        {
            "id": image.id,
            "image_url": image.image_url
        }
        for image in images
    ]


# =========================================================
# Delete Land Image
# =========================================================

@router.delete("/{land_id}/images/{image_id}")
def delete_land_image(
    land_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    land = (
        db.query(models.Land)
        .filter(models.Land.id == land_id)
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    # Only the land owner can delete images
    if land.owner_id != current_user:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to delete images for this land"
        )

    image = (
        db.query(models.LandImage)
        .filter(
            models.LandImage.id == image_id,
            models.LandImage.land_id == land_id
        )
        .first()
    )

    if not image:
        raise HTTPException(
            status_code=404,
            detail="Image not found"
        )

    db.delete(image)
    db.commit()

    return {
        "message": "Land image deleted successfully"
    }