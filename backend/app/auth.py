from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserAccountStatus, UserKYCVerification, AdminReauthChallenge
from app.admin_permissions import (
    ADMIN_PERMISSION_ROLES,
    normalize_admin_permission,
    normalize_requested_permission,
)
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Header, status
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
        # STEP 77D-1 - Admin session invalidation
        #
        # Admin JWTs carry the server-side session version.
        # If the version changes in the database, previously
        # issued admin tokens become invalid immediately.
        # --------------------------------------------------
        if str(user.role or "").strip().lower() == "admin":
            token_session_version = payload.get("admin_session_version")

            try:
                token_session_version = int(token_session_version)
            except (TypeError, ValueError):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Admin session is no longer valid.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            if token_session_version != (
                getattr(user, "admin_session_version", 0) or 0
            ):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Admin session is no longer valid. Please log in again.",
                    headers={"WWW-Authenticate": "Bearer"},
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

# =========================================================
# STEP 77D-3 - ADMIN SENSITIVE-ACTION RE-AUTHENTICATION
# =========================================================

def require_super_admin_reauth(
    current_user: int = Depends(get_current_user),
    reauth_token: Optional[str] = Header(
        default=None,
        alias="X-Admin-Reauth-Token",
    ),
    db: Session = Depends(get_db),
):
    """
    Require the current user to be a Super Admin and present a valid,
    one-time sensitive-action re-authentication token.

    The raw re-auth token is never stored in the database. Only its
    SHA-256 hash is stored. The token is bound to the administrator's
    current admin_session_version and can be consumed only once.
    """

    user = _get_admin_user(current_user, db)

    if normalize_admin_permission(
        getattr(user, "admin_permission_role", None)
    ) != "SUPER_ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Super Admin access required.",
        )

    if not reauth_token or not reauth_token.strip():
        raise HTTPException(
            status_code=401,
            detail="Sensitive action requires administrator re-authentication.",
        )

    token_hash = __import__("hashlib").sha256(
        reauth_token.strip().encode("utf-8")
    ).hexdigest()

    challenge = (
        db.query(AdminReauthChallenge)
        .filter(AdminReauthChallenge.token_hash == token_hash)
        .first()
    )

    if not challenge:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired re-authentication token.",
        )

    now = datetime.now(timezone.utc)

    # PostgreSQL returns timezone-aware values for this column, but
    # normalize defensively in case an existing record is naive.
    expires_at = challenge.expires_at
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if challenge.consumed_at is not None:
        raise HTTPException(
            status_code=401,
            detail="Re-authentication token has already been used.",
        )

    if expires_at is None or expires_at <= now:
        challenge.consumed_at = now
        db.commit()
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired re-authentication token.",
        )

    current_session_version = (
        getattr(user, "admin_session_version", 0) or 0
    )

    if challenge.user_id != user.id:
        raise HTTPException(
            status_code=401,
            detail="Invalid re-authentication token.",
        )

    if challenge.admin_session_version != current_session_version:
        challenge.consumed_at = now
        db.commit()
        raise HTTPException(
            status_code=401,
            detail="Re-authentication token is no longer valid. Please re-authenticate.",
        )

    # Atomically consume the token so it cannot be reused by a second
    # request after this dependency succeeds.
    updated = (
        db.query(AdminReauthChallenge)
        .filter(
            AdminReauthChallenge.id == challenge.id,
            AdminReauthChallenge.consumed_at.is_(None),
        )
        .update(
            {AdminReauthChallenge.consumed_at: now},
            synchronize_session=False,
        )
    )

    if updated != 1:
        db.rollback()
        raise HTTPException(
            status_code=401,
            detail="Re-authentication token has already been used.",
        )

    # Commit the one-time consumption before the sensitive action runs.
    # This intentionally means a failed sensitive action requires a new
    # re-authentication rather than allowing token replay.
    db.commit()

    return user.id

