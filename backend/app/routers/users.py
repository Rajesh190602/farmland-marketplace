from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.models import (
    User,
    EmailVerification,
    UserBlock,
    UserAccountStatus,
    UserKYCVerification,
    MFAChallenge,
    AdminReauthChallenge,
)
import cloudinary.uploader
from app.database import get_db
from app.auth import get_current_user, get_current_admin
from app.models import User
from app.models import User,EmailVerification
from app.schemas import UserCreate
from datetime import datetime, timedelta,timezone
import secrets
import hashlib
import pyotp
from app.schemas import ChangePassword
from app.auth import verify_password, get_password_hash
from app.models import User, EmailVerification
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Literal
import io
import cloudinary.uploader
from PIL import Image, UnidentifiedImageError
from app.utils.activity_log import create_activity_log
from app.utils.risk_monitor import create_risk_event
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyForgotOTPRequest(BaseModel):
    email: EmailStr
    otp: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str
    confirm_password: str
class MFAConfirmRequest(BaseModel):
    code: str


class MFALoginVerifyRequest(BaseModel):
    challenge_token: str
    code: str


class AdminReauthRequest(BaseModel):
    password: str
    code: str
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
from app.utils.email import  send_email_otp
def generate_otp():
    return f"{secrets.randbelow(1_000_000):06d}"
OTP_EXPIRY_MINUTES = 10
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_COOLDOWN_SECONDS = 60
MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB

# STEP 77B - Login abuse protection
LOGIN_MAX_FAILED_ATTEMPTS = 5
LOGIN_LOCK_MINUTES = 15

# STEP 77C - OTP abuse protection
OTP_REQUEST_MAX_PER_HOUR = 5
OTP_REQUEST_WINDOW_MINUTES = 60

# STEP 77D-2 - Admin MFA login challenge
MFA_LOGIN_CHALLENGE_MINUTES = 5
MFA_LOGIN_MAX_ATTEMPTS = 5

# STEP 77D-3 - Sensitive-action re-authentication
ADMIN_REAUTH_CHALLENGE_MINUTES = 5
def check_otp_resend_allowed(verification):
    if not verification or not verification.last_sent_at:
        return

    elapsed = datetime.utcnow() - verification.last_sent_at

    if elapsed.total_seconds() < OTP_RESEND_COOLDOWN_SECONDS:
        remaining = max(
            1,
            OTP_RESEND_COOLDOWN_SECONDS - int(elapsed.total_seconds())
        )

        raise HTTPException(
            status_code=429,
            detail=f"Please wait {remaining} seconds before requesting another OTP."
        )


def check_otp_request_limit(verification, user=None, db=None, purpose="OTP"):
    """Enforce a per-email OTP request limit over a rolling one-hour window."""
    if verification is None:
        return

    now = datetime.utcnow()
    window_started_at = verification.otp_request_window_started_at

    # Start a new one-hour window when none exists or the previous window expired.
    if (
        window_started_at is None
        or (now - window_started_at).total_seconds() >= OTP_REQUEST_WINDOW_MINUTES * 60
    ):
        verification.otp_request_window_started_at = now
        verification.otp_request_count = 0
        return

    if (verification.otp_request_count or 0) >= OTP_REQUEST_MAX_PER_HOUR:
        if user is not None and db is not None:
            try:
                create_risk_event(
                    db=db,
                    event_type="EXCESSIVE_OTP_REQUESTS",
                    risk_score=50,
                    user_id=user.id,
                    target_type="USER",
                    target_id=user.id,
                    description=(
                        f"User exceeded {OTP_REQUEST_MAX_PER_HOUR} {purpose.lower()} requests "
                        f"within the {OTP_REQUEST_WINDOW_MINUTES}-minute window."
                    ),
                )
                db.commit()
            except Exception:
                db.rollback()

        remaining_seconds = max(
            1,
            int(
                OTP_REQUEST_WINDOW_MINUTES * 60
                - (now - window_started_at).total_seconds()
            ),
        )
        remaining_minutes = max(1, (remaining_seconds + 59) // 60)

        raise HTTPException(
            status_code=429,
            detail=(
                f"Too many OTP requests. Please try again in "
                f"{remaining_minutes} minute(s)."
            ),
        )


def record_otp_request(verification):
    """Record one successful OTP generation in the current request window."""
    now = datetime.utcnow()
    window_started_at = verification.otp_request_window_started_at

    if (
        window_started_at is None
        or (now - window_started_at).total_seconds() >= OTP_REQUEST_WINDOW_MINUTES * 60
    ):
        verification.otp_request_window_started_at = now
        verification.otp_request_count = 1
        return

    verification.otp_request_count = (verification.otp_request_count or 0) + 1


def create_otp_verification(verification, otp):
    verification.otp_hash = get_password_hash(otp)
    verification.verified = False
    verification.otp_attempts = 0
    verification.expires_at = (
        datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)
    )
    verification.last_sent_at = datetime.utcnow()


