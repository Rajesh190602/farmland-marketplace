from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Notification,
    UserNotificationPreference,
    NotificationPushSubscription,
)
from app.auth import get_current_user
from app.schemas import (
    NotificationPreferencesResponse,
    NotificationPreferencesUpdate,
    PushSubscriptionCreate,
)

# Importing this module registers the SQLAlchemy after-commit
# notification delivery hooks.
from app.utils import notification_delivery  # noqa: F401
from app.utils.push import VAPID_PUBLIC_KEY


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


# =========================================================
# GET NOTIFICATIONS
# =========================================================

@router.get("/")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user)
        .order_by(
            Notification.created_at.desc(),
            Notification.id.desc(),
        )
        .all()
    )

    return notifications


# =========================================================
# UNREAD COUNT
# =========================================================

@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user,
            Notification.is_read == False,
        )
        .count()
    )

    return {
        "unread_count": count
    }


# =========================================================
# NOTIFICATION PREFERENCES
# =========================================================

@router.get(
    "/preferences",
    response_model=NotificationPreferencesResponse,
)
def get_notification_preferences(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    preference = (
        db.query(UserNotificationPreference)
        .filter(
            UserNotificationPreference.user_id == current_user
        )
        .first()
    )

    if not preference:
        return NotificationPreferencesResponse(
            email_enabled=True,
            push_enabled=True,
        )

    return NotificationPreferencesResponse(
        email_enabled=preference.email_enabled,
        push_enabled=preference.push_enabled,
    )


@router.put(
    "/preferences",
    response_model=NotificationPreferencesResponse,
)
def update_notification_preferences(
    payload: NotificationPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    preference = (
        db.query(UserNotificationPreference)
        .filter(
            UserNotificationPreference.user_id == current_user
        )
        .first()
    )

    if not preference:
        preference = UserNotificationPreference(
            user_id=current_user,
            email_enabled=(
                payload.email_enabled
                if payload.email_enabled is not None
                else True
            ),
            push_enabled=(
                payload.push_enabled
                if payload.push_enabled is not None
                else True
            ),
        )

        db.add(preference)

    else:
        if payload.email_enabled is not None:
            preference.email_enabled = payload.email_enabled

        if payload.push_enabled is not None:
            preference.push_enabled = payload.push_enabled

    db.commit()
    db.refresh(preference)

    return NotificationPreferencesResponse(
        email_enabled=preference.email_enabled,
        push_enabled=preference.push_enabled,
    )


# =========================================================
# BROWSER PUSH CONFIG
# =========================================================

@router.get("/push-config")
def get_push_config(
    current_user: int = Depends(get_current_user),
):
    return {
        "enabled": bool(VAPID_PUBLIC_KEY),
        "public_key": VAPID_PUBLIC_KEY,
    }


# =========================================================
# REGISTER BROWSER PUSH SUBSCRIPTION
# =========================================================

@router.post("/push-subscriptions")
def create_push_subscription(
    payload: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    existing = (
        db.query(NotificationPushSubscription)
        .filter(
            NotificationPushSubscription.endpoint
            == payload.endpoint
        )
        .first()
    )

    if existing:
        # SECURITY:
        # A push subscription already belonging to another
        # user must never be transferred to the current user.
        if existing.user_id != current_user:
            raise HTTPException(
                status_code=403,
                detail="This push subscription belongs to another user.",
            )

        # The subscription already belongs to this user.
        # It is safe to update its browser keys/details.
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        existing.user_agent = payload.user_agent

        db.commit()
        db.refresh(existing)

        return {
            "message": "Push subscription updated",
            "subscription_id": existing.id,
        }

    # No existing subscription for this endpoint.
    subscription = NotificationPushSubscription(
        user_id=current_user,
        endpoint=payload.endpoint,
        p256dh=payload.keys.p256dh,
        auth=payload.keys.auth,
        user_agent=payload.user_agent,
    )

    db.add(subscription)
    db.commit()
    db.refresh(subscription)

    return {
        "message": "Push subscription registered",
        "subscription_id": subscription.id,
    }


# =========================================================
# DELETE BROWSER PUSH SUBSCRIPTION
# =========================================================

@router.delete("/push-subscriptions")
def delete_push_subscription(
    endpoint: str,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    subscription = (
        db.query(NotificationPushSubscription)
        .filter(
            NotificationPushSubscription.endpoint == endpoint,
            NotificationPushSubscription.user_id == current_user,
        )
        .first()
    )

    if not subscription:
        raise HTTPException(
            status_code=404,
            detail="Push subscription not found",
        )

    db.delete(subscription)
    db.commit()

    return {
        "message": "Push subscription removed"
    }


# =========================================================
# MARK ALL NOTIFICATIONS AS READ
# =========================================================

@router.put("/read-all")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    updated_count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user,
            Notification.is_read == False,
        )
        .update(
            {
                Notification.is_read: True
            },
            synchronize_session=False,
        )
    )

    db.commit()

    return {
        "message": "All notifications marked as read",
        "updated_count": updated_count,
    }


# =========================================================
# MARK ONE NOTIFICATION AS READ
# =========================================================

@router.put("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user,
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    notification.is_read = True

    db.commit()
    db.refresh(notification)

    return {
        "message": "Notification marked as read",
        "notification_id": notification.id,
    }


# =========================================================
# DELETE NOTIFICATION
# =========================================================

@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user,
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    db.delete(notification)
    db.commit()

    return {
        "message": "Notification deleted successfully",
        "notification_id": notification_id,
    }