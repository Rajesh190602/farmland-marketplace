from fastapi import APIRouter, Depends,HTTPException,Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, String
from app.auth import get_current_admin
from app.database import get_db
from app.models import (
    User,
    LandAvailability,
    LandInquiry,
    LandInquiry,
    LandOffer,
    SiteVisit,
    Land,
    Notification,
    LandImage,
    Conversation,
    ActivityLog,
    Message,
    Favorite,
    LandReport,
    UserReport,
    SavedSearch,
)
from app.schemas import LandUpdate,UserUpdate,LandReview
from app.utils.activity_log import create_activity_log
from sqlalchemy import func,extract
from datetime import datetime, timedelta
from io import BytesIO
from openpyxl import Workbook
router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)



# =========================================================
# PHASE 2 - ADMIN REPORTS
# =========================================================

@router.get("/reports")
def get_admin_reports(
    status: str = Query(default=""),
    report_type: str = Query(default=""),
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    """Return land and user reports for the admin Reports page."""

    allowed_statuses = {"", "pending", "resolved", "dismissed"}
    allowed_types = {"", "land", "user"}

    status = status.strip().lower()
    report_type = report_type.strip().lower()

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid report status. Use pending, resolved, or dismissed.",
        )

    if report_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Invalid report type. Use land or user.",
        )

    result = []

    if report_type in {"", "land"}:
        query = db.query(LandReport)
        if status:
            query = query.filter(LandReport.status == status)

        for report in query.order_by(LandReport.id.desc()).all():
            land = db.query(Land).filter(Land.id == report.land_id).first()
            reporter = db.query(User).filter(User.id == report.reporter_id).first()
            owner = (
                db.query(User).filter(User.id == land.owner_id).first()
                if land else None
            )

            result.append({
                "id": report.id,
                "report_type": "land",
                "land_id": report.land_id,
                "land_title": land.title if land else "Land no longer available",
                "reported_user_id": land.owner_id if land else None,
                "reported_user_name": owner.full_name if owner else "Unknown",
                "reporter_id": report.reporter_id,
                "reporter_name": reporter.full_name if reporter else "Unknown",
                "reporter_email": reporter.email if reporter else "",
                "reason": report.reason,
                "description": report.description,
                "status": report.status,
                "created_at": report.created_at,
                "updated_at": report.updated_at,
            })

    if report_type in {"", "user"}:
        query = db.query(UserReport)
        if status:
            query = query.filter(UserReport.status == status)

        for report in query.order_by(UserReport.id.desc()).all():
            reporter = db.query(User).filter(User.id == report.reporter_id).first()
            reported_user = (
                db.query(User)
                .filter(User.id == report.reported_user_id)
                .first()
            )

            result.append({
                "id": report.id,
                "report_type": "user",
                "land_id": None,
                "land_title": None,
                "reported_user_id": report.reported_user_id,
                "reported_user_name": (
                    reported_user.full_name
                    if reported_user
                    else "User no longer available"
                ),
                "reported_user_email": (
                    reported_user.email if reported_user else ""
                ),
                "reporter_id": report.reporter_id,
                "reporter_name": reporter.full_name if reporter else "Unknown",
                "reporter_email": reporter.email if reporter else "",
                "reason": report.reason,
                "description": report.description,
                "status": report.status,
                "created_at": report.created_at,
                "updated_at": report.updated_at,
            })

    result.sort(
        key=lambda item: item["created_at"] or "",
        reverse=True,
    )

    return {
        "total": len(result),
        "pending": sum(1 for item in result if item["status"] == "pending"),
        "resolved": sum(1 for item in result if item["status"] == "resolved"),
        "dismissed": sum(1 for item in result if item["status"] == "dismissed"),
        "reports": result,
    }


@router.get("/reports/lands")
def get_admin_land_reports(
    status: str = Query(default=""),
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    """Return land reports for the admin Reports page."""

    allowed_statuses = {"", "pending", "resolved", "dismissed"}
    status = status.strip().lower()

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid report status. Use pending, resolved, or dismissed.",
        )

    query = db.query(LandReport)
    if status:
        query = query.filter(LandReport.status == status)

    result = []

    for report in query.order_by(LandReport.id.desc()).all():
        land = db.query(Land).filter(Land.id == report.land_id).first()
        reporter = db.query(User).filter(User.id == report.reporter_id).first()
        owner = (
            db.query(User).filter(User.id == land.owner_id).first()
            if land else None
        )

        result.append({
            "id": report.id,
            "report_type": "land",
            "land_id": report.land_id,
            "land_title": land.title if land else "Land no longer available",
            "reported_user_id": land.owner_id if land else None,
            "reported_user_name": owner.full_name if owner else "Unknown",
            "reporter_id": report.reporter_id,
            "reporter_name": reporter.full_name if reporter else "Unknown",
            "reporter_email": reporter.email if reporter else "",
            "reason": report.reason,
            "description": report.description,
            "status": report.status,
            "created_at": report.created_at,
            "updated_at": report.updated_at,
        })

    return {"total": len(result), "reports": result}


