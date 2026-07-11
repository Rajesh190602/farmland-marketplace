from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Land
from app.auth import get_current_user

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

@router.get("/")
def dashboard(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):

    total_users = db.query(User).count()

    total_lands = db.query(Land).count()

    my_lands = db.query(Land).filter(
        Land.owner_id == current_user
    ).count()

    return {
        "total_users": total_users,
        "total_lands": total_lands,
        "my_lands": my_lands
    }