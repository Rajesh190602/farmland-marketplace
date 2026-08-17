from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import models
from app.auth import get_current_admin
from app.database import get_db


router = APIRouter(
    prefix="/admin/activity-logs",
    tags=["Activity Logs"]
)


@router.get("/")
def get_activity_logs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    action: str = Query(default=""),
    db: Session = Depends(get_db),
    admin: int = Depends(get_current_admin),
):
    query = db.query(models.ActivityLog)

    # Filter by action if provided
    if action:
        query = query.filter(
            models.ActivityLog.action == action
        )

    # Total number of matching logs
    total = query.count()

    # Pagination
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