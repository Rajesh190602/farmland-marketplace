"""
Step 68 - KYC / Identity Verification

Sensitive KYC documents are deliberately NOT handled by the public
image-upload endpoint. They are uploaded to Cloudinary as authenticated
raw resources and can only be accessed through the admin-protected
document endpoint.
"""

import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import cloudinary
import cloudinary.uploader
import cloudinary.utils

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from app.auth import (
    get_current_admin,
    get_current_user,
    get_current_kyc_user,
    create_access_token,
    oauth2_scheme,
    SECRET_KEY,
    ALGORITHM,
)
from app.database import get_db
from app.models import User, UserKYCVerification, UserAccountStatus
from app.schemas import (
    KYCReviewRequest,
    KYCSubmitResponse,
    KYCVerificationResponse,
)
from app.utils.activity_log import create_activity_log


router = APIRouter(
    prefix="/kyc",
    tags=["KYC / Identity Verification"],
)


# =========================================================
# STEP 68 - SECURITY LIMITS
# =========================================================

ALLOWED_KYC_DOCUMENT_TYPES = {
    "aadhaar",
    "pan",
    "voter_id",
    "driving_license",
    "passport",
    "other",
}

ALLOWED_KYC_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
}

MAX_KYC_DOCUMENT_SIZE = 10 * 1024 * 1024  # 10 MB

# Signed/private URL lifetime.
KYC_DOCUMENT_URL_SECONDS = 300  # 5 minutes


# =========================================================
# HELPERS
# =========================================================

def _get_user(db: Session, user_id: int) -> User:
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    return user


def _validate_pdf_signature(contents: bytes) -> bool:
    return contents.startswith(b"%PDF-")


def _validate_image_signature(
    contents: bytes,
    content_type: str,
) -> bool:
    if content_type == "image/jpeg":
        return contents.startswith(b"\xff\xd8\xff")

    if content_type == "image/png":
        return contents.startswith(b"\x89PNG\r\n\x1a\n")

    if content_type == "image/webp":
        return (
            len(contents) >= 12
            and contents[:4] == b"RIFF"
            and contents[8:12] == b"WEBP"
        )

    return False


def _validate_kYC_bytes(
    contents: bytes,
    content_type: str,
) -> None:
    """
    Validate actual file signatures instead of trusting only the browser
    supplied MIME type.
    """
    if content_type == "application/pdf":
        if not _validate_pdf_signature(contents):
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is not a valid PDF.",
            )
        return

    if content_type.startswith("image/"):
        if not _validate_image_signature(contents, content_type):
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is not a valid image.",
            )
        return

    raise HTTPException(
        status_code=400,
        detail="Unsupported KYC document type.",
    )


def _mask_document_number(value: str | None) -> str | None:
    """
    Keep only a small suffix if a document number is supplied.
    We do not store or return the complete number.
    """
    if not value:
        return None

    cleaned = "".join(
        char for char in value.strip()
        if char.isalnum()
    )

    if not cleaned:
        return None

    if len(cleaned) <= 4:
        return "*" * len(cleaned)

    return "*" * (len(cleaned) - 4) + cleaned[-4:]


def _get_extension(filename: str | None, content_type: str) -> str:
    extension = Path(filename or "").suffix.lower()

    if extension in {".pdf", ".jpg", ".jpeg", ".png", ".webp"}:
        return extension.lstrip(".")

    if content_type == "application/pdf":
        return "pdf"

    if content_type == "image/jpeg":
        return "jpg"

    if content_type == "image/png":
        return "png"

    if content_type == "image/webp":
        return "webp"

    return "bin"


def _private_document_url(
    public_id: str,
    content_type: str,
    original_filename: str | None,
) -> str:
    """
    Create a short-lived signed URL for an authenticated Cloudinary raw
    resource. This URL is generated only after admin authorization.
    """
    extension = _get_extension(
        original_filename,
        content_type,
    )

    expires_at = int(
        (datetime.now(timezone.utc) +
         timedelta(seconds=KYC_DOCUMENT_URL_SECONDS)).timestamp()
    )

    try:
        result = cloudinary.utils.private_download_url(
            public_id,
            format=extension,
            resource_type="raw",
            type="authenticated",
            expires_at=expires_at,
            attachment=False,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to create a secure document URL.",
        ) from exc

    if not result:
        raise HTTPException(
            status_code=500,
            detail="Unable to create a secure document URL.",
        )

    return result