@router.get("/reports/users")
def get_admin_user_reports(
    status: str = Query(default=""),
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    """Return user reports for the admin Reports page."""

    allowed_statuses = {"", "pending", "resolved", "dismissed"}
    status = status.strip().lower()

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid report status. Use pending, resolved, or dismissed.",
        )

    query = db.query(UserReport)
    if status:
        query = query.filter(UserReport.status == status)

    result = []

    for report in query.order_by(UserReport.id.desc()).all():
        reporter = db.query(User).filter(User.id == report.reporter_id).first()
        reported_user = (
            db.query(User)
            .filter(User.id == report.reported_user_id)
            .first()
        )

        result.append({
            "id": report.id,
            "report_type": "user",
            "reported_user_id": report.reported_user_id,
            "reported_user_name": (
                reported_user.full_name
                if reported_user
                else "User no longer available"
            ),
            "reported_user_email": (
                reported_user.email if reported_user else ""
            ),
            "reporter_id": report.reporter_id,
            "reporter_name": reporter.full_name if reporter else "Unknown",
            "reporter_email": reporter.email if reporter else "",
            "reason": report.reason,
            "description": report.description,
            "status": report.status,
            "created_at": report.created_at,
            "updated_at": report.updated_at,
        })

    return {"total": len(result), "reports": result}


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
@router.get("/analytics")
def admin_analytics(
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    total_chats = db.query(Conversation).count()

    return {
        "total_users": db.query(User).count(),

        "farmers": db.query(User)
        .filter(User.role == "farmer")
        .count(),

        "buyers": db.query(User)
        .filter(User.role == "buyer")
        .count(),

        "admins": db.query(User)
        .filter(User.role == "admin")
        .count(),

        "total_lands": db.query(Land).count(),

        "pending": db.query(Land)
        .filter(Land.status == "pending")
        .count(),

        "approved": db.query(Land)
        .filter(Land.status == "approved")
        .count(),

        "rejected": db.query(Land)
        .filter(Land.status == "rejected")
        .count(),

        "changes_requested": db.query(Land)
        .filter(
            Land.status == "changes_requested"
        )
        .count(),

        "total_chats": total_chats,
    }
# =========================================================
# Admin Recent Activity
# =========================================================

@router.get("/recent-activity")
def get_recent_activity(
    limit: int = Query(
        default=10,
        ge=1,
        le=50
    ),
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    logs = (
        db.query(ActivityLog)
        .filter(
            ActivityLog.is_archived == False
        )
        .order_by(
            ActivityLog.id.desc()
        )
        .limit(limit)
        .all()
    )

    result = []

    for log in logs:

        user = None

        if log.user_id:
            user = (
                db.query(User)
                .filter(
                    User.id == log.user_id
                )
                .first()
            )

        result.append({
            "id": log.id,

            "user_id": log.user_id,

            "user_name": (
                user.full_name
                if user
                else "System"
            ),

            "user_email": (
                user.email
                if user
                else ""
            ),

            "action": log.action,

            "description": log.description,

            "target_type": log.target_type,

            "target_id": log.target_id,

            "created_at": log.created_at,
        })

    return {
        "total": len(result),
        "activities": result,
    }
# =========================================================
# PHASE 5 - AUDIT / ACTIVITY LOG VIEWER
# =========================================================

@router.get("/activity-logs")
def get_activity_logs(
    search: str = Query(default=""),
    action: str = Query(default=""),
    role: str = Query(default=""),
    status: str = Query(default="active"),
    from_date: str = Query(default=""),
    to_date: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    """Return activity logs for the admin Audit / Activity Log viewer."""
    status = status.strip().lower()
    role = role.strip().lower()
    action = action.strip()
    search = search.strip()

    if status not in {"active", "archived", "all"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid activity log status. Use active, archived, or all.",
        )

    if role and role not in {"admin", "farmer", "buyer"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid user role. Use admin, farmer, or buyer.",
        )

    query = db.query(ActivityLog, User).outerjoin(
        User, User.id == ActivityLog.user_id
    )

    if status == "active":
        query = query.filter(ActivityLog.is_archived == False)
    elif status == "archived":
        query = query.filter(ActivityLog.is_archived == True)

    if action:
        query = query.filter(ActivityLog.action == action)

    if role:
        query = query.filter(User.role == role)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_pattern),
                User.email.ilike(search_pattern),
                ActivityLog.description.ilike(search_pattern),
                ActivityLog.target_type.ilike(search_pattern),
                func.cast(ActivityLog.target_id, String).ilike(search_pattern),
                ActivityLog.action.ilike(search_pattern),
            )
        )

    if from_date:
        try:
            start_date = datetime.strptime(from_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid from_date. Use YYYY-MM-DD.")
        query = query.filter(ActivityLog.created_at >= start_date)

    if to_date:
        try:
            end_date = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid to_date. Use YYYY-MM-DD.")
        query = query.filter(ActivityLog.created_at < end_date)

    total = query.count()
    rows = (
        query.order_by(ActivityLog.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    logs = []
    for log, user in rows:
        logs.append({
            "id": log.id,
            "user_id": log.user_id,
            "user_name": user.full_name if user else "System",
            "user_email": user.email if user else "",
            "user_role": user.role if user else "system",
            "action": log.action,
            "description": log.description,
            "target_type": log.target_type,
            "target_id": log.target_id,
            "created_at": log.created_at,
            "is_archived": log.is_archived,
            "archived_at": log.archived_at,
        })

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "logs": logs,
    }


@router.get("/activity-logs/export")
def export_activity_logs(
    from_date: str = Query(...),
    to_date: str = Query(...),
    action: str = Query(default=""),
    search: str = Query(default=""),
    role: str = Query(default=""),
    status: str = Query(default="active"),
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    """Export matching activity logs to Excel and archive the exported active logs."""
    status = status.strip().lower()
    role = role.strip().lower()
    action = action.strip()
    search = search.strip()

    if status not in {"active", "archived", "all"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid activity log status. Use active, archived, or all.",
        )

    if role and role not in {"admin", "farmer", "buyer"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid user role. Use admin, farmer, or buyer.",
        )

    try:
        start_date = datetime.strptime(from_date, "%Y-%m-%d")
        end_date = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must use YYYY-MM-DD format.")

    if start_date >= end_date:
        raise HTTPException(status_code=400, detail="From Date cannot be later than To Date.")

    query = db.query(ActivityLog, User).outerjoin(
        User, User.id == ActivityLog.user_id
    ).filter(
        ActivityLog.created_at >= start_date,
        ActivityLog.created_at < end_date,
    )

    if status == "active":
        query = query.filter(ActivityLog.is_archived == False)
    elif status == "archived":
        query = query.filter(ActivityLog.is_archived == True)

    if action:
        query = query.filter(ActivityLog.action == action)

    if role:
        query = query.filter(User.role == role)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_pattern),
                User.email.ilike(search_pattern),
                ActivityLog.description.ilike(search_pattern),
                ActivityLog.target_type.ilike(search_pattern),
                func.cast(ActivityLog.target_id, String).ilike(search_pattern),
                ActivityLog.action.ilike(search_pattern),
            )
        )

    rows = query.order_by(ActivityLog.id.desc()).all()

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Activity Logs"
    sheet.append([
        "ID", "User ID", "User Name", "User Email", "Role", "Action",
        "Description", "Target Type", "Target ID", "Created At",
        "Archived", "Archived At"
    ])

    for log, user in rows:
        sheet.append([
            log.id,
            log.user_id,
            user.full_name if user else "System",
            user.email if user else "",
            user.role if user else "system",
            log.action,
            log.description or "",
            log.target_type or "",
            log.target_id,
            log.created_at,
            "Yes" if log.is_archived else "No",
            log.archived_at,
        ])

    for column_cells in sheet.columns:
        max_length = max(len(str(cell.value or "")) for cell in column_cells)
        sheet.column_dimensions[column_cells[0].column_letter].width = min(max(max_length + 2, 12), 45)

    # Preserve the existing export workflow: only active logs included in an active export
    # are archived. Archived/all exports are read-only and do not mutate existing archives.
    if status == "active":
        exported_at = datetime.utcnow()
        for log, _user in rows:
            log.is_archived = True
            log.archived_at = exported_at
        db.commit()

    output = BytesIO()
    workbook.save(output)
    output.seek(0)

    filename = f"activity_logs_{from_date}_to_{to_date}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/users")