def verify_otp_value(verification, supplied_otp):
    now = datetime.utcnow()

    # Check expiration
    if verification.expires_at < now:
        verification.otp_hash = None
        verification.verified = False

        raise HTTPException(
            status_code=400,
            detail="OTP has expired. Please request a new OTP."
        )

    # Check maximum attempts
    if verification.otp_attempts >= OTP_MAX_ATTEMPTS:
        verification.otp_hash = None
        verification.verified = False

        raise HTTPException(
            status_code=429,
            detail="Too many incorrect OTP attempts. Please request a new OTP."
        )

    # Make sure an OTP exists
    if not verification.otp_hash:
        raise HTTPException(
            status_code=400,
            detail="OTP is no longer valid. Please request a new OTP."
        )

    # Verify hashed OTP
    if not verify_password(supplied_otp, verification.otp_hash):
        verification.otp_attempts += 1

        remaining = OTP_MAX_ATTEMPTS - verification.otp_attempts

        if remaining <= 0:
            verification.otp_hash = None
            verification.verified = False

            raise HTTPException(
                status_code=429,
                detail="Too many incorrect OTP attempts. Please request a new OTP."
            )

        raise HTTPException(
            status_code=400,
            detail=f"Invalid OTP. {remaining} attempts remaining."
        )

    # OTP is correct
    verification.verified = True

    # OTP can no longer be used
    verification.otp_hash = None

    return True
from app.auth import (
    hash_password,
    verify_password,
    create_access_token
)


router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


