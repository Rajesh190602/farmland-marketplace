from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.models import User, EmailVerification,UserBlock
import cloudinary.uploader
from app.database import get_db
from app.auth import get_current_user
from app.models import User
from app.models import User,EmailVerification
from app.schemas import UserCreate
from datetime import datetime, timedelta
from app.schemas import ChangePassword
from app.auth import verify_password, get_password_hash
from app.models import User, EmailVerification
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Literal
from app.utils.activity_log import create_activity_log
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyForgotOTPRequest(BaseModel):
    email: EmailStr
    otp: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str
    confirm_password: str
from app.schemas import (
    ForgotPasswordRequest,
    VerifyForgotOTPRequest,
    ResetPasswordRequest,
)
from app.schemas import (
    UserCreate,
    SendOTPRequest,
    VerifyOTPRequest
)
from app.utils.email import generate_otp, send_email_otp
from app.auth import (
    hash_password,
    verify_password,
    create_access_token
)

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

# ==========================
# Register User
# ==========================
# ==========================
# Register User
# ==========================
@router.post("/register")
def register(
    user: UserCreate,
    db: Session = Depends(get_db)
):

    # Check email verification
    verification = (
        db.query(EmailVerification)
        .filter(
            EmailVerification.email == user.email,
            EmailVerification.verified == True
        )
        .first()
    )

    if not verification:
        raise HTTPException(
            status_code=400,
            detail="Please verify your email before registering."
        )

    # Check existing email
    existing_email = (
        db.query(User)
        .filter(User.email == user.email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    # Check existing mobile
    existing_mobile = (
        db.query(User)
        .filter(User.mobile == user.mobile)
        .first()
    )

    if existing_mobile:
        raise HTTPException(
            status_code=400,
            detail="Mobile number already exists"
        )

    # Create user
    new_user = User(
        full_name=user.full_name,
        mobile=user.mobile,
        email=user.email,
        password=hash_password(user.password),
        role=user.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Delete OTP record after successful registration
    db.delete(verification)
    db.commit()

    return {
        "message": "User Registered Successfully",
        "user_id": new_user.id
    }

# ==========================
# Login User
# ==========================
# ==========================
# Login User
# ==========================

@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    print("=" * 60)
    print("LOGIN ATTEMPT")
    print("Email:", form_data.username)

    # Find user by email
    db_user = (
        db.query(User)
        .filter(User.email == form_data.username)
        .first()
    )

    print("Database User:", db_user)

    # Check user exists
    if db_user is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid email or password"
        )

    # Verify password
    password_ok = verify_password(
        form_data.password,
        db_user.password
    )

    print("Password Match:", password_ok)

    if not password_ok:
        raise HTTPException(
            status_code=400,
            detail="Invalid email or password"
        )

    # Create JWT access token
    access_token = create_access_token(
        {
            "user_id": db_user.id
        }
    )

    # =====================================================
    # Activity Log
    # =====================================================

    if db_user.role == "admin":
        login_description = "Admin logged in"
    elif db_user.role == "farmer":
        login_description = "Farmer logged in"
    elif db_user.role == "buyer":
        login_description = "Buyer logged in"
    else:
        login_description = "User logged in"

    create_activity_log(
        db=db,
        user_id=db_user.id,
        action="LOGIN",
        description=login_description,
        target_type="USER",
        target_id=db_user.id,
    )

    # Save activity log
    db.commit()

    print("Login Successful")
    print("=" * 60)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": db_user.id,
        "full_name": db_user.full_name,
        "role": db_user.role,
    }

@router.get("/me")
def get_me(
    current_user: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == current_user).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "email": user.email,
        "role": user.role
    }
@router.post("/send-otp")
def send_otp(
    data: SendOTPRequest,
    db: Session = Depends(get_db)
):

    existing_user = db.query(User).filter(
        User.email == data.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    otp = generate_otp()

    expiry = datetime.utcnow() + timedelta(minutes=10)

    verification = db.query(EmailVerification).filter(
        EmailVerification.email == data.email
    ).first()

    if verification:
        verification.otp = otp
        verification.verified = False
        verification.expires_at = expiry
    else:
        verification = EmailVerification(
            email=data.email,
            otp=otp,
            verified=False,
            expires_at=expiry
        )
        db.add(verification)

    db.commit()

    if send_email_otp(data.email, otp):
        return {
            "message": "OTP sent successfully"
        }

    raise HTTPException(
        status_code=500,
        detail="Unable to send OTP"
    )
@router.post("/verify-otp")
def verify_otp(
    data: VerifyOTPRequest,
    db: Session = Depends(get_db)
):

    verification = db.query(EmailVerification).filter(
        EmailVerification.email == data.email
    ).first()

    if not verification:
        raise HTTPException(
            status_code=404,
            detail="OTP not found"
        )

    if verification.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="OTP has expired"
        )

    if verification.otp != data.otp:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    verification.verified = True

    db.commit()

    return {
        "message": "Email verified successfully"
    }
