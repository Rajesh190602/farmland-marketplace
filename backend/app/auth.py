from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserAccountStatus
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
        # Check the user in the database.
        # This also makes administrator suspension effective
        # for already-issued JWTs.
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
            .filter(
                UserAccountStatus.user_id == user_id
            )
            .first()
        )

        if (
            account_status
            and account_status.status == "deactivated"
        ):
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
# Current Admin
# ==========================

def get_current_admin(
    current_user: int = Depends(get_current_user),
    db: Session = Depends(get_db)
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

    if user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return user.id