def get_verification_flags(db: Session, user_id: int, role: str):
    """Return server-authoritative farmer/buyer verification flags."""
    verified = (
        db.query(UserKYCVerification.id)
        .filter(
            UserKYCVerification.user_id == user_id,
            UserKYCVerification.status == "verified",
        )
        .first()
        is not None
    )

    return {
        "is_verified_farmer": bool(verified and role == "farmer"),
        "is_verified_buyer": bool(verified and role == "buyer"),
    }

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
    db.flush()

    # Buyer accounts must complete KYC before marketplace access.
    # Farmers remain active immediately after registration.
    account_status = UserAccountStatus(
        user_id=new_user.id,
        status="pending_kyc" if new_user.role == "buyer" else "active",
    )
    db.add(account_status)

    db.commit()
    db.refresh(new_user)

    # Delete OTP record after successful registration
    db.delete(verification)
    db.commit()

    response = {
        "message": "User Registered Successfully",
        "user_id": new_user.id,
        "role": new_user.role,
        "account_status": account_status.status,
        "kyc_required": new_user.role == "buyer",
    }

    if new_user.role == "buyer":
        # Restricted token can access only the KYC workflow.
        response["kyc_token"] = create_access_token(
            {"user_id": new_user.id, "scope": "kyc"},
            expires_delta=timedelta(minutes=30),
        )

    return response

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
    # Find user by email
    db_user = (
        db.query(User)
        .filter(User.email == form_data.username)
        .first()
    )

    # Check user exists
    if db_user is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid email or password"
        )

    # --------------------------------------------------
    # Step 58 - Block login for voluntarily deactivated
    # accounts before issuing a new JWT.
    # --------------------------------------------------

    account_status = (
        db.query(UserAccountStatus)
        .filter(UserAccountStatus.user_id == db_user.id)
        .first()
    )

    if account_status and account_status.status == "deactivated":
        raise HTTPException(
            status_code=403,
            detail=(
                "Your account has been deactivated. "
                "Please contact support if you want to reactivate it."
            )
        )

    # =====================================================
    # STEP 77B - LOGIN ABUSE PROTECTION
    # =====================================================
    now = datetime.utcnow()

    # If a previous temporary lock is still active, reject the login
    # before checking the password.
    if db_user.locked_until and db_user.locked_until > now:
        remaining_seconds = int((db_user.locked_until - now).total_seconds())
        remaining_minutes = max(1, (remaining_seconds + 59) // 60)
        raise HTTPException(
            status_code=429,
            detail=(
                "Too many failed login attempts. "
                f"Please try again in {remaining_minutes} minute(s)."
            )
        )

    # A previous lock has expired. Start a fresh failure window.
    if db_user.locked_until and db_user.locked_until <= now:
        db_user.failed_login_attempts = 0
        db_user.locked_until = None
        db_user.last_failed_login_at = None

    # Verify password
    password_ok = verify_password(
        form_data.password,
        db_user.password
    )

    if not password_ok:
        db_user.failed_login_attempts = (db_user.failed_login_attempts or 0) + 1
        db_user.last_failed_login_at = now

        if db_user.failed_login_attempts >= LOGIN_MAX_FAILED_ATTEMPTS:
            db_user.locked_until = now + timedelta(minutes=LOGIN_LOCK_MINUTES)

            # Create a security risk event when the threshold is reached.
            # Do not allow risk logging failure to break account protection.
            try:
                create_risk_event(
                    db=db,
                    event_type="FAILED_LOGIN_PATTERN",
                    risk_score=50,
                    user_id=db_user.id,
                    target_type="USER",
                    target_id=db_user.id,
                    description=(
                        f"User reached {db_user.failed_login_attempts} failed "
                        "login attempts and was temporarily locked."
                    ),
                )
            except Exception:
                pass

            db.commit()

            raise HTTPException(
                status_code=429,
                detail=(
                    "Too many failed login attempts. "
                    f"Your account is temporarily locked for {LOGIN_LOCK_MINUTES} minutes."
                )
            )

        db.commit()

        remaining_attempts = LOGIN_MAX_FAILED_ATTEMPTS - db_user.failed_login_attempts
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid email or password"
                + (f". {remaining_attempts} attempt(s) remaining." if remaining_attempts > 0 else "")
            )
        )

    # Successful login resets the failure state.
    if (
        db_user.failed_login_attempts
        or db_user.locked_until
        or db_user.last_failed_login_at
    ):
        db_user.failed_login_attempts = 0
        db_user.locked_until = None
        db_user.last_failed_login_at = None

    # Buyer accounts remain blocked from the marketplace until KYC is verified.
    # Password verification happens first so account status is not exposed for
    # invalid credentials. A fresh restricted KYC token is issued here so a
    # buyer can resume KYC even if the registration token expired.
    if db_user.role == "buyer" and account_status and account_status.status == "pending_kyc":
        kyc_token = create_access_token(
            {"user_id": db_user.id, "scope": "kyc"},
            expires_delta=timedelta(minutes=30),
        )
        raise HTTPException(
            status_code=403,
            detail={
                "code": "KYC_REQUIRED",
                "message": "KYC verification is required before you can access the marketplace.",
                "account_status": "pending_kyc",
                "kyc_token": kyc_token,
            },
        )

    # =====================================================
    # STEP 77D-2 - ADMIN MFA LOGIN ENFORCEMENT
    # =====================================================

    if db_user.role == "admin" and bool(db_user.mfa_enabled):

        # Invalidate older unused MFA challenges for this admin.
        db.query(MFAChallenge).filter(
            MFAChallenge.user_id == db_user.id,
            MFAChallenge.consumed_at.is_(None),
        ).update(
            {
                MFAChallenge.consumed_at: now,
            },
            synchronize_session=False,
        )

        # Generate a secure one-time challenge token.
        raw_challenge_token = secrets.token_urlsafe(32)

        # Store only the SHA-256 hash in the database.
        challenge_hash = hashlib.sha256(
            raw_challenge_token.encode("utf-8")
        ).hexdigest()

        current_session_version = (
            getattr(db_user, "admin_session_version", 0) or 0
        )

        mfa_challenge = MFAChallenge(
            user_id=db_user.id,
            admin_session_version=current_session_version,
            token_hash=challenge_hash,
            expires_at=now + timedelta(
                minutes=MFA_LOGIN_CHALLENGE_MINUTES
            ),
            failed_attempts=0,
        )

        db.add(mfa_challenge)

        create_activity_log(
            db=db,
            user_id=db_user.id,
            action="ADMIN_MFA_CHALLENGE_CREATED",
            description="Admin password authentication succeeded and an MFA challenge was created.",
            target_type="USER",
            target_id=db_user.id,
        )

        db.commit()

        return {
            "mfa_required": True,
            "challenge_token": raw_challenge_token,
            "expires_in": MFA_LOGIN_CHALLENGE_MINUTES * 60,
            "user_id": db_user.id,
            "full_name": db_user.full_name,
            "role": "admin",
        }

    # =====================================================
    # Normal JWT login
    # =====================================================

    token_payload = {
        "user_id": db_user.id
    }

    # STEP 77D-1 - Admin sessions carry a server-side
    # session version so privileged sessions can be
    # invalidated immediately.
    if db_user.role == "admin":
        token_payload["admin_session_version"] = (
            getattr(db_user, "admin_session_version", 0) or 0
        )

    access_token = create_access_token(token_payload)

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

    verification_flags = get_verification_flags(
        db=db,
        user_id=db_user.id,
        role=db_user.role,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": db_user.id,
        "full_name": db_user.full_name,
        "role": db_user.role,
        **verification_flags,
    }
