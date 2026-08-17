from sqlalchemy.orm import Session

from app import models


def create_activity_log(
    db: Session,
    user_id: int | None,
    action: str,
    description: str | None = None,
    target_type: str | None = None,
    target_id: int | None = None,
):
    log = models.ActivityLog(
        user_id=user_id,
        action=action,
        description=description,
        target_type=target_type,
        target_id=target_id,
    )

    db.add(log)

    return log