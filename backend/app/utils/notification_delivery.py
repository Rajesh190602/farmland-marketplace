"""Transactional outbox creation for notification delivery.

Every existing Notification(...) creation point remains valid.

Whenever a new Notification is added to a database transaction, a
NotificationDeliveryJob is created in the same transaction. External
email and browser-push delivery are handled later by the notification
worker.
"""

from sqlalchemy import event
from sqlalchemy.orm import Session

from app.models import (
    Notification,
    NotificationDeliveryJob,
)


_JOB_CREATED_KEY = "_step4_notification_delivery_jobs_created"


@event.listens_for(Session, "before_flush")
def _create_notification_delivery_jobs(
    session: Session,
    flush_context,
    instances,
):
    """
    Create a durable delivery job in the same transaction as a Notification.

    This provides transactional outbox behavior:

        Notification + NotificationDeliveryJob
                        ↓
                    same COMMIT

    If the transaction rolls back, both records are rolled back.
    """

    created_notifications = session.info.setdefault(
        _JOB_CREATED_KEY,
        set(),
    )

    for obj in list(session.new):

        if not isinstance(obj, Notification):
            continue

        if obj.user_id is None:
            continue

        # Prevent duplicate job creation if another flush occurs
        # during the same transaction.
        object_key = id(obj)

        if object_key in created_notifications:
            continue

        job = NotificationDeliveryJob(
            notification=obj,
            user_id=obj.user_id,
            status="pending",
            attempts=0,
        )

        session.add(job)

        created_notifications.add(object_key)


@event.listens_for(Session, "after_commit")
def _clear_notification_delivery_state_after_commit(
    session: Session,
):
    """
    Clear temporary duplicate-prevention state.

    External notification delivery is intentionally NOT performed here.
    """

    session.info.pop(
        _JOB_CREATED_KEY,
        None,
    )


@event.listens_for(Session, "after_rollback")
def _clear_notification_delivery_state_after_rollback(
    session: Session,
):
    """
    Clear temporary state after a rollback.

    The NotificationDeliveryJob is part of the same database transaction,
    so the database automatically rolls it back as well.
    """

    session.info.pop(
        _JOB_CREATED_KEY,
        None,
    )