# =========================================================
# STEP 77D-2 - ADMIN MFA / TOTP
# =========================================================

@router.post("/admin/mfa/setup")
def setup_admin_mfa(
    current_user: int = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Start TOTP MFA enrollment for the currently authenticated admin.

    MFA is not enabled until the administrator successfully
    confirms a valid authenticator code.
    """

    user = (
        db.query(User)
        .filter(User.id == current_user)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    # Generate a secret only if one does not already exist.
    if not user.mfa_secret:
        user.mfa_secret = pyotp.random_base32()
        db.commit()
        db.refresh(user)

    totp = pyotp.TOTP(user.mfa_secret)

    provisioning_uri = totp.provisioning_uri(
        name=user.email,
        issuer_name="Farmland Marketplace",
    )

    return {
        "mfa_enabled": bool(user.mfa_enabled),
        "provisioning_uri": provisioning_uri,
    }


class MFAConfirmRequest(BaseModel):
    code: str


@router.post("/admin/mfa/confirm")
def confirm_admin_mfa(
    payload: MFAConfirmRequest,
    current_user: int = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Confirm possession of the authenticator app and enable TOTP MFA.
    """

    user = (
        db.query(User)
        .filter(User.id == current_user)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    if not user.mfa_secret:
        raise HTTPException(
            status_code=400,
            detail="MFA setup has not been started.",
        )

    code = str(payload.code or "").strip()

    if not code.isdigit() or len(code) != 6:
        raise HTTPException(
            status_code=400,
            detail="MFA code must be exactly 6 digits.",
        )

    totp = pyotp.TOTP(user.mfa_secret)

    if not totp.verify(code, valid_window=1):
        raise HTTPException(
            status_code=400,
            detail="Invalid MFA code.",
        )

    if not user.mfa_enabled:
        user.mfa_enabled = True

        # Invalidate all previously issued admin sessions.
        user.admin_session_version = (
            getattr(user, "admin_session_version", 0) or 0
        ) + 1

        create_activity_log(
            db=db,
            user_id=user.id,
            action="ADMIN_MFA_ENABLED",
            description="Admin enabled TOTP multi-factor authentication.",
            target_type="USER",
            target_id=user.id,
        )

        db.commit()

    return {
        "message": "MFA enabled successfully.",
        "mfa_enabled": True,
    }


@router.post("/admin/mfa/verify-login")
def verify_admin_mfa_login(
    payload: MFALoginVerifyRequest,
    db: Session = Depends(get_db),
):
    """
    Verify the MFA challenge created after successful admin password login.
    """

    raw_challenge_token = str(
        payload.challenge_token or ""
    ).strip()

    code = str(payload.code or "").strip()

    if not raw_challenge_token:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired MFA challenge.",
        )

    if not code.isdigit() or len(code) != 6:
        raise HTTPException(
            status_code=400,
            detail="MFA code must be exactly 6 digits.",
        )

    challenge_hash = hashlib.sha256(
        raw_challenge_token.encode("utf-8")
    ).hexdigest()

    challenge = (
        db.query(MFAChallenge)
        .filter(MFAChallenge.token_hash == challenge_hash)
        .first()
    )

    if not challenge:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired MFA challenge.",
        )

    now = datetime.now(timezone.utc)

    if challenge.expires_at <= now:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired MFA challenge.",
        )

    if challenge.expires_at <= now:
        challenge.consumed_at = now
        db.commit()

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired MFA challenge.",
        )

    if challenge.failed_attempts >= MFA_LOGIN_MAX_ATTEMPTS:
        challenge.consumed_at = now
        db.commit()

        raise HTTPException(
            status_code=429,
            detail="Too many incorrect MFA attempts. Please log in again.",
        )

    user = (
        db.query(User)
        .filter(User.id == challenge.user_id)
        .first()
    )

    if not user or user.role != "admin":
        challenge.consumed_at = now
        db.commit()

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired MFA challenge.",
        )

    if not user.mfa_enabled or not user.mfa_secret:
        challenge.consumed_at = now
        db.commit()

        raise HTTPException(
            status_code=401,
            detail="MFA is no longer enabled for this account.",
        )

    current_session_version = (
        getattr(user, "admin_session_version", 0) or 0
    )

    if challenge.admin_session_version != current_session_version:
        challenge.consumed_at = now
        db.commit()

        raise HTTPException(
            status_code=401,
            detail="MFA challenge is no longer valid. Please log in again.",
        )

    totp = pyotp.TOTP(user.mfa_secret)

    if not totp.verify(code, valid_window=1):
        challenge.failed_attempts = (
            challenge.failed_attempts or 0
        ) + 1

        if challenge.failed_attempts >= MFA_LOGIN_MAX_ATTEMPTS:
            challenge.consumed_at = now

            try:
                create_risk_event(
                    db=db,
                    event_type="FAILED_MFA_PATTERN",
                    risk_score=50,
                    user_id=user.id,
                    target_type="USER",
                    target_id=user.id,
                    description=(
                        f"Admin reached {challenge.failed_attempts} "
                        "failed MFA login attempts."
                    ),
                )
            except Exception:
                pass

            db.commit()

            raise HTTPException(
                status_code=429,
                detail="Too many incorrect MFA attempts. Please log in again.",
            )

        remaining = (
            MFA_LOGIN_MAX_ATTEMPTS
            - challenge.failed_attempts
        )

        db.commit()

        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid MFA code. "
                f"{remaining} attempt(s) remaining."
            ),
        )

    challenge.consumed_at = now

    token_payload = {
        "user_id": user.id,
        "admin_session_version": current_session_version,
    }

    access_token = create_access_token(token_payload)

    create_activity_log(
        db=db,
        user_id=user.id,
        action="ADMIN_MFA_LOGIN_SUCCESS",
        description="Admin successfully completed TOTP MFA during login.",
        target_type="USER",
        target_id=user.id,
    )

    db.commit()

    verification_flags = get_verification_flags(
        db=db,
        user_id=user.id,
        role=user.role,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "full_name": user.full_name,
        "role": user.role,
        **verification_flags,
    }