@router.post("/forgot-password")
def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == data.email).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Email not registered"
        )

    otp = generate_otp()
    expiry = datetime.utcnow() + timedelta(minutes=10)

    verification = db.query(EmailVerification).filter(
        EmailVerification.email == data.email
    ).first()

    if verification:
        verification.otp = otp
        verification.verified = False
        verification.expires_at = expiry
    else:
        verification = EmailVerification(
            email=data.email,
            otp=otp,
            verified=False,
            expires_at=expiry
        )
        db.add(verification)

    db.commit()

    if send_email_otp(data.email, otp):
        return {"message": "OTP sent successfully"}

    raise HTTPException(
        status_code=500,
        detail="Unable to send OTP"
    )
@router.post("/verify-forgot-otp")
def verify_forgot_otp(
    data: VerifyForgotOTPRequest,
    db: Session = Depends(get_db)
):
    verification = db.query(EmailVerification).filter(
        EmailVerification.email == data.email
    ).first()

    if not verification:
        raise HTTPException(
            status_code=404,
            detail="OTP not found"
        )

    if verification.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="OTP has expired"
        )

    if verification.otp != data.otp:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    verification.verified = True
    db.commit()

    return {
        "message": "OTP verified successfully"
    }
@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    if data.new_password != data.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match"
        )

    verification = db.query(EmailVerification).filter(
        EmailVerification.email == data.email
    ).first()

    if not verification or not verification.verified:
        raise HTTPException(
            status_code=400,
            detail="Please verify OTP first"
        )

    user = db.query(User).filter(
        User.email == data.email
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    user.password = hash_password(data.new_password)

    db.commit()

    # Clean up the OTP record
    db.delete(verification)
    db.commit()

    return {
        "message": "Password reset successfully"
    }
@router.get("/profile")
def get_profile(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == current_user).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "mobile": user.mobile,
        "role": user.role,
        "profile_image": user.profile_image
    }
# =========================================================
# UPLOAD PROFILE PHOTO
# =========================================================

@router.post("/profile/photo")
async def upload_profile_photo(
    file: UploadFile = File(...),
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
    # Validate file type
    # ----------------------------------

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a valid image file"
        )

    # ----------------------------------
    # Upload to Cloudinary
    # ----------------------------------

    try:
        result = cloudinary.uploader.upload(
            file.file,
            folder=f"farmland-marketplace/profiles/{current_user}"
        )

        profile_image_url = result["secure_url"]

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload profile photo: {str(e)}"
        )

    # ----------------------------------
    # Update user profile image
    # ----------------------------------

    user.profile_image = profile_image_url

    # ----------------------------------
    # Activity log
    # ----------------------------------

    create_activity_log(
        db=db,
        user_id=current_user,
        action="PROFILE_PHOTO_UPDATED",
        description="Updated profile photo.",
        target_type="USER",
        target_id=current_user
    )

    db.commit()
    db.refresh(user)

    return {
        "message": "Profile photo updated successfully",
        "profile_image": user.profile_image
    }

from app.schemas import ProfileUpdate

# =========================================================
# UPDATE PROFILE
# =========================================================

