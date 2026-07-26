from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.database import get_db
from app.models import User, Land

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


@router.get("/dashboard")
def admin_dashboard(
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    total_users = db.query(User).count()
    total_lands = db.query(Land).count()

    total_farmers = (
        db.query(User)
        .filter(User.role == "farmer")
        .count()
    )

    total_buyers = (
        db.query(User)
        .filter(User.role == "buyer")
        .count()
    )

    total_admins = (
        db.query(User)
        .filter(User.role == "admin")
        .count()
    )

    return {
        "total_users": total_users,
        "total_lands": total_lands,
        "total_farmers": total_farmers,
        "total_buyers": total_buyers,
        "total_admins": total_admins
    }
