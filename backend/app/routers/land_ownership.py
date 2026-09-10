from io import BytesIO

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

import cloudinary
import cloudinary.uploader
import cloudinary.utils

from app.auth import get_current_admin, get_current_user
from app.database import get_db
from app.models import (
    Land,
    LandOwnershipVerification,
    User,
    Notification,
)
from app.schemas import (
    LandOwnershipReviewRequest,
    LandOwnershipSubmitResponse,
    LandOwnershipVerificationResponse,
)
from app.utils.activity_log import create_activity_log


router = APIRouter(
    prefix="/land-ownership",
    tags=["Land Ownership Verification"],
)


ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
}

MAX_FILE_SIZE = 10 * 1024 * 1024


def _validate_document(data: bytes, content_type: str | None) -> None:
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Pattadhar Passbook file must be 10 MB or smaller.",
        )

    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, JPG, PNG, and WEBP files are allowed.",
        )

    if data.startswith(b"%PDF-"):
        if content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Invalid document type.")
        return

    signatures = {
        "image/jpeg": data.startswith(b"\xff\xd8\xff"),
        "image/png": data.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/webp": data.startswith(b"RIFF") and data[8:12] == b"WEBP",
    }

    if not signatures.get(content_type, False):
        raise HTTPException(
            status_code=400,
            detail="The uploaded file does not match its declared file type.",
        )


def _get_owned_land(
    land_id: int,
    current_user: int,
    db: Session,
) -> Land:
    land = db.query(Land).filter(Land.id == land_id).first()

    if not land:
        raise HTTPException(status_code=404, detail="Land not found.")

    if land.owner_id != current_user:
        raise HTTPException(
            status_code=403,
            detail="You can only submit documents for your own land.",
        )

    return land