@router.put("/profile")
def update_profile(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
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

    # ----------------------------------
    # Clean input
    # ----------------------------------

    full_name = data.full_name.strip()
    mobile = data.mobile.strip()

    # ----------------------------------
    # Validate full name
    # ----------------------------------

    if not full_name:
        raise HTTPException(
            status_code=400,
            detail="Full Name is required"
        )

    # ----------------------------------
    # Validate mobile
    # ----------------------------------

    if not mobile.isdigit() or len(mobile) != 10:
        raise HTTPException(
            status_code=400,
            detail="Enter a valid 10-digit mobile number"
        )

    # ----------------------------------
    # Check duplicate mobile
    # ----------------------------------

    existing_mobile = (
        db.query(User)
        .filter(
            User.mobile == mobile,
            User.id != current_user
        )
        .first()
    )

    if existing_mobile:
        raise HTTPException(
            status_code=400,
            detail="Mobile number already exists"
        )

    # ----------------------------------
    # Detect changes
    # ----------------------------------

    changes = []

    if user.full_name != full_name:
        changes.append("full name")

    if user.mobile != mobile:
        changes.append("mobile number")

    # ----------------------------------
    # Update user
    # ----------------------------------

    user.full_name = full_name
    user.mobile = mobile

    # ----------------------------------
    # Security activity log
    # ----------------------------------

    if changes:
        create_activity_log(
            db=db,
            user_id=current_user,
            action="PROFILE_UPDATED",
            description=(
                "Updated profile: "
                + ", ".join(changes)
                + "."
            ),
            target_type="USER",
            target_id=current_user
        )

    db.commit()
    db.refresh(user)

    return {
        "message": "Profile updated successfully",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "mobile": user.mobile,
            "role": user.role
        }
    }
# =========================================================
# CHANGE PASSWORD
# =========================================================

@router.put("/change-password")
def change_password(
    data: ChangePassword,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
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

    # ----------------------------------
    # Verify current password
    # ----------------------------------

    if not verify_password(
        data.current_password,
        user.password
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )

    # ----------------------------------
    # Check password confirmation
    # ----------------------------------

    if data.new_password != data.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="New passwords do not match"
        )

    # ----------------------------------
    # Prevent same password
    # ----------------------------------

    if verify_password(
        data.new_password,
        user.password
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "New password must be different "
                "from the current password"
            )
        )

    # ----------------------------------
    # Update password
    # ----------------------------------

    user.password = get_password_hash(
        data.new_password
    )

    # ----------------------------------
    # Security activity log
    # ----------------------------------

    create_activity_log(
        db=db,
        user_id=current_user,
        action="PASSWORD_CHANGED",
        description="User changed their password.",
        target_type="USER",
        target_id=current_user
    )

    db.commit()

    return {
        "message": "Password changed successfully"
    }
# =========================================================
# PHASE 2 - USER BLOCK
# =========================================================

@router.post("/{user_id}/block")
def block_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    # ----------------------------------
    # Cannot block yourself
    # ----------------------------------

    if user_id == current_user:
        raise HTTPException(
            status_code=400,
            detail="You cannot block yourself"
        )

    # ----------------------------------
    # Check target user exists
    # ----------------------------------

    target_user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not target_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # ----------------------------------
    # Check if already blocked
    # ----------------------------------

    existing_block = (
        db.query(UserBlock)
        .filter(
            UserBlock.blocker_id == current_user,
            UserBlock.blocked_id == user_id
        )
        .first()
    )

    if existing_block:
        raise HTTPException(
            status_code=400,
            detail="User is already blocked"
        )

    # ----------------------------------
    # Create block
    # ----------------------------------

    block = UserBlock(
        blocker_id=current_user,
        blocked_id=user_id
    )

    db.add(block)
    db.commit()
    db.refresh(block)

    return {
        "message": "User blocked successfully.",
        "user_id": user_id,
        "blocked": True
    }


@router.delete("/{user_id}/block")
def unblock_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    # ----------------------------------
    # Find block
    # ----------------------------------

    existing_block = (
        db.query(UserBlock)
        .filter(
            UserBlock.blocker_id == current_user,
            UserBlock.blocked_id == user_id
        )
        .first()
    )

    if not existing_block:
        raise HTTPException(
            status_code=404,
            detail="User is not blocked"
        )

    # ----------------------------------
    # Remove block
    # ----------------------------------

    db.delete(existing_block)
    db.commit()

    return {
        "message": "User unblocked successfully.",
        "user_id": user_id,
        "blocked": False
    }


@router.get("/blocked")
def get_blocked_users(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    blocks = (
        db.query(UserBlock)
        .filter(
            UserBlock.blocker_id == current_user
        )
        .order_by(UserBlock.created_at.desc())
        .all()
    )

    result = []

    for block in blocks:
        user = (
            db.query(User)
            .filter(User.id == block.blocked_id)
            .first()
        )

        if user:
            result.append({
                "user_id": user.id,
                "full_name": user.full_name,
                "profile_image": user.profile_image,
                "blocked_at": block.created_at
            })

    return result