def get_all_users(
    search: str = Query(default=""),
    role: str = Query(default=""),
    status: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    query = db.query(User)

    if search:
        query = query.filter(
            (User.full_name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%")) |
            (User.mobile.ilike(f"%{search}%"))
        )

    if role:
        query = query.filter(User.role == role)

    if status:
        status = status.strip().lower()
        if status == "active":
            query = query.filter(User.is_suspended == False)
        elif status == "suspended":
            query = query.filter(User.is_suspended == True)
        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid user status. Use active or suspended."
            )

    total = query.count()

    users = (
        query
        .order_by(User.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "users": [
            {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "mobile": user.mobile,
                "role": user.role,
                "is_suspended": user.is_suspended,
            }
            for user in users
        ],
    }
# ==========================
# Get User Details
# ==========================

@router.get("/users/{user_id}")
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    total_lands = (
        db.query(Land)
        .filter(Land.owner_id == user.id)
        .count()
    )

    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "mobile": user.mobile,
        "role": user.role,
        "total_lands": total_lands
    }
@router.get("/lands")
def get_all_lands(
    search: str = Query(default=""),
    status: str = Query(default=""),
    district: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    query = db.query(Land)

    if search:
        query = query.filter(
            (Land.title.ilike(f"%{search}%")) |
            (Land.village.ilike(f"%{search}%")) |
            (Land.mandal.ilike(f"%{search}%")) |
            (Land.district.ilike(f"%{search}%")) |
            (Land.survey_number.ilike(f"%{search}%"))
        )

    if status:
        query = query.filter(Land.status == status)

    if district:
        query = query.filter(
            Land.district.ilike(f"%{district}%")
        )

    total = query.count()

    lands = (
        query
        .order_by(Land.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    result = []

    for land in lands:

        owner = (
            db.query(User)
            .filter(User.id == land.owner_id)
            .first()
        )

        result.append({
            "id": land.id,
            "title": land.title,
            "description": land.description,
            "price": land.price,
            "area": land.area,
            "village": land.village,
            "mandal": land.mandal,
            "district": land.district,
            "state": land.state,
            "pincode": land.pincode,
            "survey_number": land.survey_number,
            "soil_type": land.soil_type,
            "water_source": land.water_source,
            "crop_type": land.crop_type,
            "latitude": land.latitude,
            "longitude": land.longitude,
            "status": land.status,
            "is_published": land.is_published,
            "rejection_reason": land.rejection_reason,

            # Existing single image
            "image_url": land.image_url,

            # New multiple-image gallery
            "images": [
                {
                    "id": image.id,
                    "image_url": image.image_url
                }
                for image in land.images
            ],

            "owner_id": land.owner_id,
            "owner_name": owner.full_name if owner else "Unknown",
            "owner_email": owner.email if owner else "",
            "owner_mobile": owner.mobile if owner else "",
        })

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "lands": result,
    }



@router.get("/lands/pending")
def get_pending_lands(
    search: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    query = (
        db.query(Land)
        .filter(Land.status == "pending")
    )

    # Search pending lands
    if search:
        query = query.filter(
            (Land.title.ilike(f"%{search}%")) |
            (Land.village.ilike(f"%{search}%")) |
            (Land.mandal.ilike(f"%{search}%")) |
            (Land.district.ilike(f"%{search}%")) |
            (Land.survey_number.ilike(f"%{search}%"))
        )

    # Total matching pending lands
    total = query.count()

    # Pagination
    lands = (
        query
        .order_by(Land.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    result = []

    for land in lands:

        owner = (
            db.query(User)
            .filter(User.id == land.owner_id)
            .first()
        )

        result.append({
            "id": land.id,
            "title": land.title,
            "description": land.description,
            "price": land.price,
            "area": land.area,
            "village": land.village,
            "mandal": land.mandal,
            "district": land.district,
            "state": land.state,
            "pincode": land.pincode,
            "survey_number": land.survey_number,
            "soil_type": land.soil_type,
            "water_source": land.water_source,
            "crop_type": land.crop_type,
            "latitude": land.latitude,
            "longitude": land.longitude,
            "status": land.status,
            "image_url": land.image_url,
            "owner_id": land.owner_id,
            "owner_name": owner.full_name if owner else "",
            "owner_email": owner.email if owner else "",
            "owner_mobile": owner.mobile if owner else "",
        })

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "lands": result,
    }
# ==========================
# Approve Land
# ==========================

@router.put("/lands/{land_id}/approve")
def approve_land(
    land_id: int,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    land = (
        db.query(Land)
        .filter(Land.id == land_id)
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    land.status = "approved"
    land.rejection_reason = None

    # Notify land owner
    notification = Notification(
        user_id=land.owner_id,
        title="Land Approved",
        message=(
            f'Your land "{land.title}" has been approved '
            "and is now visible to buyers."
        )
    )

    db.add(notification)

    # Activity log
    create_activity_log(
        db=db,
        user_id=admin,
        action="APPROVE_LAND",
        description=f'Approved land "{land.title}"',
        target_type="LAND",
        target_id=land.id,
    )

    # Save land update, notification and activity log together
    db.commit()
    db.refresh(land)

    return {
        "message": "Land approved successfully",
        "status": land.status
    }
# ==========================
# Request Changes
# ==========================

@router.put("/lands/{land_id}/request-changes")
def request_changes(
    land_id: int,
    review: LandReview,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    land = (
        db.query(Land)
        .filter(Land.id == land_id)
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    land.status = "changes_requested"
    land.rejection_reason = review.reason

    # Notify land owner
    notification = Notification(
        user_id=land.owner_id,
        title="Changes Requested",
        message=(
            f'Changes have been requested for your land '
            f'"{land.title}". Reason: {review.reason}'
        )
    )

    db.add(notification)

    # Activity log
    create_activity_log(
        db=db,
        user_id=admin,
        action="REQUEST_CHANGES",
        description=(
            f'Requested changes for land "{land.title}". '
            f"Reason: {review.reason}"
        ),
        target_type="LAND",
        target_id=land.id,
    )

    # Save land update, notification and activity log together
    db.commit()
    db.refresh(land)

    return {
        "message": "Changes requested successfully",
        "status": land.status,
        "reason": land.rejection_reason
    }
# ==========================
# Reject Land
# ==========================

@router.put("/lands/{land_id}/reject")
def reject_land(
    land_id: int,
    review: LandReview,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    land = (
        db.query(Land)
        .filter(Land.id == land_id)
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    land.status = "rejected"
    land.rejection_reason = review.reason

    # Notify land owner
    notification = Notification(
        user_id=land.owner_id,
        title="Land Rejected",
        message=(
            f'Your land "{land.title}" has been rejected. '
            f"Reason: {review.reason}"
        )
    )

    db.add(notification)

    # Activity log
    create_activity_log(
        db=db,
        user_id=admin,
        action="REJECT_LAND",
        description=(
            f'Rejected land "{land.title}". '
            f"Reason: {review.reason}"
        ),
        target_type="LAND",
        target_id=land.id,
    )

    # Save land update, notification and activity log together
    db.commit()
    db.refresh(land)

    return {
        "message": "Land rejected successfully",
        "status": land.status,
        "reason": land.rejection_reason
    }
# ==========================
# Publish Land
# ==========================

@router.put("/lands/{land_id}/publish")
def publish_land(
    land_id: int,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    land = (
        db.query(Land)
        .filter(Land.id == land_id)
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    # Only approved lands can be published
    if land.status != "approved":
        raise HTTPException(
            status_code=400,
            detail="Only approved lands can be published."
        )

    # Prevent duplicate publishing
    if land.is_published:
        return {
            "message": "Land is already published.",
            "land_id": land.id,
            "is_published": land.is_published
        }

    # ---------------------------------------------------------
    # Publish the land
    # ---------------------------------------------------------

    land.is_published = True

    # ---------------------------------------------------------
    # Existing activity log
    # ---------------------------------------------------------

    create_activity_log(
        db=db,
        user_id=admin,
        action="PUBLISH_LAND",
        description=f'Published land "{land.title}"',
        target_type="LAND",
        target_id=land.id,
    )

    # ---------------------------------------------------------
    # Notify buyers whose saved searches match this land
    # ---------------------------------------------------------

    saved_searches = (
        db.query(SavedSearch)
        .filter(
            SavedSearch.user_id != land.owner_id
        )
        .all()
    )

    notified_users = set()

    for saved_search in saved_searches:

        # District
        if (
            saved_search.district
            and (
                not land.district
                or saved_search.district.strip().lower()
                not in land.district.strip().lower()
            )
        ):
            continue

        # Village
        if (
            saved_search.village
            and (
                not land.village
                or saved_search.village.strip().lower()
                not in land.village.strip().lower()
            )
        ):
            continue

        # Mandal
        if (
            saved_search.mandal
            and (
                not land.mandal
                or saved_search.mandal.strip().lower()
                not in land.mandal.strip().lower()
            )
        ):
            continue

        # Crop type
        if (
            saved_search.crop_type
            and (
                not land.crop_type
                or saved_search.crop_type.strip().lower()
                not in land.crop_type.strip().lower()
            )
        ):
            continue

        # Soil type
        if (
            saved_search.soil_type
            and (
                not land.soil_type
                or saved_search.soil_type.strip().lower()
                not in land.soil_type.strip().lower()
            )
        ):
            continue

        # Water source
        if (
            saved_search.water_source
            and (
                not land.water_source
                or saved_search.water_source.strip().lower()
                not in land.water_source.strip().lower()
            )
        ):
            continue

        # Minimum price
        if (
            saved_search.min_price is not None
            and (
                land.price is None
                or land.price < saved_search.min_price
            )
        ):
            continue

        # Maximum price
        if (
            saved_search.max_price is not None
            and (
                land.price is None
                or land.price > saved_search.max_price
            )
        ):
            continue

        # Minimum area
        if (
            saved_search.min_area is not None
            and (
                land.area is None
                or land.area < saved_search.min_area
            )
        ):
            continue

        # Maximum area
        if (
            saved_search.max_area is not None
            and (
                land.area is None
                or land.area > saved_search.max_area
            )
        ):
            continue

        # -----------------------------------------------------
        # Avoid sending multiple notifications to the same
        # buyer when they have multiple matching saved searches.
        # -----------------------------------------------------

        if saved_search.user_id in notified_users:
            continue

        notification = Notification(
            user_id=saved_search.user_id,
            title="New Land Matches Your Saved Search",
            message=(
                f'A new land "{land.title}" matches one of '
                f'your saved searches.'
            ),
            target_type="LAND",
            target_id=land.id,
            is_read=False,
        )

        db.add(notification)

        notified_users.add(saved_search.user_id)

    # ---------------------------------------------------------
    # Save everything together
    # ---------------------------------------------------------

    db.commit()
    db.refresh(land)

    return {
        "message": "Land published successfully.",
        "land_id": land.id,
        "is_published": land.is_published,
        "matched_buyers_notified": len(notified_users),
    }


@router.put("/lands/{land_id}/unpublish")
def unpublish_land(
    land_id: int,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    land = (
        db.query(Land)
        .filter(Land.id == land_id)
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    land.is_published = False

    create_activity_log(
        db=db,
        user_id=admin,
        action="UNPUBLISH_LAND",
        description=f'Unpublished land "{land.title}"',
        target_type="LAND",
        target_id=land.id,
    )

    db.commit()
    db.refresh(land)

    return {
        "message": "Land unpublished successfully.",
        "land_id": land.id,
        "is_published": land.is_published
    }


# ==========================
# Admin Delete Land
# ==========================

@router.delete("/lands/{land_id}")
def delete_land_admin(
    land_id: int,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    land = (
        db.query(Land)
        .filter(Land.id == land_id)
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    land_title = land.title

    # =====================================================
    # FIND CONVERSATIONS BELONGING TO THIS LAND
    # =====================================================

    conversations = (
        db.query(Conversation)
        .filter(Conversation.land_id == land_id)
        .all()
    )

    conversation_ids = [
        conversation.id
        for conversation in conversations
    ]

    # =====================================================
    # DELETE MESSAGES FIRST
    # =====================================================

    if conversation_ids:
        db.query(Message).filter(
            Message.conversation_id.in_(conversation_ids)
        ).delete(
            synchronize_session=False
        )

    # =====================================================
    # DELETE CONVERSATIONS
    # =====================================================

    if conversation_ids:
        db.query(Conversation).filter(
            Conversation.id.in_(conversation_ids)
        ).delete(
            synchronize_session=False
        )

    # =====================================================
    # DELETE LAND IMAGES
    # =====================================================

    db.query(LandImage).filter(
        LandImage.land_id == land_id
    ).delete(
        synchronize_session=False
    )

    # =====================================================
    # DELETE FAVORITES
    # =====================================================

    db.query(Favorite).filter(
        Favorite.land_id == land_id
    ).delete(
        synchronize_session=False
    )

    # =====================================================
    # ACTIVITY LOG
    # =====================================================

    create_activity_log(
        db=db,
        user_id=admin,
        action="ADMIN_DELETE_LAND",
        description=f'Admin deleted land "{land_title}"',
        target_type="LAND",
        target_id=land_id,
    )

    # =====================================================
    # DELETE LAND
    # =====================================================

    db.delete(land)

    db.commit()

    return {
        "message": "Land deleted successfully"
    }

# ==========================
# Admin Update Land
# ==========================

@router.put("/lands/{land_id}")
def update_land_admin(
    land_id: int,
    updated_land: LandUpdate,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    land = (
        db.query(Land)
        .filter(Land.id == land_id)
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    updates = updated_land.model_dump(exclude_unset=True)

    for key, value in updates.items():
        setattr(land, key, value)

    create_activity_log(
        db=db,
        user_id=admin,
        action="ADMIN_UPDATE_LAND",
        description=f'Admin updated land "{land.title}"',
        target_type="LAND",
        target_id=land.id,
    )

    db.commit()
    db.refresh(land)

    return {
        "message": "Land updated successfully",
        "land": {
            "id": land.id,
            "title": land.title,
            "price": land.price,
            "village": land.village
        }
    }
@router.get("/lands/{land_id}")
def get_land_by_id(
    land_id: int,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    land = (
        db.query(Land)
        .filter(Land.id == land_id)
        .first()
    )

    if not land:
        raise HTTPException(
            status_code=404,
            detail="Land not found"
        )

    owner = (
        db.query(User)
        .filter(User.id == land.owner_id)
        .first()
    )

    return {
        "id": land.id,
        "title": land.title,
        "description": land.description,
        "price": land.price,
        "area": land.area,
        "village": land.village,
        "mandal": land.mandal,
        "district": land.district,
        "state": land.state,
        "pincode": land.pincode,
        "survey_number": land.survey_number,
        "soil_type": land.soil_type,
        "water_source": land.water_source,
        "crop_type": land.crop_type,
        "latitude": land.latitude,
        "longitude": land.longitude,
        "status": land.status,
        "is_published": land.is_published,
        "rejection_reason": land.rejection_reason,

        "image_url": land.image_url,

        "images": [
            {
                "id": image.id,
                "image_url": image.image_url
            }
            for image in land.images
        ],

        "owner_id": land.owner_id,
        "owner_name": owner.full_name if owner else "Unknown",
        "owner_email": owner.email if owner else "",
        "owner_mobile": owner.mobile if owner else "",
    }
# ==========================
# Admin Update User
# ==========================
# =========================================================
# Admin Update User
# =========================================================

@router.put("/users/{user_id}")
def update_user_admin(
    user_id: int,
    updated_user: UserUpdate,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    # -----------------------------------------------------
    # Find target user
    # -----------------------------------------------------

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # -----------------------------------------------------
    # Prevent admin from modifying their own role
    # -----------------------------------------------------

    if user.id == admin:
        requested_role = (
            updated_user.role.lower()
            if updated_user.role
            else user.role
        )

        if requested_role != user.role:
            raise HTTPException(
                status_code=400,
                detail="You cannot change your own admin role"
            )

    # -----------------------------------------------------
    # Validate role
    # -----------------------------------------------------

    if updated_user.role:
        requested_role = (
            updated_user.role
            .strip()
            .lower()
        )

        if requested_role not in [
            "admin",
            "farmer",
            "buyer"
        ]:
            raise HTTPException(
                status_code=400,
                detail="Invalid user role"
            )

        updated_user.role = requested_role

    # -----------------------------------------------------
    # Save old values for activity log
    # -----------------------------------------------------

    old_full_name = user.full_name
    old_email = user.email
    old_mobile = user.mobile
    old_role = user.role

    # -----------------------------------------------------
    # Apply updates
    # -----------------------------------------------------

    updates = updated_user.model_dump(
        exclude_unset=True
    )

    for key, value in updates.items():
        setattr(user, key, value)

    # -----------------------------------------------------
    # Determine what changed
    # -----------------------------------------------------

    changes = []

    if old_full_name != user.full_name:
        changes.append("full name")

    if old_email != user.email:
        changes.append("email")

    if old_mobile != user.mobile:
        changes.append("mobile number")

    if old_role != user.role:
        changes.append(
            f"role ({old_role} → {user.role})"
        )

    # -----------------------------------------------------
    # Activity log
    # -----------------------------------------------------

    if changes:
        description = (
            f'Updated user "{user.full_name}": '
            + ", ".join(changes)
            + "."
        )
    else:
        description = (
            f'Updated user "{user.full_name}".'
        )

    create_activity_log(
        db=db,
        user_id=admin,
        action="UPDATE_USER",
        description=description,
        target_type="USER",
        target_id=user.id
    )

    # -----------------------------------------------------
    # Commit
    # -----------------------------------------------------

    db.commit()
    db.refresh(user)

    return {
        "message": "User updated successfully",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "mobile": user.mobile,
            "role": user.role
        }
    }

# ==========================
# Admin Delete User
# ==========================
# =========================================================
# Delete User
# =========================================================
# =========================================================
# DELETE USER
# =========================================================

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    try:
        # -------------------------------------------------
        # Find target user
        # -------------------------------------------------

        user = (
            db.query(User)
            .filter(User.id == user_id)
            .first()
        )

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        # -------------------------------------------------
        # Prevent deleting yourself
        # -------------------------------------------------

        if user.id == admin:
            raise HTTPException(
                status_code=400,
                detail="You cannot delete your own admin account"
            )

        # -------------------------------------------------
        # Prevent deleting another admin
        # -------------------------------------------------

        if user.role == "admin":
            raise HTTPException(
                status_code=403,
                detail="Admin accounts cannot be deleted"
            )

        # -------------------------------------------------
        # Save information before deletion
        # -------------------------------------------------

        deleted_user_name = user.full_name
        deleted_user_email = user.email
        deleted_user_role = user.role

        # -------------------------------------------------
        # Find user's lands
        # -------------------------------------------------

        user_lands = (
            db.query(Land)
            .filter(
                Land.owner_id == user.id
            )
            .all()
        )

        land_ids = [
            land.id
            for land in user_lands
        ]

        # -------------------------------------------------
        # Find conversations involving this user
        #
        # Also include conversations belonging to
        # the user's lands.
        # -------------------------------------------------

        conversation_query = (
            db.query(Conversation)
            .filter(
                or_(
                    Conversation.buyer_id == user.id,
                    Conversation.farmer_id == user.id,
                    Conversation.land_id.in_(land_ids)
                    if land_ids
                    else False
                )
            )
        )

        conversations = conversation_query.all()

        conversation_ids = [
            conversation.id
            for conversation in conversations
        ]

        # -------------------------------------------------
        # Delete messages belonging to conversations
        # -------------------------------------------------

        if conversation_ids:
            db.query(Message).filter(
                Message.conversation_id.in_(
                    conversation_ids
                )
            ).delete(
                synchronize_session=False
            )

        # -------------------------------------------------
        # Delete conversations
        # -------------------------------------------------

        if conversation_ids:
            db.query(Conversation).filter(
                Conversation.id.in_(
                    conversation_ids
                )
            ).delete(
                synchronize_session=False
            )

        # -------------------------------------------------
        # Delete land images
        # -------------------------------------------------

        if land_ids:
            db.query(LandImage).filter(
                LandImage.land_id.in_(land_ids)
            ).delete(
                synchronize_session=False
            )

        # -------------------------------------------------
        # Delete favorites
        #
        # 1. Favorites created by this user
        # 2. Favorites on lands owned by this user
        # -------------------------------------------------

        db.query(Favorite).filter(
            Favorite.user_id == user.id
        ).delete(
            synchronize_session=False
        )

        if land_ids:
            db.query(Favorite).filter(
                Favorite.land_id.in_(land_ids)
            ).delete(
                synchronize_session=False
            )

        # -------------------------------------------------
        # Delete notifications belonging to user
        # -------------------------------------------------

        db.query(Notification).filter(
            Notification.user_id == user.id
        ).delete(
            synchronize_session=False
        )

        # -------------------------------------------------
        # Delete activity logs belonging to user
        #
        # Important:
        # We should NOT create the DELETE_USER activity log
        # with user_id=user.id because the user itself is
        # about to be deleted.
        # -------------------------------------------------

        db.query(ActivityLog).filter(
            ActivityLog.user_id == user.id
        ).delete(
            synchronize_session=False
        )

        # -------------------------------------------------
        # Create deletion activity log
        # -------------------------------------------------

        activity_log = ActivityLog(
            user_id=admin,
            action="DELETE_USER",
            description=(
                f'Deleted user "{deleted_user_name}" '
                f'({deleted_user_email}) '
                f'with role "{deleted_user_role}".'
            ),
            target_type="USER",
            target_id=user.id
        )

        db.add(activity_log)

        # -------------------------------------------------
        # Delete user's lands
        # -------------------------------------------------

        if land_ids:
            db.query(Land).filter(
                Land.id.in_(land_ids)
            ).delete(
                synchronize_session=False
            )

        # -------------------------------------------------
        # Finally delete the user
        # -------------------------------------------------

        db.delete(user)

        # -------------------------------------------------
        # Commit everything as one transaction
        # -------------------------------------------------

        db.commit()

        return {
            "message": "User deleted successfully",
            "user_id": user_id
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()

        print(
            "DELETE USER ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to delete user. All changes were rolled back."
        )

@router.get("/district-analytics")
def district_analytics(
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    results = (
        db.query(
            Land.district,
            func.count(Land.id).label("count")
        )
        .filter(Land.status == "approved")
        .group_by(Land.district)
        .order_by(func.count(Land.id).desc())
        .all()
    )

    return [
        {
            "district": district,
            "count": count
        }
        for district, count in results
    ]
@router.get("/monthly-growth")
def monthly_growth(
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin)
):
    results = (
        db.query(
            extract("year", User.created_at).label("year"),
            extract("month", User.created_at).label("month"),
            func.count(User.id).label("users")
        )
        .group_by(
            extract("year", User.created_at),
            extract("month", User.created_at)
        )
        .order_by(
            extract("year", User.created_at),
            extract("month", User.created_at)
        )
        .all()
    )

    months = [
        "",
        "Jan", "Feb", "Mar", "Apr",
        "May", "Jun", "Jul", "Aug",
        "Sep", "Oct", "Nov", "Dec"
    ]

    return [
        {
            "month": f"{months[int(month)]} {int(year)}",
            "users": users
        }
        for year, month, users in results
        if year is not None and month is not None
    ]
# =========================================================
# PHASE 2 #11 - RESOLVE / DISMISS REPORT
# =========================================================

@router.put("/reports/{report_type}/{report_id}")
def update_report_status(
    report_type: str,
    report_id: int,
    status: str = Query(...),
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    """
    Admin can resolve or dismiss a marketplace report.

    report_type:
        land
        user

    status:
        resolved
        dismissed
    """

    report_type = report_type.strip().lower()
    status = status.strip().lower()

    # -----------------------------------------------------
    # Validate report type
    # -----------------------------------------------------

    if report_type not in {"land", "user"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid report type. Use land or user.",
        )

    # -----------------------------------------------------
    # Validate status
    # -----------------------------------------------------

    if status not in {"resolved", "dismissed"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid status. Use resolved or dismissed.",
        )

    # =====================================================
    # LAND REPORT
    # =====================================================

    if report_type == "land":

        report = (
            db.query(LandReport)
            .filter(
                LandReport.id == report_id
            )
            .first()
        )

        if not report:
            raise HTTPException(
                status_code=404,
                detail="Land report not found.",
            )

        # Do not process an already processed report.
        if report.status != "pending":
            raise HTTPException(
                status_code=400,
                detail=(
                    f"This report has already been "
                    f"{report.status}."
                ),
            )

        old_status = report.status

        report.status = status

        # -------------------------------------------------
        # Activity log
        # -------------------------------------------------

        create_activity_log(
            db=db,
            user_id=admin,
            action=(
                "RESOLVE_LAND_REPORT"
                if status == "resolved"
                else "DISMISS_LAND_REPORT"
            ),
            description=(
                f"Admin {status} land report "
                f"#{report.id} for land "
                f"#{report.land_id}."
            ),
            target_type="LAND_REPORT",
            target_id=report.id,
        )

        db.commit()
        db.refresh(report)

        return {
            "message": (
                "Land report resolved successfully."
                if status == "resolved"
                else "Land report dismissed successfully."
            ),
            "report_type": "land",
            "report_id": report.id,
            "old_status": old_status,
            "status": report.status,
        }

    # =====================================================
    # USER REPORT
    # =====================================================

    report = (
        db.query(UserReport)
        .filter(
            UserReport.id == report_id
        )
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=404,
            detail="User report not found.",
        )

    # Do not process an already processed report.
    if report.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=(
                f"This report has already been "
                f"{report.status}."
            ),
        )

    old_status = report.status

    report.status = status

    # -----------------------------------------------------
    # Activity log
    # -----------------------------------------------------

    create_activity_log(
        db=db,
        user_id=admin,
        action=(
            "RESOLVE_USER_REPORT"
            if status == "resolved"
            else "DISMISS_USER_REPORT"
        ),
        description=(
            f"Admin {status} user report "
            f"#{report.id} for user "
            f"#{report.reported_user_id}."
        ),
        target_type="USER_REPORT",
        target_id=report.id,
    )

    db.commit()
    db.refresh(report)

    return {
        "message": (
            "User report resolved successfully."
            if status == "resolved"
            else "User report dismissed successfully."
        ),
        "report_type": "user",
        "report_id": report.id,
        "old_status": old_status,
        "status": report.status,
    }
# =========================================================
# PHASE 2 #12 - SUSPEND / RESTORE USER
# =========================================================

@router.put("/users/{user_id}/suspend")
def suspend_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    """
    Suspend a user account.

    Only admins can perform this action.
    An admin cannot suspend their own account.
    Admin accounts cannot be suspended.
    """

    # -----------------------------------------------------
    # Find target user
    # -----------------------------------------------------

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    # -----------------------------------------------------
    # Prevent admin from suspending themselves
    # -----------------------------------------------------

    if user.id == admin:
        raise HTTPException(
            status_code=400,
            detail="You cannot suspend your own admin account."
        )

    # -----------------------------------------------------
    # Prevent suspension of another admin
    # -----------------------------------------------------

    if user.role == "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin accounts cannot be suspended."
        )

    # -----------------------------------------------------
    # Already suspended
    # -----------------------------------------------------

    if user.is_suspended:
        return {
            "message": "User is already suspended.",
            "user_id": user.id,
            "is_suspended": True,
        }

    # -----------------------------------------------------
    # Suspend user
    # -----------------------------------------------------

    user.is_suspended = True

    # -----------------------------------------------------
    # Activity log
    # -----------------------------------------------------

    create_activity_log(
        db=db,
        user_id=admin,
        action="SUSPEND_USER",
        description=(
            f'Suspended user "{user.full_name}" '
            f'({user.email}).'
        ),
        target_type="USER",
        target_id=user.id,
    )

    # -----------------------------------------------------
    # Save
    # -----------------------------------------------------

    db.commit()
    db.refresh(user)

    return {
        "message": "User suspended successfully.",
        "user_id": user.id,
        "is_suspended": user.is_suspended,
    }


# =========================================================
# RESTORE USER
# =========================================================

@router.put("/users/{user_id}/restore")
def restore_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    """
    Restore a suspended user account.

    Only admins can perform this action.
    """

    # -----------------------------------------------------
    # Find target user
    # -----------------------------------------------------

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    # -----------------------------------------------------
    # Already active
    # -----------------------------------------------------

    if not user.is_suspended:
        return {
            "message": "User is already active.",
            "user_id": user.id,
            "is_suspended": False,
        }

    # -----------------------------------------------------
    # Restore user
    # -----------------------------------------------------

    user.is_suspended = False

    # -----------------------------------------------------
    # Activity log
    # -----------------------------------------------------

    create_activity_log(
        db=db,
        user_id=admin,
        action="RESTORE_USER",
        description=(
            f'Restored user "{user.full_name}" '
            f'({user.email}).'
        ),
        target_type="USER",
        target_id=user.id,
    )

    # -----------------------------------------------------
    # Save
    # -----------------------------------------------------

    db.commit()
    db.refresh(user)

    return {
        "message": "User restored successfully.",
        "user_id": user.id,
        "is_suspended": user.is_suspended,
    }
# =========================================================
# PHASE 5 - MARKETPLACE STATISTICS
# #32 Listing Availability Statistics
# #33 Inquiry Statistics
# #34 Offer Statistics
# #35 Site Visit Statistics
# =========================================================

# =========================================================
# ADMIN - MARKETPLACE RECORDS
# =========================================================

@router.get("/marketplace-records")
def marketplace_records(
    category: str = Query(default=""),
    status: str = Query(default=""),
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    """
    Return marketplace records for the Admin Dashboard statistic cards.

    Supported categories:
    - listing
    - inquiry
    - offer
    - site_visit

    Status is optional. When omitted, all records in the selected
    category are returned.
    """
    category = category.strip().lower()
    status = status.strip().lower()

    allowed_categories = {"listing", "inquiry", "offer", "site_visit"}
    if category not in allowed_categories:
        raise HTTPException(
            status_code=400,
            detail="Invalid marketplace category.",
        )

    result = []

    if category == "listing":
        allowed_statuses = {"", "available", "reserved", "sold"}
        if status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail="Invalid listing status. Use available, reserved, or sold.",
            )

        query = (
            db.query(Land, LandAvailability)
            .join(
                LandAvailability,
                LandAvailability.land_id == Land.id,
            )
        )
        if status:
            query = query.filter(LandAvailability.status == status)

        rows = query.order_by(LandAvailability.updated_at.desc(), Land.id.desc()).all()

        for land, availability in rows:
            owner = (
                db.query(User)
                .filter(User.id == land.owner_id)
                .first()
            )
            result.append({
                "id": land.id,
                "land_id": land.id,
                "land_title": land.title,
                "location": ", ".join(
                    part for part in [land.village, land.mandal, land.district] if part
                ),
                "owner_name": owner.full_name if owner else "Unknown",
                "owner_mobile": owner.mobile if owner else "",
                "land_status": land.status,
                "status": availability.status,
                "updated_at": availability.updated_at,
            })

    elif category == "inquiry":
        allowed_statuses = {"", "pending", "accepted", "rejected"}
        if status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail="Invalid inquiry status. Use pending, accepted, or rejected.",
            )

        query = db.query(LandInquiry)
        if status:
            query = query.filter(LandInquiry.status == status)

        rows = query.order_by(LandInquiry.created_at.desc()).all()

        for inquiry in rows:
            land = db.query(Land).filter(Land.id == inquiry.land_id).first()
            buyer = db.query(User).filter(User.id == inquiry.buyer_id).first()
            owner = (
                db.query(User).filter(User.id == land.owner_id).first()
                if land else None
            )
            result.append({
                "id": inquiry.id,
                "land_id": inquiry.land_id,
                "land_title": land.title if land else "Land no longer available",
                "buyer_name": buyer.full_name if buyer else "Unknown",
                "buyer_mobile": buyer.mobile if buyer else "",
                "owner_name": owner.full_name if owner else "Unknown",
                "status": inquiry.status,
                "message": inquiry.message,
                "created_at": inquiry.created_at,
            })

    elif category == "offer":
        allowed_statuses = {"", "pending", "accepted", "rejected"}
        if status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail="Invalid offer status. Use pending, accepted, or rejected.",
            )

        query = db.query(LandOffer)
        if status:
            query = query.filter(LandOffer.status == status)

        rows = query.order_by(LandOffer.created_at.desc()).all()

        for offer in rows:
            land = db.query(Land).filter(Land.id == offer.land_id).first()
            buyer = db.query(User).filter(User.id == offer.buyer_id).first()
            owner = (
                db.query(User).filter(User.id == land.owner_id).first()
                if land else None
            )
            result.append({
                "id": offer.id,
                "land_id": offer.land_id,
                "land_title": land.title if land else "Land no longer available",
                "buyer_name": buyer.full_name if buyer else "Unknown",
                "buyer_mobile": buyer.mobile if buyer else "",
                "owner_name": owner.full_name if owner else "Unknown",
                "amount": offer.amount,
                "status": offer.status,
                "message": offer.message,
                "created_at": offer.created_at,
            })

    else:  # site_visit
        allowed_statuses = {
            "",
            "pending",
            "accepted",
            "rejected",
            "completed",
            "cancelled",
        }
        if status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid site visit status. Use pending, accepted, rejected, "
                    "completed, or cancelled."
                ),
            )

        query = db.query(SiteVisit)
        if status:
            query = query.filter(SiteVisit.status == status)

        rows = query.order_by(SiteVisit.requested_date.asc(), SiteVisit.id.desc()).all()

        for visit in rows:
            land = db.query(Land).filter(Land.id == visit.land_id).first()
            buyer = db.query(User).filter(User.id == visit.buyer_id).first()
            owner = (
                db.query(User).filter(User.id == land.owner_id).first()
                if land else None
            )
            result.append({
                "id": visit.id,
                "land_id": visit.land_id,
                "land_title": land.title if land else "Land no longer available",
                "buyer_name": buyer.full_name if buyer else "Unknown",
                "buyer_mobile": buyer.mobile if buyer else "",
                "owner_name": owner.full_name if owner else "Unknown",
                "requested_date": visit.requested_date,
                "status": visit.status,
                "message": visit.message,
                "created_at": visit.created_at,
            })

    return {
        "category": category,
        "status": status,
        "total": len(result),
        "records": result,
    }


@router.get("/marketplace-statistics")
def marketplace_statistics(
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    """
    Return marketplace statistics for the Admin Dashboard.

    Includes:
    - Land availability
    - Inquiry status
    - Offer status
    - Site visit status
    """

    # -----------------------------------------------------
    # LAND AVAILABILITY
    # -----------------------------------------------------

    available_lands = (
        db.query(Land)
        .join(
            LandAvailability,
            LandAvailability.land_id == Land.id,
        )
        .filter(LandAvailability.status == "available")
        .count()
    )

    reserved_lands = (
        db.query(Land)
        .join(
            LandAvailability,
            LandAvailability.land_id == Land.id,
        )
        .filter(LandAvailability.status == "reserved")
        .count()
    )

    sold_lands = (
        db.query(Land)
        .join(
            LandAvailability,
            LandAvailability.land_id == Land.id,
        )
        .filter(LandAvailability.status == "sold")
        .count()
    )

    # -----------------------------------------------------
    # INQUIRIES
    # -----------------------------------------------------

    total_inquiries = db.query(LandInquiry).count()

    pending_inquiries = (
        db.query(LandInquiry)
        .filter(LandInquiry.status == "pending")
        .count()
    )

    accepted_inquiries = (
        db.query(LandInquiry)
        .filter(LandInquiry.status == "accepted")
        .count()
    )

    rejected_inquiries = (
        db.query(LandInquiry)
        .filter(LandInquiry.status == "rejected")
        .count()
    )

    # -----------------------------------------------------
    # OFFERS
    # -----------------------------------------------------

    total_offers = db.query(LandOffer).count()

    pending_offers = (
        db.query(LandOffer)
        .filter(LandOffer.status == "pending")
        .count()
    )

    accepted_offers = (
        db.query(LandOffer)
        .filter(LandOffer.status == "accepted")
        .count()
    )

    rejected_offers = (
        db.query(LandOffer)
        .filter(LandOffer.status == "rejected")
        .count()
    )

    # -----------------------------------------------------
    # SITE VISITS
    # -----------------------------------------------------

    total_site_visits = db.query(SiteVisit).count()

    pending_site_visits = (
        db.query(SiteVisit)
        .filter(SiteVisit.status == "pending")
        .count()
    )

    accepted_site_visits = (
        db.query(SiteVisit)
        .filter(SiteVisit.status == "accepted")
        .count()
    )

    rejected_site_visits = (
        db.query(SiteVisit)
        .filter(SiteVisit.status == "rejected")
        .count()
    )

    completed_site_visits = (
        db.query(SiteVisit)
        .filter(SiteVisit.status == "completed")
        .count()
    )

    cancelled_site_visits = (
        db.query(SiteVisit)
        .filter(SiteVisit.status == "cancelled")
        .count()
    )

    return {
        "listing_availability": {
            "available": available_lands,
            "reserved": reserved_lands,
            "sold": sold_lands,
        },
        "inquiries": {
            "total": total_inquiries,
            "pending": pending_inquiries,
            "accepted": accepted_inquiries,
            "rejected": rejected_inquiries,
        },
        "offers": {
            "total": total_offers,
            "pending": pending_offers,
            "accepted": accepted_offers,
            "rejected": rejected_offers,
        },
        "site_visits": {
            "total": total_site_visits,
            "pending": pending_site_visits,
            "accepted": accepted_site_visits,
            "rejected": rejected_site_visits,
            "completed": completed_site_visits,
            "cancelled": cancelled_site_visits,
        },
    }