@router.post(
    "/lands/{land_id}/document",
    response_model=LandOwnershipSubmitResponse,
)
async def submit_passbook(
    land_id: int,
    document: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.role != "farmer":
        raise HTTPException(
            status_code=403,
            detail="Only farmers can submit land ownership documents.",
        )

    land = _get_owned_land(land_id, current_user, db)

    data = await document.read()
    _validate_document(data, document.content_type)

    existing = (
        db.query(LandOwnershipVerification)
        .filter(LandOwnershipVerification.land_id == land.id)
        .first()
    )

    # Store the passbook as a private authenticated/raw Cloudinary asset.
    # Do not use the public /uploads directory or the normal image upload endpoint.
    upload_result = cloudinary.uploader.upload(
        BytesIO(data),
        resource_type="raw",
        type="authenticated",
        public_id=f"land_ownership/{land.id}/passbook",
        overwrite=True,
        invalidate=True,
    )

    public_id = upload_result.get("public_id")
    if not public_id:
        raise HTTPException(
            status_code=500,
            detail="The ownership document could not be stored securely.",
        )

    if not existing:
        verification = LandOwnershipVerification(
            land_id=land.id,
            status="pending",
            document_public_id=public_id,
            original_filename=document.filename,
            content_type=document.content_type,
            survey_number_snapshot=land.survey_number,
            owner_name_snapshot=user.full_name,
            rejection_reason=None,
        )
        db.add(verification)
    else:
        verification = existing
        verification.status = "pending"
        verification.document_public_id = public_id
        verification.original_filename = document.filename
        verification.content_type = document.content_type
        verification.survey_number_snapshot = land.survey_number
        verification.owner_name_snapshot = user.full_name
        verification.rejection_reason = None
        verification.reviewed_by_id = None
        verification.reviewed_at = None

    # A new/replaced document must return the land to the verification queue.
    land.status = "pending"
    land.is_published = False
    land.rejection_reason = None

    db.flush()

    create_activity_log(
        db=db,
        user_id=current_user,
        action="SUBMIT_LAND_OWNERSHIP_DOCUMENT",
        description=f'Submitted Pattadhar Passbook for land "{land.title}"',
        target_type="LAND",
        target_id=land.id,
    )

    db.commit()

    return LandOwnershipSubmitResponse(
        message="Pattadhar Passbook submitted successfully. It is now waiting for admin verification.",
        land_id=land.id,
        status="pending",
    )


@router.get(
    "/lands/{land_id}/status",
    response_model=LandOwnershipVerificationResponse | None,
)
def get_ownership_status(
    land_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    land = _get_owned_land(land_id, current_user, db)

    verification = (
        db.query(LandOwnershipVerification)
        .filter(LandOwnershipVerification.land_id == land.id)
        .first()
    )

    return verification


@router.get("/admin/pending")
def get_pending_ownership_verifications(
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    rows = (
        db.query(LandOwnershipVerification, Land, User)
        .join(Land, Land.id == LandOwnershipVerification.land_id)
        .join(User, User.id == Land.owner_id)
        .filter(LandOwnershipVerification.status.in_(["pending", "changes_requested"]))
        .order_by(LandOwnershipVerification.submitted_at.asc())
        .all()
    )

    return [
        {
            "verification_id": verification.id,
            "land_id": land.id,
            "land_title": land.title,
            "owner_id": owner.id,
            "owner_name": owner.full_name,
            "village": land.village,
            "mandal": land.mandal,
            "district": land.district,
            "survey_number": land.survey_number,
            "verification_status": verification.status,
            "submitted_at": verification.submitted_at,
        }
        for verification, land, owner in rows
    ]


@router.get("/admin/{verification_id}")
def get_ownership_verification_detail(
    verification_id: int,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    row = (
        db.query(LandOwnershipVerification, Land, User)
        .join(Land, Land.id == LandOwnershipVerification.land_id)
        .join(User, User.id == Land.owner_id)
        .filter(LandOwnershipVerification.id == verification_id)
        .first()
    )

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Land ownership verification not found.",
        )

    verification, land, owner = row

    return {
        "verification_id": verification.id,
        "land": {
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
            "latitude": land.latitude,
            "longitude": land.longitude,
        },
        "owner": {
            "id": owner.id,
            "full_name": owner.full_name,
            "mobile": owner.mobile,
            "email": owner.email,
        },
        "verification": {
            "id": verification.id,
            "status": verification.status,
            "original_filename": verification.original_filename,
            "content_type": verification.content_type,
            "masked_document_number": verification.masked_document_number,
            "survey_number_snapshot": verification.survey_number_snapshot,
            "owner_name_snapshot": verification.owner_name_snapshot,
            "rejection_reason": verification.rejection_reason,
            "submitted_at": verification.submitted_at,
            "reviewed_at": verification.reviewed_at,
        },
    }


@router.get("/admin/{verification_id}/document")
def get_private_passbook(
    verification_id: int,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    verification = (
        db.query(LandOwnershipVerification)
        .filter(LandOwnershipVerification.id == verification_id)
        .first()
    )

    if not verification:
        raise HTTPException(
            status_code=404,
            detail="Land ownership verification not found.",
        )

    # Cloudinary authenticated assets require a signed delivery URL.
    # The URL is intentionally short-lived and is never stored in the database.
    try:
        signed_url, _ = cloudinary.utils.cloudinary_url(
            verification.document_public_id,
            resource_type="raw",
            type="authenticated",
            sign_url=True,
            secure=True,
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to create a secure document URL.",
        )

    return RedirectResponse(
        url=signed_url,
        status_code=307,
    )


@router.post("/admin/{verification_id}/review")
def review_ownership_verification(
    verification_id: int,
    payload: LandOwnershipReviewRequest,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    verification = (
        db.query(LandOwnershipVerification)
        .filter(LandOwnershipVerification.id == verification_id)
        .first()
    )

    if not verification:
        raise HTTPException(
            status_code=404,
            detail="Land ownership verification not found.",
        )

    land = db.query(Land).filter(Land.id == verification.land_id).first()
    if not land:
        raise HTTPException(status_code=404, detail="Land not found.")

    if payload.action in {"reject", "changes_requested"} and not payload.reason:
        raise HTTPException(
            status_code=400,
            detail="A reason is required when rejecting or requesting changes.",
        )

    if payload.action == "verify":
        verification.status = "verified"
        verification.rejection_reason = None

        # Keep moderation separate: this only verifies ownership.
        # Admin land approval remains a separate action.
        notification = Notification(
            user_id=land.owner_id,
            title="Land Ownership Verified",
            message=(
                f'Your Pattadhar Passbook for "{land.title}" has been verified. '
                "The land can now be reviewed for marketplace approval."
            ),
        )
        db.add(notification)

    elif payload.action == "reject":
        verification.status = "rejected"
        verification.rejection_reason = payload.reason
        land.status = "rejected"
        land.is_published = False
        land.rejection_reason = payload.reason

        db.add(
            Notification(
                user_id=land.owner_id,
                title="Land Ownership Document Rejected",
                message=(
                    f'Your Pattadhar Passbook for "{land.title}" was rejected. '
                    f"Reason: {payload.reason}"
                ),
            )
        )

    else:
        verification.status = "changes_requested"
        verification.rejection_reason = payload.reason
        land.status = "changes_requested"
        land.is_published = False
        land.rejection_reason = payload.reason

        db.add(
            Notification(
                user_id=land.owner_id,
                title="Land Ownership Document Changes Required",
                message=(
                    f'Changes are required for the Pattadhar Passbook of "{land.title}". '
                    f"Reason: {payload.reason}"
                ),
            )
        )

    verification.reviewed_by_id = admin

    from datetime import datetime, timezone
    verification.reviewed_at = datetime.now(timezone.utc)

    create_activity_log(
        db=db,
        user_id=admin,
        action=f"LAND_OWNERSHIP_{payload.action.upper()}",
        description=(
            f'Ownership verification {payload.action} for land "{land.title}"'
        ),
        target_type="LAND",
        target_id=land.id,
    )

    db.commit()

    return {
        "message": f"Land ownership verification {payload.action} successfully.",
        "land_id": land.id,
        "status": verification.status,
    }