# =========================================================
# FARMER + BUYER - SUBMIT / RE-SUBMIT KYC
# =========================================================

@router.post(
    "/submit",
    response_model=KYCSubmitResponse,
)
async def submit_kyc(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    document_number: str | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_kyc_user),
):
    user = _get_user(db, current_user)

    if user.role not in {"farmer", "buyer"}:
        raise HTTPException(
            status_code=403,
            detail="Only farmers and buyers can submit KYC verification.",
        )

    normalized_type = (document_type or "").strip().lower()

    if normalized_type not in ALLOWED_KYC_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid document type. Allowed: "
                + ", ".join(sorted(ALLOWED_KYC_DOCUMENT_TYPES))
            ),
        )

    content_type = (
        file.content_type or ""
    ).split(";", 1)[0].strip().lower()

    if content_type not in ALLOWED_KYC_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, JPG, PNG, and WEBP KYC documents are allowed.",
        )

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="A KYC document is required.",
        )

    try:
        contents = await file.read()
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail="Unable to read the uploaded KYC document.",
        ) from exc

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="The uploaded KYC document is empty.",
        )

    if len(contents) > MAX_KYC_DOCUMENT_SIZE:
        raise HTTPException(
            status_code=413,
            detail="KYC documents must be 10 MB or smaller.",
        )

    _validate_kYC_bytes(
        contents,
        content_type,
    )

    existing = (
        db.query(UserKYCVerification)
        .filter(
            UserKYCVerification.user_id == current_user
        )
        .first()
    )

    # A verified KYC record is not silently replaced. The user must
    # contact/re-submit only when the verification workflow permits it.
    if existing and existing.status == "verified":
        raise HTTPException(
            status_code=409,
            detail="Your KYC is already verified.",
        )

    # Remove the previous authenticated Cloudinary resource when a
    # farmer is replacing a rejected/changes-requested submission.
    if existing and existing.document_public_id:
        try:
            cloudinary.uploader.destroy(
                existing.document_public_id,
                resource_type="raw",
                type="authenticated",
            )
        except Exception:
            # Database state remains authoritative. Cleanup failure should
            # not prevent a corrected KYC document from being submitted.
            pass

    public_id = (
        f"farmland-marketplace/kyc/{current_user}/"
        f"kyc_{current_user}_{int(datetime.now(timezone.utc).timestamp())}"
    )

    try:
        upload_result = cloudinary.uploader.upload(
            contents,
            resource_type="raw",
            type="authenticated",
            public_id=public_id,
            folder=f"farmland-marketplace/kyc/{current_user}",
            use_filename=False,
            unique_filename=False,
            overwrite=True,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to securely upload KYC document.",
        ) from exc

    uploaded_public_id = upload_result.get("public_id")

    if not uploaded_public_id:
        raise HTTPException(
            status_code=500,
            detail="Secure storage did not return a document identifier.",
        )

    if existing:
        verification = existing
    else:
        verification = UserKYCVerification(
            user_id=current_user,
        )
        db.add(verification)

    verification.status = "pending"
    verification.document_type = normalized_type
    verification.document_public_id = uploaded_public_id
    verification.original_filename = file.filename[:255]
    verification.content_type = content_type
    verification.masked_document_number = _mask_document_number(
        document_number
    )
    verification.rejection_reason = None
    verification.reviewed_by_id = None
    verification.reviewed_at = None
    verification.submitted_at = datetime.now(timezone.utc)

    db.flush()

    create_activity_log(
        db=db,
        user_id=current_user,
        action="KYC_SUBMITTED",
        description=(
            f'Submitted KYC document for verification '
            f'using {normalized_type}.'
        ),
        target_type="USER_KYC",
        target_id=verification.id,
    )

    db.commit()
    db.refresh(verification)

    return KYCSubmitResponse(
        message="KYC document submitted successfully. It is waiting for admin verification.",
        status=verification.status,
    )


# =========================================================
# FARMER + BUYER - OWN KYC STATUS
# =========================================================

