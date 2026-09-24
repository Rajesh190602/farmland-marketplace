"""add notification delivery jobs

Revision ID: 898096236026
Revises: 5a4bdea83e2b
Create Date: 2026-09-24 13:33:49.281655

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "898096236026"
down_revision: Union[str, Sequence[str], None] = "5a4bdea83e2b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "notification_delivery_jobs",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            nullable=False,
        ),

        sa.Column(
            "notification_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "status",
            sa.String(),
            server_default="pending",
            nullable=False,
        ),

        sa.Column(
            "attempts",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),

        sa.Column(
            "available_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),

        sa.Column(
            "locked_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.Column(
            "completed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.Column(
            "last_error",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),

        sa.ForeignKeyConstraint(
            ["notification_id"],
            ["notifications.id"],
            ondelete="CASCADE",
        ),

        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),

        sa.UniqueConstraint(
            "notification_id",
            name="uq_notification_delivery_job_notification",
        ),
    )

    op.create_index(
        "ix_notification_delivery_jobs_id",
        "notification_delivery_jobs",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_notification_delivery_jobs_user_id",
        "notification_delivery_jobs",
        ["user_id"],
        unique=False,
    )

    op.create_index(
        "ix_notification_delivery_jobs_status",
        "notification_delivery_jobs",
        ["status"],
        unique=False,
    )

    op.create_index(
        "ix_notification_delivery_jobs_available_at",
        "notification_delivery_jobs",
        ["available_at"],
        unique=False,
    )

    op.create_index(
        "ix_notification_delivery_jobs_created_at",
        "notification_delivery_jobs",
        ["created_at"],
        unique=False,
    )

    op.create_index(
        "ix_notification_delivery_jobs_pending",
        "notification_delivery_jobs",
        ["status", "available_at"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        "ix_notification_delivery_jobs_pending",
        table_name="notification_delivery_jobs",
    )

    op.drop_index(
        "ix_notification_delivery_jobs_created_at",
        table_name="notification_delivery_jobs",
    )

    op.drop_index(
        "ix_notification_delivery_jobs_available_at",
        table_name="notification_delivery_jobs",
    )

    op.drop_index(
        "ix_notification_delivery_jobs_status",
        table_name="notification_delivery_jobs",
    )

    op.drop_index(
        "ix_notification_delivery_jobs_user_id",
        table_name="notification_delivery_jobs",
    )

    op.drop_index(
        "ix_notification_delivery_jobs_id",
        table_name="notification_delivery_jobs",
    )

    op.drop_table("notification_delivery_jobs")