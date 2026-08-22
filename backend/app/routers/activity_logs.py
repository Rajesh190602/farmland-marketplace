from fastapi import (
    APIRouter,
    Depends,
    Query,
    HTTPException
)

from fastapi.responses import StreamingResponse

from sqlalchemy.orm import Session

from app import models
from app.auth import get_current_admin
from app.database import get_db

from datetime import datetime, timezone
from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Font, Alignment


router = APIRouter(
    prefix="/admin/activity-logs",
    tags=["Activity Logs"]
)


# =========================================================
# GET ACTIVE ACTIVITY LOGS
# =========================================================

@router.get("/")
def get_activity_logs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    action: str = Query(default=""),
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    query = (
        db.query(models.ActivityLog)
        .filter(
            models.ActivityLog.is_archived == False
        )
    )

    if action:
        query = query.filter(
            models.ActivityLog.action == action
        )

    total = query.count()

    logs = (
        query
        .order_by(
            models.ActivityLog.id.desc()
        )
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    result = []

    for log in logs:

        user = None

        if log.user_id:
            user = (
                db.query(models.User)
                .filter(
                    models.User.id == log.user_id
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
        "total": total,
        "page": page,
        "limit": limit,
        "logs": result,
    }


# =========================================================
# EXPORT ACTIVITY LOGS TO EXCEL
# =========================================================

@router.get("/export")
def export_activity_logs(
    from_date: str = Query(default=""),
    to_date: str = Query(default=""),
    action: str = Query(default=""),
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):

    # =====================================================
    # BUILD QUERY
    # =====================================================

    query = (
        db.query(models.ActivityLog)
        .filter(
            models.ActivityLog.is_archived == False
        )
    )

    # =====================================================
    # DATE FILTER
    # =====================================================

    try:

        if from_date:
            start_date = datetime.strptime(
                from_date,
                "%Y-%m-%d"
            )

            query = query.filter(
                models.ActivityLog.created_at
                >= start_date
            )

        if to_date:
            end_date = datetime.strptime(
                to_date,
                "%Y-%m-%d"
            )

            # Include complete end date
            end_date = end_date.replace(
                hour=23,
                minute=59,
                second=59,
                microsecond=999999
            )

            query = query.filter(
                models.ActivityLog.created_at
                <= end_date
            )

    except ValueError:

        raise HTTPException(
            status_code=400,
            detail="Date must be in YYYY-MM-DD format"
        )

    # =====================================================
    # ACTION FILTER
    # =====================================================

    if action:
        query = query.filter(
            models.ActivityLog.action == action
        )

    # =====================================================
    # GET LOGS
    # =====================================================

    logs = (
        query
        .order_by(
            models.ActivityLog.created_at.asc()
        )
        .all()
    )

    if not logs:
        raise HTTPException(
            status_code=404,
            detail="No active activity logs found for the selected filters."
        )

    # =====================================================
    # CREATE EXCEL
    # =====================================================

    try:

        workbook = Workbook()

        worksheet = workbook.active

        worksheet.title = "Activity Logs"

        headers = [
            "Log ID",
            "User ID",
            "User Name",
            "User Email",
            "Action",
            "Description",
            "Target Type",
            "Target ID",
            "Created At",
        ]

        worksheet.append(headers)

        # Header formatting
        for cell in worksheet[1]:

            cell.font = Font(
                bold=True
            )

            cell.alignment = Alignment(
                horizontal="center"
            )

        # =================================================
        # ADD LOG DATA
        # =================================================

        for log in logs:

            user = None

            if log.user_id:
                user = (
                    db.query(models.User)
                    .filter(
                        models.User.id ==
                        log.user_id
                    )
                    .first()
                )

            # ---------------------------------------------
            # IMPORTANT:
            # Excel does not support timezone-aware
            # datetime values.
            # ---------------------------------------------

            created_at = log.created_at

            if (
                created_at is not None
                and created_at.tzinfo is not None
            ):
                created_at = created_at.replace(
                    tzinfo=None
                )

            worksheet.append([
                log.id,

                log.user_id,

                (
                    user.full_name
                    if user
                    else "System"
                ),

                (
                    user.email
                    if user
                    else ""
                ),

                log.action,

                log.description,

                log.target_type,

                log.target_id,

                created_at,
            ])

        # =================================================
        # COLUMN WIDTHS
        # =================================================

        column_widths = {
            "A": 10,
            "B": 10,
            "C": 25,
            "D": 35,
            "E": 25,
            "F": 60,
            "G": 20,
            "H": 12,
            "I": 25,
        }

        for column, width in column_widths.items():

            worksheet.column_dimensions[
                column
            ].width = width

        # Freeze header
        worksheet.freeze_panes = "A2"

        # =================================================
        # SAVE EXCEL TO MEMORY
        # =================================================

        excel_file = BytesIO()

        workbook.save(
            excel_file
        )

        excel_file.seek(0)

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Excel generation failed: {str(e)}"
        )

    # =====================================================
    # ARCHIVE EXPORTED LOGS
    # =====================================================

    try:

        archive_time = datetime.now(
            timezone.utc
        )

        for log in logs:

            log.is_archived = True

            log.archived_at = archive_time

        db.commit()

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Database archive failed: {str(e)}"
        )

    # =====================================================
    # FILE NAME
    # =====================================================

    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S"
    )

    filename = (
        f"activity_logs_{timestamp}.xlsx"
    )

    # =====================================================
    # RETURN EXCEL
    # =====================================================

    return StreamingResponse(
        excel_file,
        media_type=(
            "application/vnd.openxmlformats-"
            "officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition":
                f'attachment; filename="{filename}"'
        }
    )