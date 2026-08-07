from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from openpyxl import Workbook

from app.database import get_db
from app.auth import get_current_admin
from app.models import User,Land

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
@router.get("/lands")
def export_lands(
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    wb = Workbook()
    ws = wb.active
    ws.title = "Lands"

    ws.append([
        "ID",
        "Title",
        "Owner ID",
        "Village",
        "District",
        "State",
        "Area",
        "Price",
        "Soil Type",
        "Status"
    ])

    lands = db.query(Land).all()

    for land in lands:
        ws.append([
            land.id,
            land.title,
            land.owner_id,
            land.village,
            land.district,
            land.state,
            land.area,
            land.price,
            land.soil_type,
            land.status
        ])

    filename = "lands_report.xlsx"

    wb.save(filename)

    return FileResponse(
        filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=filename,
    )
@router.get("/pending-lands")
def export_pending_lands(
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    wb = Workbook()
    ws = wb.active
    ws.title = "Pending Lands"

    ws.append([
        "ID",
        "Title",
        "Owner ID",
        "Village",
        "District",
        "State",
        "Area",
        "Price",
        "Soil Type",
        "Status"
    ])

    lands = (
        db.query(Land)
        .filter(Land.status == "pending")
        .all()
    )

    for land in lands:
        ws.append([
            land.id,
            land.title,
            land.owner_id,
            land.village,
            land.district,
            land.state,
            land.area,
            land.price,
            land.soil_type,
            land.status
        ])

    filename = "pending_lands_report.xlsx"

    wb.save(filename)

    return FileResponse(
        filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=filename,
    )
@router.get("/approved-lands")
def export_approved_lands(
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    wb = Workbook()
    ws = wb.active
    ws.title = "Approved Lands"

    ws.append([
        "ID",
        "Title",
        "Owner ID",
        "Village",
        "District",
        "State",
        "Area",
        "Price",
        "Soil Type",
        "Status"
    ])

    lands = (
        db.query(Land)
        .filter(Land.status == "approved")
        .all()
    )

    for land in lands:
        ws.append([
            land.id,
            land.title,
            land.owner_id,
            land.village,
            land.district,
            land.state,
            land.area,
            land.price,
            land.soil_type,
            land.status
        ])

    filename = "approved_lands_report.xlsx"

    wb.save(filename)

    return FileResponse(
        filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=filename,
    )