@router.get(
    "/me",
    response_model=KYCVerificationResponse,
)
def get_my_kyc(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_kyc_user),
):
    verification = (
        db.query(UserKYCVerification)
        .filter(
            UserKYCVerification.user_id == current_user
        )
        .first()
    )

    if not verification:
        raise HTTPException(
            status_code=404,
            detail="KYC verification has not been submitted.",
        )

    # Deliberately return metadata only. The authenticated document
    # identifier and private URL are never exposed to the farmer/buyer.
    return verification


# =========================================================
# BUYER - ACTIVATE MARKETPLACE AFTER KYC APPROVAL
# =========================================================

def _get_verified_buyer_from_kyc_token(
    token: str,
    db: Session,
) -> User:
    """
    Validate the temporary buyer KYC token for the one-time
    marketplace-session handoff and activate the approved buyer account.

    The restricted token is never accepted by normal marketplace
    endpoints. It can only be exchanged here after the database
    confirms that admin-approved KYC is complete.
    """
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate KYC session.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
    except JWTError:
        raise credentials_exception

    if payload.get("scope") != "kyc":
        raise HTTPException(
            status_code=403,
            detail="A KYC-only session is required for this action.",
        )

    user_id = payload.get("user_id")
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise credentials_exception

    user = _get_user(db, user_id)

    if user.role != "buyer":
        raise HTTPException(
            status_code=403,
            detail="Only buyers can activate a marketplace session through KYC.",
        )

    if user.is_suspended:
        raise HTTPException(
            status_code=403,
            detail="Your account has been suspended. Please contact the administrator.",
        )

    account_status = (
        db.query(UserAccountStatus)
        .filter(UserAccountStatus.user_id == user.id)
        .first()
    )

    verification = (
        db.query(UserKYCVerification)
        .filter(UserKYCVerification.user_id == user.id)
        .first()
    )

    if not verification or verification.status != "verified":
        raise HTTPException(
            status_code=403,
            detail="Your KYC has not been approved yet.",
        )

    # Admin approval is the authority for buyer KYC activation. If the
    # account-status row is missing or still pending due to an earlier
    # deployment/state mismatch, repair it here before issuing the normal
    # marketplace token. Never override an explicit deactivation.
    if account_status and account_status.status == "deactivated":
        raise HTTPException(
            status_code=403,
            detail="Your account has been deactivated.",
        )

    if not account_status:
        account_status = UserAccountStatus(user_id=user.id)
        db.add(account_status)

    if account_status.status != "active":
        account_status.status = "active"
        account_status.reactivated_at = datetime.utcnow()
        db.flush()

    return user


@router.post("/continue")
def continue_to_marketplace(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """
    Securely exchange an approved buyer's temporary KYC token
    for a normal marketplace token.

    This endpoint is intentionally available only through a
    scope=kyc token and only after admin approval.
    """
    user = _get_verified_buyer_from_kyc_token(token, db)

    access_token = create_access_token(
        {"user_id": user.id}
    )

    create_activity_log(
        db=db,
        user_id=user.id,
        action="KYC_MARKETPLACE_ACTIVATED",
        description="Buyer entered the marketplace after admin-approved KYC.",
        target_type="USER_KYC",
        target_id=user.id,
    )

    db.commit()

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "full_name": user.full_name,
        "role": user.role,
        "account_status": "active",
        "kyc_verified": True,
    }


# =========================================================
# ADMIN - KYC QUEUE
# =========================================================

