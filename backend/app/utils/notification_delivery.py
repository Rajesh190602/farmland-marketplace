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

        print(
            f"STEP66 NOTIFICATION FOUND: "
            f"user_id={obj.user_id}, "
            f"title={obj.title}"
        )

        if obj.user_id is None:
            continue

        if obj.id is not None and obj.id in queued_ids:
            continue

        user = (
            session.query(User)
            .filter(User.id == obj.user_id)
            .first()
        )

        if not user:
            print(
                f"STEP66 USER NOT FOUND: user_id={obj.user_id}"
            )
            continue

        preference = (
            session.query(UserNotificationPreference)
            .filter(
                UserNotificationPreference.user_id == obj.user_id
            )
            .first()
        )

        email_enabled = (
            preference.email_enabled
            if preference
            else True
        )

        push_enabled = (
            preference.push_enabled
            if preference
            else True
        )

        print(
            f"STEP66 PREFERENCE: "
            f"user_id={obj.user_id}, "
            f"email_enabled={email_enabled}, "
            f"push_enabled={push_enabled}"
        )

        subscriptions = []

        if push_enabled:
            subscriptions = (
                session.query(NotificationPushSubscription)
                .filter(
                    NotificationPushSubscription.user_id
                    == obj.user_id
                )
                .all()
            )

        print(
            f"STEP66 SUBSCRIPTIONS FOUND: "
            f"user_id={obj.user_id}, "
            f"count={len(subscriptions)}"
        )

        queued.append(
            {
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
            }
        )

        if obj.id is not None:
            queued_ids.add(obj.id)


@event.listens_for(Session, "after_flush")
def _capture_notifications_after_flush(session, flush_context):
    print("STEP66 AFTER_FLUSH FIRED")

    before = len(
        session.info.get(_QUEUE_KEY, [])
    )

    _queue_notifications(
        session,
        flush_context
    )

    after = len(
        session.info.get(_QUEUE_KEY, [])
    )

    print(
        f"STEP66 AFTER_FLUSH QUEUE: "
        f"before={before}, "
        f"after={after}"
    )


@event.listens_for(Session, "after_commit")
def _dispatch_notifications_after_commit(session):
    print("STEP66 AFTER_COMMIT FIRED")

    queued = session.info.pop(
        _QUEUE_KEY,
        []
    )

    session.info.pop(
        _QUEUE_IDS_KEY,
        None
    )

    print(
        f"STEP66 AFTER_COMMIT QUEUE SIZE: "
        f"{len(queued)}"
    )

    if not queued:
        return

    # Delivery is intentionally best-effort.
    # A Brevo or push-provider failure must never turn a
    # successful marketplace transaction into a failed one.

    for item in queued:

        print(
            f"STEP66 DELIVERY START: "
            f"notification_id={item['notification_id']}, "
            f"user_id={item['user_id']}, "
            f"title={item['title']}"
        )

        if item["email_enabled"]:
            print(
                f"STEP66 EMAIL ATTEMPT: "
                f"notification_id={item['notification_id']}"
            )

            try:
                email_result = send_notification_email(
                    receiver_email=item["email"],
                    receiver_name=item["name"],
                    title=item["title"],
                    message=item["message"],
                )

                print(
                    "STEP66 EMAIL RESULT:",
                    email_result
                )

            except Exception as exc:
                print(
                    "STEP66 EMAIL ERROR:",
                    repr(exc)
                )

        if item["push_enabled"]:

            print(
                f"STEP66 PUSH ENABLED: "
                f"notification_id={item['notification_id']}, "
                f"subscriptions={len(item['subscriptions'])}"
            )

            for subscription_data in item["subscriptions"]:

                print(
                    f"STEP66 PUSH ATTEMPT: "
                    f"subscription_id={subscription_data['id']}"
                )

                class SubscriptionSnapshot:
                    pass

                subscription = SubscriptionSnapshot()

                subscription.endpoint = (
                    subscription_data["endpoint"]
                )

                subscription.p256dh = (
                    subscription_data["p256dh"]
                )

                subscription.auth = (
                    subscription_data["auth"]
                )

                try:
                    result = send_web_push(
                        subscription=subscription,
                        title=item["title"],
                        message=item["message"],
                        target_type=item["target_type"],
                        target_id=item["target_id"],
                    )

                    print(
                        "STEP66 PUSH DELIVERY RESULT:",
                        result
                    )

                except Exception as exc:
                    print(
                        "STEP66 PUSH UNEXPECTED ERROR:",
                        repr(exc)
                    )
                    continue

                if result.get("sent"):
                    print(
                        f"STEP66 PUSH SUCCESS: "
                        f"subscription_id={subscription_data['id']}"
                    )

                if result.get("stale"):
                    print(
                        f"STEP66 PUSH STALE SUBSCRIPTION: "
                        f"subscription_id={subscription_data['id']}"
                    )

                    _remove_stale_subscription(
                        subscription_data["id"]
                    )


@event.listens_for(Session, "after_rollback")
def _clear_notification_queue_after_rollback(session):
    print("STEP66 AFTER_ROLLBACK FIRED")

    session.info.pop(
        _QUEUE_KEY,
        None
    )

    session.info.pop(
        _QUEUE_IDS_KEY,
        None
    )


def _remove_stale_subscription(subscription_id):
    # Import lazily to avoid creating a module-level
    # database dependency.
    from sqlalchemy.orm import sessionmaker
    from app.database import engine

    SessionFactory = sessionmaker(
        bind=engine
    )

    db = SessionFactory()

    try:
        subscription = (
            db.query(NotificationPushSubscription)
            .filter(
                NotificationPushSubscription.id
                == subscription_id
            )
            .first()
        )

        if subscription:
            db.delete(subscription)
            db.commit()

            print(
                f"STEP66 STALE SUBSCRIPTION REMOVED: "
                f"id={subscription_id}"
            )

    except Exception as exc:
        db.rollback()

        print(
            "STEP66 STALE SUBSCRIPTION ERROR:",
            repr(exc)
        )

    finally:
        db.close()