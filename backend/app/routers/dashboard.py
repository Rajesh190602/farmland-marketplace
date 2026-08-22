from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import (
    User,
    Land,
    Favorite,
    Conversation,
    Notification,
    ActivityLog,
)
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

    # =====================================================
    # DASHBOARD STATISTICS
    # =====================================================

    total_users = db.query(User).count()

    total_lands = db.query(Land).count()

    my_lands = (
        db.query(Land)
        .filter(
            Land.owner_id == current_user
        )
        .count()
    )

    favorites = (
        db.query(Favorite)
        .filter(
            Favorite.user_id == current_user
        )
        .count()
    )

    chats = (
        db.query(Conversation)
        .filter(
            or_(
                Conversation.buyer_id == current_user,
                Conversation.farmer_id == current_user
            )
        )
        .count()
    )

    notifications = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user
        )
        .count()
    )

    # =====================================================
    # RECENT ACTIVITY
    # =====================================================

    recent_logs = (
        db.query(ActivityLog)
        .filter(
            ActivityLog.user_id == current_user
        )
        .order_by(
            ActivityLog.created_at.desc()
        )
        .limit(10)
        .all()
    )

    recent_activity = []

    for log in recent_logs:

        recent_activity.append({
            "id": log.id,
            "action": log.action,
            "description": log.description,
            "target_type": log.target_type,
            "target_id": log.target_id,
            "created_at": log.created_at,
        })

    # =====================================================
    # RESPONSE
    # =====================================================

    return {
        "total_users": total_users,
        "total_lands": total_lands,
        "my_lands": my_lands,
        "favorites": favorites,
        "chats": chats,
        "notifications": notifications,
        "recent_activity": recent_activity,
    }