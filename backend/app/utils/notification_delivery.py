"""Automatic email and browser-push delivery for database notifications.

Every existing Notification(...) creation point remains valid. SQLAlchemy's
session events collect newly-created notifications and dispatch them only
after the surrounding database transaction successfully commits.
"""

from sqlalchemy import event
from sqlalchemy.orm import Session
from app.models import (
    Notification,
    User,
    UserNotificationPreference,
    NotificationPushSubscription,
)
from app.utils.email import send_notification_email
from app.utils.push import send_web_push


_QUEUE_KEY = "_step66_notification_delivery_queue"
_QUEUE_IDS_KEY = "_step66_notification_delivery_ids"


def _queue_notifications(session: Session, flush_context=None):
    queued = session.info.setdefault(_QUEUE_KEY, [])
    queued_ids = session.info.setdefault(_QUEUE_IDS_KEY, set())

    for obj in list(session.new):
        if not isinstance(obj, Notification):
            continue
        if obj.user_id is None:
            continue

        if obj.id is not None and obj.id in queued_ids:
            continue

        user = session.query(User).filter(User.id == obj.user_id).first()
        if not user:
            continue

        preference = (
            session.query(UserNotificationPreference)
            .filter(UserNotificationPreference.user_id == obj.user_id)
            .first()
        )

        email_enabled = preference.email_enabled if preference else True
        push_enabled = preference.push_enabled if preference else True

        subscriptions = []
        if push_enabled:
            subscriptions = (
                session.query(NotificationPushSubscription)
                .filter(NotificationPushSubscription.user_id == obj.user_id)
                .all()
            )

        queued.append({
            "notification_id": obj.id,
            "user_id": obj.user_id,
            "email": user.email,
            "name": user.full_name,
            "title": obj.title,
            "message": obj.message,
            "target_type": obj.target_type,
            "target_id": obj.target_id,
            "email_enabled": email_enabled,
            "push_enabled": push_enabled,
            "subscriptions": [
                {
                    "id": subscription.id,
                    "endpoint": subscription.endpoint,
                    "p256dh": subscription.p256dh,
                    "auth": subscription.auth,
                }
                for subscription in subscriptions
            ],
        })

        if obj.id is not None:
            queued_ids.add(obj.id)


@event.listens_for(Session, "after_flush")
def _capture_notifications_after_flush(session, flush_context):
    _queue_notifications(session, flush_context)


@event.listens_for(Session, "after_commit")
def _dispatch_notifications_after_commit(session):
    queued = session.info.pop(_QUEUE_KEY, [])
    session.info.pop(_QUEUE_IDS_KEY, None)
    if not queued:
        return

    # Delivery is intentionally best-effort. A Brevo or push-provider failure
    # must never turn a successful marketplace transaction into a failed one.
    for item in queued:
        if item["email_enabled"]:
            send_notification_email(
                receiver_email=item["email"],
                receiver_name=item["name"],
                title=item["title"],
                message=item["message"],
            )

        if item["push_enabled"]:
            for subscription_data in item["subscriptions"]:
                class SubscriptionSnapshot:
                    pass

                subscription = SubscriptionSnapshot()
                subscription.endpoint = subscription_data["endpoint"]
                subscription.p256dh = subscription_data["p256dh"]
                subscription.auth = subscription_data["auth"]

                result = send_web_push(
                    subscription=subscription,
                    title=item["title"],
                    message=item["message"],
                    target_type=item["target_type"],
                    target_id=item["target_id"],
                )

                if result.get("stale"):
                    _remove_stale_subscription(subscription_data["id"])


@event.listens_for(Session, "after_rollback")
def _clear_notification_queue_after_rollback(session):
    session.info.pop(_QUEUE_KEY, None)
    session.info.pop(_QUEUE_IDS_KEY, None)


def _remove_stale_subscription(subscription_id):
    # Import lazily to avoid creating a module-level database dependency.
    from sqlalchemy.orm import sessionmaker
    from app.database import engine

    SessionFactory = sessionmaker(bind=engine)
    db = SessionFactory()
    try:
        subscription = (
            db.query(NotificationPushSubscription)
            .filter(NotificationPushSubscription.id == subscription_id)
            .first()
        )
        if subscription:
            db.delete(subscription)
            db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()