@router.get(
    "/admin/pending",
)
def get_pending_kyc(
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    records = (
        db.query(UserKYCVerification)
        .filter(
            UserKYCVerification.status.in_(
                ["pending", "changes_requested"]
            )
        )
        .order_by(
            UserKYCVerification.submitted_at.asc(),
            UserKYCVerification.id.asc(),
        )
        .limit(100)
        .all()
    )

    result = []

    for record in records:
        user = (
            db.query(User)
            .filter(User.id == record.user_id)
            .first()
        )

        result.append(
            {
                "id": record.id,
                "user_id": record.user_id,
                "user_name": user.full_name if user else "Unknown",
                "user_email": user.email if user else "",
                "user_mobile": user.mobile if user else "",
                "status": record.status,
                "document_type": record.document_type,
                "original_filename": record.original_filename,
                "content_type": record.content_type,
                "masked_document_number": record.masked_document_number,
                "rejection_reason": record.rejection_reason,
                "submitted_at": record.submitted_at,
                "reviewed_at": record.reviewed_at,
            }
        )

    return {
        "total": len(result),
        "kyc_verifications": result,
    }


# =========================================================
# ADMIN - KYC DETAIL
# =========================================================

@router.get(
    "/admin/{verification_id}",
    response_model=KYCVerificationResponse,
)
def get_kyc_detail(
    verification_id: int,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    verification = (
        db.query(UserKYCVerification)
        .filter(
            UserKYCVerification.id == verification_id
        )
        .first()
    )

    if not verification:
        raise HTTPException(
            status_code=404,
            detail="KYC verification not found.",
        )

    return verification


# =========================================================
# ADMIN - SECURE KYC DOCUMENT ACCESS
# =========================================================

@router.get(
    "/admin/{verification_id}/document",
)
def get_kyc_document(
    verification_id: int,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    verification = (
        db.query(UserKYCVerification)
        .filter(
            UserKYCVerification.id == verification_id
        )
        .first()
    )

    if not verification:
        raise HTTPException(
            status_code=404,
            detail="KYC verification not found.",
        )

    if not verification.document_public_id:
        raise HTTPException(
            status_code=404,
            detail="KYC document is not available.",
        )

    signed_url = _private_document_url(
        public_id=verification.document_public_id,
        content_type=verification.content_type or "application/pdf",
        original_filename=verification.original_filename,
    )

    # Do not return the Cloudinary identifier. Redirect only after the
    # admin has passed the API authorization check.
    return RedirectResponse(
        url=signed_url,
        status_code=307,
    )


# =========================================================
# ADMIN - REVIEW KYC
# =========================================================

@router.post(
    "/admin/{verification_id}/review",
)
def review_kyc(
    verification_id: int,
    data: KYCReviewRequest,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    verification = (
        db.query(UserKYCVerification)
        .filter(
            UserKYCVerification.id == verification_id
        )
        .first()
    )

    if not verification:
        raise HTTPException(
            status_code=404,
            detail="KYC verification not found.",
        )

    if verification.status not in {
        "pending",
        "changes_requested",
        "verify",
    }:
        raise HTTPException(
            status_code=409,
            detail=(
                f'KYC cannot be reviewed from its current status '
                f'"{verification.status}".'
            ),
        )

    action = data.action
    reason = (data.reason or "").strip()

    if action in {"reject", "changes_requested"} and not reason:
        raise HTTPException(
            status_code=400,
            detail="A reason is required when rejecting or requesting changes.",
        )

    verification.status = "verified" if action == "verify" else action
    verification.rejection_reason = (
        reason if action != "verify" else None
    )
    verification.reviewed_by_id = admin

    # Buyer access is controlled by KYC approval.
    user = db.query(User).filter(User.id == verification.user_id).first()
    if user and user.role == "buyer":
        account_status = (
            db.query(UserAccountStatus)
            .filter(UserAccountStatus.user_id == user.id)
            .first()
        )
        if not account_status:
            account_status = UserAccountStatus(user_id=user.id)
            db.add(account_status)

        account_status.status = (
            "active" if action == "verify" else "pending_kyc"
        )
        if action == "verify":
            account_status.reactivated_at = datetime.utcnow()
    verification.reviewed_at = datetime.now(timezone.utc)

    create_activity_log(
        db=db,
        user_id=admin,
        action=f"KYC_{action.upper()}",
        description=(
            f"Admin {admin} marked KYC verification "
            f"{verification.id} as {action}."
            + (f" Reason: {reason}" if reason else "")
        ),
        target_type="USER_KYC",
        target_id=verification.id,
    )

    db.commit()
    db.refresh(verification)

    return {
        "message": (
            "KYC verified successfully."
            if action == "verify"
            else (
                "KYC rejected."
                if action == "reject"
                else "Changes requested for KYC."
            )
        ),
        "verification": KYCVerificationResponse.model_validate(
            verification
        ).model_dump(),
    }