# =========================================================
# STEP 77D-3 - ADMIN SENSITIVE-ACTION RE-AUTHENTICATION
# =========================================================

@router.post("/admin/reauth")
def create_admin_reauth_challenge(
    payload: AdminReauthRequest,
    current_user: int = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Re-authenticate an admin with password + TOTP before a sensitive action."""

    user = db.query(User).filter(User.id == current_user).first()

    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")

    if not user.mfa_enabled or not user.mfa_secret:
        raise HTTPException(
            status_code=403,
            detail="Admin MFA must be enabled before sensitive actions.",
        )

    if not verify_password(payload.password, user.password):
        create_activity_log(
            db=db,
            user_id=user.id,
            action="ADMIN_REAUTH_FAILED",
            description="Admin sensitive-action re-authentication failed: invalid password.",
            target_type="USER",
            target_id=user.id,
        )
        db.commit()
        raise HTTPException(status_code=401, detail="Re-authentication failed.")

    code = str(payload.code or "").strip()
    if not code.isdigit() or len(code) != 6:
        raise HTTPException(
            status_code=400,
            detail="MFA code must be exactly 6 digits.",
        )

    if not pyotp.TOTP(user.mfa_secret).verify(code, valid_window=1):
        create_activity_log(
            db=db,
            user_id=user.id,
            action="ADMIN_REAUTH_FAILED",
            description="Admin sensitive-action re-authentication failed: invalid MFA code.",
            target_type="USER",
            target_id=user.id,
        )
        db.commit()
        raise HTTPException(status_code=401, detail="Re-authentication failed.")

    now = datetime.now(timezone.utc)
    current_session_version = getattr(user, "admin_session_version", 0) or 0

    # Invalidate any older unused re-auth tokens for this admin.
    db.query(AdminReauthChallenge).filter(
        AdminReauthChallenge.user_id == user.id,
        AdminReauthChallenge.consumed_at.is_(None),
    ).update(
        {AdminReauthChallenge.consumed_at: now},
        synchronize_session=False,
    )

    raw_reauth_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_reauth_token.encode("utf-8")).hexdigest()

    challenge = AdminReauthChallenge(
        user_id=user.id,
        admin_session_version=current_session_version,
        token_hash=token_hash,
        expires_at=now + timedelta(minutes=ADMIN_REAUTH_CHALLENGE_MINUTES),
        failed_attempts=0,
    )
    db.add(challenge)

    create_activity_log(
        db=db,
        user_id=user.id,
        action="ADMIN_REAUTH_SUCCESS",
        description="Admin completed password and TOTP re-authentication for a sensitive action.",
        target_type="USER",
        target_id=user.id,
    )

    db.commit()

    return {
        "message": "Re-authentication successful.",
        "reauth_token": raw_reauth_token,
        "expires_in": ADMIN_REAUTH_CHALLENGE_MINUTES * 60,
    }


@router.post("/admin/mfa/disable")
def disable_admin_mfa(
    payload: MFAConfirmRequest,
    current_user: int = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Disable TOTP MFA after verifying the current authenticator code.
    """

    user = (
        db.query(User)
        .filter(User.id == current_user)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    if not user.mfa_enabled or not user.mfa_secret:
        raise HTTPException(
            status_code=400,
            detail="MFA is not enabled.",
        )

    code = str(payload.code or "").strip()

    if not code.isdigit() or len(code) != 6:
        raise HTTPException(
            status_code=400,
            detail="MFA code must be exactly 6 digits.",
        )

    totp = pyotp.TOTP(user.mfa_secret)

    if not totp.verify(code, valid_window=1):
        raise HTTPException(
            status_code=400,
            detail="Invalid MFA code.",
        )

    user.mfa_enabled = False
    user.mfa_secret = None

    # Invalidate all previously issued admin sessions.
    user.admin_session_version = (
        getattr(user, "admin_session_version", 0) or 0
    ) + 1

    create_activity_log(
        db=db,
        user_id=user.id,
        action="ADMIN_MFA_DISABLED",
        description="Admin disabled TOTP multi-factor authentication.",
        target_type="USER",
        target_id=user.id,
    )

    db.commit()

    return {
        "message": "MFA disabled successfully.",
        "mfa_enabled": False,
    }


# =========================================================
# END STEP 77D-2
# =========================================================

@router.get("/me")
def get_me(
    current_user: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == current_user).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    verification_flags = get_verification_flags(
        db=db,
        user_id=user.id,
        role=user.role,
    )

    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "admin_permission_role": (
            getattr(user, "admin_permission_role", "NONE")
            if user.role == "admin"
            else "NONE"
        ),
        **verification_flags,
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

    verification = db.query(EmailVerification).filter(
        EmailVerification.email == data.email
    ).first()

    # STEP 77C - Per-email hourly OTP request limit.
    check_otp_request_limit(verification, user=None, db=db, purpose="registration OTP")
    check_otp_resend_allowed(verification)

    otp = generate_otp()

    if verification:
        create_otp_verification(verification, otp)
    else:
        verification = EmailVerification(
            email=data.email,
            otp_hash=get_password_hash(otp),
            verified=False,
            otp_attempts=0,
            expires_at=datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES),
            last_sent_at=datetime.utcnow(),
        )
        db.add(verification)

    # Count this OTP generation only after the request limit check passes.
    record_otp_request(verification)

    try:
        if not send_email_otp(data.email, otp):
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail="Unable to send OTP"
            )

        db.commit()

        return {"message": "OTP sent successfully"}

    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save OTP"
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
            detail="OTP not found. Please request a new OTP."
        )

    verify_otp_value(verification, data.otp.strip())
    db.commit()

    return {"message": "Email verified successfully"}


