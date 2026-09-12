"""step76 risk events

Revision ID: e853df952f5f
Revises: c8_step75_admin_permissions
Create Date: 2026-09-12
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e853df952f5f"
down_revision: Union[str, Sequence[str], None] = "step75_admin_permissions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "risk_events",
        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=True,
        ),
        sa.Column(
            "event_type",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "risk_score",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "risk_level",
            sa.String(),
            nullable=False,
            server_default="LOW",
        ),
        sa.Column(
            "description",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "target_type",
            sa.String(),
            nullable=True,
        ),
        sa.Column(
            "target_id",
            sa.Integer(),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.String(),
            nullable=False,
            server_default="OPEN",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "resolved_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "resolved_by",
            sa.Integer(),
            nullable=True,
        ),
        sa.Column(
            "resolution_note",
            sa.Text(),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["resolved_by"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_risk_events_id",
        "risk_events",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_risk_events_user_id",
        "risk_events",
        ["user_id"],
        unique=False,
    )

    op.create_index(
        "ix_risk_events_event_type",
        "risk_events",
        ["event_type"],
        unique=False,
    )

    op.create_index(
        "ix_risk_events_risk_score",
        "risk_events",
        ["risk_score"],
        unique=False,
    )

    op.create_index(
        "ix_risk_events_risk_level",
        "risk_events",
        ["risk_level"],
        unique=False,
    )

    op.create_index(
        "ix_risk_events_target_type",
        "risk_events",
        ["target_type"],
        unique=False,
    )

    op.create_index(
        "ix_risk_events_target_id",
        "risk_events",
        ["target_id"],
        unique=False,
    )

    op.create_index(
        "ix_risk_events_status",
        "risk_events",
        ["status"],
        unique=False,
    )

    op.create_index(
        "ix_risk_events_created_at",
        "risk_events",
        ["created_at"],
        unique=False,
    )

    op.create_index(
        "ix_risk_events_resolved_by",
        "risk_events",
        ["resolved_by"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_risk_events_resolved_by",
        table_name="risk_events",
    )

    op.drop_index(
        "ix_risk_events_created_at",
        table_name="risk_events",
    )

    op.drop_index(
        "ix_risk_events_status",
        table_name="risk_events",
    )

    op.drop_index(
        "ix_risk_events_target_id",
        table_name="risk_events",
    )

    op.drop_index(
        "ix_risk_events_target_type",
        table_name="risk_events",
    )

    op.drop_index(
        "ix_risk_events_risk_level",
        table_name="risk_events",
    )

    op.drop_index(
        "ix_risk_events_risk_score",
        table_name="risk_events",
    )

    op.drop_index(
        "ix_risk_events_event_type",
        table_name="risk_events",
    )

    op.drop_index(
        "ix_risk_events_user_id",
        table_name="risk_events",
    )

    op.drop_index(
        "ix_risk_events_id",
        table_name="risk_events",
    )

    op.drop_table("risk_events")