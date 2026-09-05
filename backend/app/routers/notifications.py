from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Notification
from app.auth import get_current_user


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


# =========================================================
# GET MY NOTIFICATIONS
# =========================================================

@router.get("/")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    """
    Return only notifications belonging to the authenticated user.

    Newest notifications are returned first.
    """
    notifications = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user
        )
        .order_by(
            Notification.created_at.desc(),
            Notification.id.desc()
        )
        .all()
    )

    return notifications


# =========================================================
# GET UNREAD NOTIFICATION COUNT
# =========================================================

@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    """
    Return the unread notification count for the authenticated user.
    """
    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user,
            Notification.is_read == False
        )
        .count()
    )

    return {
        "unread_count": count
    }


# =========================================================
# MARK ALL NOTIFICATIONS AS READ
# =========================================================

@router.put("/read-all")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    """
    Mark every unread notification belonging to the authenticated
    user as read.

    No notification belonging to another user can be modified.
    """
    updated_count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user,
            Notification.is_read == False
        )
        .update(
            {
                Notification.is_read: True
            },
            synchronize_session=False
        )
    )

    db.commit()

    return {
        "message": "All notifications marked as read",
        "updated_count": updated_count
    }


# =========================================================
# MARK SINGLE NOTIFICATION AS READ
# =========================================================

@router.put("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    """
    Mark one notification as read.

    The notification must belong to the authenticated user.
    """
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    notification.is_read = True

    db.commit()
    db.refresh(notification)

    return {
        "message": "Notification marked as read",
        "notification_id": notification.id
    }


# =========================================================
# DELETE NOTIFICATION
# =========================================================

@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user)
):
    """
    Delete one notification.

    The notification must belong to the authenticated user.
    """
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    db.delete(notification)
    db.commit()

    return {
        "message": "Notification deleted successfully",
        "notification_id": notification_id
    }
