from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from openpyxl import Workbook

from app.database import get_db
from app.auth import get_current_admin
from app.models import User

router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)


@router.get("/users")
def export_users(
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    wb = Workbook()
    ws = wb.active
    ws.title = "Users"

    ws.append([
        "ID",
        "Full Name",
        "Email",
        "Mobile",
        "Role"
    ])

    users = db.query(User).all()

    for user in users:
        ws.append([
            user.id,
            user.full_name,
            user.email,
            user.mobile,
            user.role
        ])

    filename = "users_report.xlsx"

    wb.save(filename)

    return FileResponse(
        filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=filename,
    )