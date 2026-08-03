from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.models import User, EmailVerification
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
        password=hash_password(user.password)
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
@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):

    print("=" * 60)
    print("LOGIN ATTEMPT")
    print("Email:", form_data.username)

    db_user = (
        db.query(User)
        .filter(User.email == form_data.username)
        .first()
    )

    print("Database User:", db_user)

    if db_user is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid email or password"
        )

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

    access_token = create_access_token(
        {
            "user_id": db_user.id
        }
    )

    print("Login Successful")
    print("=" * 60)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "full_name":db_user.user.full_name 
    }
from app.auth import get_current_user

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
        "role": user.role
    }
from app.schemas import ProfileUpdate

@router.put("/profile")
def update_profile(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == current_user).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.full_name = data.full_name
    user.mobile = data.mobile

    db.commit()
    db.refresh(user)

    return {
        "message": "Profile updated successfully"
    }
@router.put("/change-password")
def change_password(
    data: ChangePassword,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == current_user).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify current password
    if not verify_password(data.current_password, user.password):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )

    # Check new password confirmation
    if data.new_password != data.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="New passwords do not match"
        )

    # Optional: Prevent reusing the same password
    if verify_password(data.new_password, user.password):
        raise HTTPException(
            status_code=400,
            detail="New password must be different from the current password"
        )

    # Update password
    user.password = get_password_hash(data.new_password)

    db.commit()

    return {
        "message": "Password changed successfully"
    }