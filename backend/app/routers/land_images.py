from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import List
import io
import cloudinary.uploader
from PIL import Image, UnidentifiedImageError
from app import models
from app.auth import get_current_user
from app.database import get_db
from app.utils.activity_log import create_activity_log


router = APIRouter(
    prefix="/lands",
    tags=["Land Images"]
)


# =========================================================
# Image Upload Security Settings
# =========================================================

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB per image


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

    # Only owner can upload images
    if land.owner_id != current_user:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to upload images for this land"
        )

    if not files:
        raise HTTPException(
            status_code=400,
            detail="Please select at least one image"
        )

    uploaded_images = []

    try:
        for file in files:

            # -------------------------------------------------
            # Validate file type
            # -------------------------------------------------
            if file.content_type not in ALLOWED_IMAGE_TYPES:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"{file.filename} must be a JPEG, PNG, "
                        "or WebP image."
                    )
                )

            # -------------------------------------------------
            # Read file so size can be checked
            # -------------------------------------------------
            contents = await file.read()

            if not contents:
                raise HTTPException(
                    status_code=400,
                    detail=f"{file.filename} is empty."
                )

            if len(contents) > MAX_IMAGE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=(
                        f"{file.filename} must be 5 MB or smaller."
                    )
                )
                        # -------------------------------------------------
            # Validate actual image contents
            # -------------------------------------------------
            try:
                with Image.open(io.BytesIO(contents)) as image:
                    detected_format = image.format

                    if detected_format not in {"JPEG", "PNG", "WEBP"}:
                        raise HTTPException(
                            status_code=400,
                            detail=(
                                f"{file.filename} is not a valid "
                                "JPEG, PNG, or WebP image."
                            )
                        )

                    image.verify()

            except HTTPException:
                raise

            except (UnidentifiedImageError, OSError, SyntaxError):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"{file.filename} is not a valid image."
                    )
                )

            # -------------------------------------------------
            # Upload validated image to Cloudinary
            # -------------------------------------------------
            result = cloudinary.uploader.upload(
                contents,
                resource_type="image",
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

        # -----------------------------------------------------
        # Activity log
        # -----------------------------------------------------
        create_activity_log(
            db=db,
            user_id=current_user,
            action="UPLOAD_IMAGES",
            description=(
                f'Uploaded {len(uploaded_images)} image(s) '
                f'for land "{land.title}"'
            ),
            target_type="LAND",
            target_id=land.id,
        )

        db.commit()

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()

        # Do not expose internal Cloudinary/database errors
        raise HTTPException(
            status_code=500,
            detail="Failed to upload land images."
        )

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

    # Only owner can delete images
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

    # Delete database record
    db.delete(image)

    # Activity log
    create_activity_log(
        db=db,
        user_id=current_user,
        action="DELETE_IMAGE",
        description=(
            f'Deleted image {image_id} from land "{land.title}"'
        ),
        target_type="LAND",
        target_id=land.id,
    )

    db.commit()

    return {
        "message": "Land image deleted successfully"
    }