@router.post("/forgot-password")
def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.email == data.email
    ).first()

    if not user:
        return {
            "message": "If an account exists for this email, an OTP has been sent."
        }
        

    # Deactivated accounts cannot use password recovery to bypass
    # the account deactivation state.
    account_status = (
        db.query(UserAccountStatus)
        .filter(UserAccountStatus.user_id == user.id)
        .first()
    )

    if account_status and account_status.status == "deactivated":
        raise HTTPException(
            status_code=403,
            detail=(
                "Your account has been deactivated. "
                "Please contact support if you want to reactivate it."
            )
        )

    verification = db.query(EmailVerification).filter(
        EmailVerification.email == data.email
    ).first()

    # STEP 77C - Per-email hourly OTP request limit.
    check_otp_request_limit(verification, user=user, db=db, purpose="password recovery OTP")
    check_otp_resend_allowed(verification)

    otp = generate_otp()

    if verification:
        create_otp_verification(verification, otp)
    else:
        verification = EmailVerification(
            email=data.email,
            otp_hash=get_password_hash(otp),
            verified=False,
            otp_attempts=0,
            expires_at=datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES),
            last_sent_at=datetime.utcnow(),
        )
        db.add(verification)

    # Count this OTP generation only after the request limit check passes.
    record_otp_request(verification)

    try:
        if not send_email_otp(data.email, otp):
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail="Unable to send OTP"
            )

        db.commit()

        return {"message": "OTP sent successfully"}

    except HTTPException:
        raise
    except Exception:
        db.rollback()
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
            detail="OTP not found. Please request a new OTP."
        )

    verify_otp_value(verification, data.otp.strip())
    db.commit()

    return {"message": "OTP verified successfully"}


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

    if verification.expires_at < datetime.utcnow():
        db.delete(verification)
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="OTP has expired. Please request a new OTP."
        )

    user = db.query(User).filter(
        User.email == data.email
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    account_status = (
        db.query(UserAccountStatus)
        .filter(UserAccountStatus.user_id == user.id)
        .first()
    )

    if account_status and account_status.status == "deactivated":
        raise HTTPException(
            status_code=403,
            detail=(
                "Your account has been deactivated. "
                "Please contact support if you want to reactivate it."
            )
        )

    user.password = hash_password(data.new_password)

    # STEP 77B - A successful password reset restores normal login state.
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_failed_login_at = None

    # Consume the verified OTP authorization so it cannot be reused.
    verification.verified = False
    verification.otp_hash = None
    verification.otp_attempts = OTP_MAX_ATTEMPTS

    db.commit()

    # Clean up the OTP record after successful password reset.
    db.delete(verification)
    db.commit()

    return {"message": "Password reset successfully"}

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

    verification_flags = get_verification_flags(
        db=db,
        user_id=user.id,
        role=user.role,
    )

    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "mobile": user.mobile,
        "role": user.role,
        "profile_image": user.profile_image,
        **verification_flags,
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

    ALLOWED_PROFILE_IMAGE_TYPES = {
        "image/jpeg",
        "image/png",
        "image/webp",
    }

    if file.content_type not in ALLOWED_PROFILE_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG, and WebP images are allowed."
        )

    # ----------------------------------
    # Read file and validate size
    # ----------------------------------

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty."
        )

    if len(contents) > MAX_PROFILE_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Profile image must be 5 MB or smaller."
        )

    # ----------------------------------
    # Validate actual image contents
    # ----------------------------------

    try:
        with Image.open(io.BytesIO(contents)) as image:
            detected_format = image.format

            if detected_format not in {"JPEG", "PNG", "WEBP"}:
                raise HTTPException(
                    status_code=400,
                    detail="Only JPEG, PNG, and WebP images are allowed."
                )

            image.verify()

    except HTTPException:
        raise

    except (UnidentifiedImageError, OSError, SyntaxError):
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid image."
        )

    # ----------------------------------
    # Upload validated image to Cloudinary
    # ----------------------------------

    try:
        result = cloudinary.uploader.upload(
            contents,
            resource_type="image",
            folder=f"farmland-marketplace/profiles/{current_user}"
        )

        profile_image_url = result["secure_url"]

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to upload profile photo."
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

    verification_flags = get_verification_flags(
        db=db,
        user_id=user.id,
        role=user.role,
    )

    return {
        "message": "Profile updated successfully",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "mobile": user.mobile,
            "role": user.role,
            **verification_flags,
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
# STEP 58 - ACCOUNT DEACTIVATION
# =========================================================

class DeactivateAccountRequest(BaseModel):
    current_password: str


@router.post("/deactivate")
def deactivate_account(
    data: DeactivateAccountRequest,
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

    # Admin accounts are protected from self-deactivation so that
    # the marketplace cannot accidentally lose its administrator.
    if user.role == "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin accounts cannot be deactivated from this page."
        )

    if not verify_password(data.current_password, user.password):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )

    account_status = (
        db.query(UserAccountStatus)
        .filter(UserAccountStatus.user_id == current_user)
        .first()
    )

    if account_status and account_status.status == "deactivated":
        raise HTTPException(
            status_code=400,
            detail="Account is already deactivated."
        )

    now = datetime.utcnow()

    if account_status is None:
        account_status = UserAccountStatus(
            user_id=current_user,
            status="deactivated",
            deactivated_at=now,
            reactivated_at=None,
        )
        db.add(account_status)
    else:
        account_status.status = "deactivated"
        account_status.deactivated_at = now
        account_status.reactivated_at = None

    # Stop normal marketplace exposure while preserving all land,
    # offer, reservation, sale, transaction and audit history.
    # Reserved/Sold listings are intentionally left untouched.
    for land in user.lands:
        availability_status = (
            land.availability.status
            if land.availability is not None
            else "available"
        )

        if availability_status not in ("reserved", "sold"):
            land.is_published = False

    create_activity_log(
        db=db,
        user_id=current_user,
        action="ACCOUNT_DEACTIVATED",
        description="User voluntarily deactivated their account.",
        target_type="USER",
        target_id=current_user
    )

    db.commit()

    return {
        "message": "Account deactivated successfully"
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


@router.get("/{user_id}/block-status")
def get_block_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    if user_id == current_user:
        return {
            "user_id": user_id,
            "blocked": False,
            "blocked_by_me": False,
            "blocked_by_other": False
        }

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

    blocked_by_me = (
        db.query(UserBlock)
        .filter(
            UserBlock.blocker_id == current_user,
            UserBlock.blocked_id == user_id
        )
        .first()
        is not None
    )

    blocked_by_other = (
        db.query(UserBlock)
        .filter(
            UserBlock.blocker_id == user_id,
            UserBlock.blocked_id == current_user
        )
        .first()
        is not None
    )

    return {
        "user_id": user_id,
        "blocked": blocked_by_me or blocked_by_other,
        "blocked_by_me": blocked_by_me,
        "blocked_by_other": blocked_by_other
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
        .limit(100)
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
