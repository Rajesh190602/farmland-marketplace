"""Background worker for notification email and browser-push delivery.

NotificationDeliveryJob is the durable outbox record.

The worker:
1. Claims pending jobs in short database transactions.
2. Loads the current notification/user/preferences/subscriptions.
3. Performs external email and browser-push delivery outside the
   database transaction.
4. Marks successful jobs completed.
5. Makes failed jobs available for retry with exponential backoff.
6. Removes stale browser-push subscriptions when reported by the
   push provider.

Delivery is intentionally at-least-once. If the process crashes after
an external provider accepts a message but before the job is marked
completed, the message may be delivered again on retry.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import (
    Notification,
    NotificationDeliveryJob,
    NotificationPushSubscription,
    User,
    UserNotificationPreference,
)
from app.utils.email import send_notification_email
from app.utils.push import send_web_push


DEFAULT_BATCH_SIZE = 10
MAX_ATTEMPTS = 5

# A job that remains in "processing" beyond this period is considered
# abandoned and can be reclaimed by another worker run.
PROCESSING_TIMEOUT_MINUTES = 10

# Retry delays:
# attempt 1 -> 1 minute
# attempt 2 -> 2 minutes
# attempt 3 -> 4 minutes
# attempt 4 -> 8 minutes
# attempt 5 -> 16 minutes
BASE_RETRY_DELAY_MINUTES = 1


class SubscriptionSnapshot:
    """Small object containing only the fields required by send_web_push."""

    def __init__(
        self,
        endpoint: str,
        p256dh: str,
        auth: str,
    ):
        self.endpoint = endpoint
        self.p256dh = p256dh
        self.auth = auth


def _retry_delay(attempts: int) -> timedelta:
    delay_minutes = BASE_RETRY_DELAY_MINUTES * (
        2 ** max(attempts - 1, 0)
    )

    return timedelta(minutes=delay_minutes)


def _claim_jobs(
    db: Session,
    batch_size: int,
):
    """
    Atomically claim a batch of available jobs.

    The database transaction is committed immediately after claiming,
    before any external email/push provider is contacted.
    """

    now = datetime.now(timezone.utc)

    stale_processing_before = (
        now
        - timedelta(minutes=PROCESSING_TIMEOUT_MINUTES)
    )

    jobs = (
        db.query(NotificationDeliveryJob)
        .filter(
            NotificationDeliveryJob.available_at <= now,
            or_(
                NotificationDeliveryJob.status == "pending",
                (
                    (NotificationDeliveryJob.status == "processing")
                    & (
                        NotificationDeliveryJob.locked_at
                        <= stale_processing_before
                    )
                ),
            ),
        )
        .order_by(
            NotificationDeliveryJob.available_at.asc(),
            NotificationDeliveryJob.id.asc(),
        )
        .with_for_update(
            skip_locked=True,
        )
        .limit(batch_size)
        .all()
    )

    claimed = []

    for job in jobs:
        job.status = "processing"
        job.locked_at = now
        job.attempts = (job.attempts or 0) + 1
        job.last_error = None

        claimed.append(job.id)

    if claimed:
        db.commit()

    return claimed


def _remove_stale_subscription(
    db: Session,
    subscription_id: int,
) -> None:
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


def _deliver_job(
    db: Session,
    job_id: int,
) -> bool:
    """
    Deliver one claimed job.

    Returns True when the job is fully processed successfully.
    """

    job = (
        db.query(NotificationDeliveryJob)
        .filter(
            NotificationDeliveryJob.id == job_id
        )
        .first()
    )

    if not job:
        return False

    notification = (
        db.query(Notification)
        .filter(
            Notification.id == job.notification_id
        )
        .first()
    )

    if not notification:
        job.status = "completed"
        job.completed_at = datetime.now(timezone.utc)
        job.locked_at = None
        job.last_error = "Notification no longer exists."
        db.commit()
        return True

    user = (
        db.query(User)
        .filter(
            User.id == notification.user_id
        )
        .first()
    )

    if not user:
        job.status = "failed"
        job.locked_at = None
        job.last_error = "Notification user no longer exists."
        db.commit()
        return False

    preference = (
        db.query(UserNotificationPreference)
        .filter(
            UserNotificationPreference.user_id
            == user.id
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

    errors = []

    # ---------------------------------------------------------
    # EMAIL
    # ---------------------------------------------------------

    if email_enabled:
        try:
            send_notification_email(
                receiver_email=user.email,
                receiver_name=user.full_name,
                title=notification.title,
                message=notification.message,
            )
        except Exception as exc:
            errors.append(
                f"Email delivery failed: {str(exc)}"
            )

    # ---------------------------------------------------------
    # BROWSER PUSH
    # ---------------------------------------------------------

    if push_enabled:
        subscriptions = (
            db.query(NotificationPushSubscription)
            .filter(
                NotificationPushSubscription.user_id
                == user.id
            )
            .all()
        )

        for subscription in subscriptions:
            subscription_snapshot = SubscriptionSnapshot(
                endpoint=subscription.endpoint,
                p256dh=subscription.p256dh,
                auth=subscription.auth,
            )

            try:
                result = send_web_push(
                    subscription=subscription_snapshot,
                    title=notification.title,
                    message=notification.message,
                    target_type=notification.target_type,
                    target_id=notification.target_id,
                )

                if result.get("stale"):
                    _remove_stale_subscription(
                        db,
                        subscription.id,
                    )

            except Exception as exc:
                errors.append(
                    "Push delivery failed: "
                    f"{str(exc)}"
                )

    # ---------------------------------------------------------
    # FINAL JOB STATE
    # ---------------------------------------------------------

    now = datetime.now(timezone.utc)

    if not errors:
        job.status = "completed"
        job.completed_at = now
        job.locked_at = None
        job.last_error = None
        db.commit()

        return True

    job.locked_at = None
    job.last_error = "\n".join(errors)

    if job.attempts >= MAX_ATTEMPTS:
        job.status = "failed"
        job.available_at = now
    else:
        job.status = "pending"
        job.available_at = now + _retry_delay(
            job.attempts
        )

    db.commit()

    return False


def process_notification_delivery_jobs(
    db: Session,
    batch_size: int = DEFAULT_BATCH_SIZE,
) -> dict:
    """
    Process one bounded batch of notification delivery jobs.

    A bounded batch prevents a single internal-task invocation from
    consuming an unbounded amount of time.
    """

    batch_size = max(
        1,
        min(batch_size, 100),
    )

    claimed_job_ids = _claim_jobs(
        db,
        batch_size,
    )

    completed = 0
    failed = 0

    for job_id in claimed_job_ids:
        try:
            success = _deliver_job(
                db,
                job_id,
            )

            if success:
                completed += 1
            else:
                failed += 1

        except Exception as exc:
            db.rollback()

            job = (
                db.query(NotificationDeliveryJob)
                .filter(
                    NotificationDeliveryJob.id
                    == job_id
                )
                .first()
            )

            if job:
                now = datetime.now(timezone.utc)

                job.locked_at = None
                job.last_error = (
                    f"Unexpected worker error: {str(exc)}"
                )

                if job.attempts >= MAX_ATTEMPTS:
                    job.status = "failed"
                    job.available_at = now
                else:
                    job.status = "pending"
                    job.available_at = (
                        now
                        + _retry_delay(job.attempts)
                    )

                db.commit()

            failed += 1

    return {
        "claimed": len(claimed_job_ids),
        "completed": completed,
        "failed": failed,
    }