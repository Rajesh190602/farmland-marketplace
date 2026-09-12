from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserAccountStatus, UserKYCVerification
from app.admin_permissions import (
    ADMIN_PERMISSION_ROLES,
    normalize_admin_permission,
    normalize_requested_permission,
)
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from jose import JWTError, jwt
from passlib.context import CryptContext

import os
from dotenv import load_dotenv

load_dotenv()


# ==========================
# Configuration
# ==========================

SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY is not configured in the environment."
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


# ==========================
# Password Hashing
# ==========================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/users/login"
)


# ==========================
# Password Functions
# ==========================

def hash_password(password: str):
    return pwd_context.hash(password)


def get_password_hash(password: str):
    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str
):
    return pwd_context.verify(
        plain_password,
        hashed_password
    )


# ==========================
# JWT Token
# ==========================

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
):
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update(
        {"exp": expire}
    )

    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return encoded_jwt


# ==========================
# Current Logged-in User
# ==========================

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={
            "WWW-Authenticate": "Bearer"
        },
    )

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        user_id = payload.get("user_id")

        if user_id is None:
            raise credentials_exception

        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            raise credentials_exception

        # --------------------------------------------------
        # KYC-only tokens cannot access normal marketplace APIs.
        # --------------------------------------------------
        if payload.get("scope") == "kyc":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This session is restricted to KYC verification.",
            )

        # --------------------------------------------------
        # Check the user in the database.
        # This also makes admin suspension effective for
        # already-issued JWTs.
        # --------------------------------------------------

        user = (
            db.query(User)
            .filter(User.id == user_id)
            .first()
        )

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account not found.",
                headers={
                    "WWW-Authenticate": "Bearer"
                },
            )

        # --------------------------------------------------
        # Administrator suspension check
        # --------------------------------------------------

        if user.is_suspended:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Your account has been suspended. "
                    "Please contact the administrator."
                ),
            )

        # --------------------------------------------------
        # Step 58 - Voluntary account deactivation check
        # Existing users without a status row are treated as
        # active for backward compatibility.
        # --------------------------------------------------

        account_status = (
            db.query(UserAccountStatus)
            .filter(UserAccountStatus.user_id == user_id)
            .first()
        )

        if account_status and account_status.status == "deactivated":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Your account has been deactivated. "
                    "Please contact support if you want to reactivate it."
                ),
            )

        return user_id

    except HTTPException:
        raise

    except JWTError:
        raise credentials_exception


# ==========================
# KYC Verification Session
# ==========================

def get_current_kyc_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """
    Validate a KYC-capable session.

    - Normal application tokens may access KYC for active farmers/buyers.
    - A restricted `scope=kyc` token is accepted for a buyer while KYC is
      pending.
    - Once the buyer's KYC record is admin-verified, the same restricted
      token receives a machine-readable KYC_APPROVED response so the
      frontend can exchange it for a normal marketplace token.
    - A restricted KYC token is NEVER accepted by normal marketplace APIs.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate KYC credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        scope = payload.get("scope")

        user_id = payload.get("user_id")
        if user_id is None:
            raise credentials_exception

        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            raise credentials_exception

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise credentials_exception

        if user.role not in {"farmer", "buyer"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="KYC verification is available only for farmers and buyers.",
            )

        if user.is_suspended:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been suspended. Please contact the administrator.",
            )

        account_status = (
            db.query(UserAccountStatus)
            .filter(UserAccountStatus.user_id == user_id)
            .first()
        )

        # --------------------------------------------------
        # Restricted buyer KYC session
        # --------------------------------------------------
        if scope == "kyc":
            if user.role != "buyer":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This KYC session is no longer valid.",
                )

            # IMPORTANT:
            # Check the KYC record FIRST. The temporary token may still be
            # valid after admin approval even if the account-status row was
            # not updated correctly. Approval is the authoritative signal
            # for the handoff endpoint; deactivated accounts remain blocked.
            kyc_verification = (
                db.query(UserKYCVerification)
                .filter(UserKYCVerification.user_id == user_id)
                .first()
            )

            if kyc_verification and kyc_verification.status == "verified":
                if account_status and account_status.status == "deactivated":
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Your account has been deactivated.",
                    )

                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "code": "KYC_APPROVED",
                        "message": (
                            "Your KYC has been approved. "
                            "Your marketplace session can now be activated."
                        ),
                        "account_status": "active",
                    },
                )

            # Before approval, the temporary token is valid only while the
            # buyer remains in the pending_kyc state.
            if not account_status or account_status.status != "pending_kyc":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This KYC session is no longer valid.",
                )

            return user_id

        # --------------------------------------------------
        # Normal application token
        # --------------------------------------------------
        if account_status and account_status.status == "deactivated":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated.",
            )

        return user_id

    except HTTPException:
        raise
    except JWTError:
        raise credentials_exception


# ==========================
# Step 75 - Advanced Admin Permissions
# ==========================

def _get_admin_user(current_user: int, db: Session) -> User:
    user = db.query(User).filter(User.id == current_user).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if str(user.role or "").strip().lower() != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return user


def get_current_admin(
    current_user: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = _get_admin_user(current_user, db)

    # General admin guard now fails closed when no permission is configured.
    if normalize_admin_permission(
        getattr(user, "admin_permission_role", None)
    ) == "NONE":
        raise HTTPException(
            status_code=403,
            detail="Admin permission is not configured."
        )

    return user.id


def require_admin_permission(permission: str):
    """Return a FastAPI dependency enforcing one admin permission.

    SUPER_ADMIN is an explicit full-access role. Permission is read from
    the database on every request; it is never trusted from the client/JWT.
    """
    normalized = normalize_requested_permission(permission)

    def dependency(
        current_user: int = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        user = _get_admin_user(current_user, db)

        assigned = normalize_admin_permission(
            getattr(user, "admin_permission_role", None)
        )

        if assigned == "SUPER_ADMIN" or assigned == normalized:
            return user.id

        raise HTTPException(
            status_code=403,
            detail="Insufficient admin permission for this action."
        )

    return dependency


def require_super_admin(
    current_user: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_admin_user(current_user, db)

    if normalize_admin_permission(
        getattr(user, "admin_permission_role", None)
    ) != "SUPER_ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Super Admin access required."
        )

    return user.id
