"""add user blocks

Revision ID: f85c84493cb6
Revises: 151f59fb9b70
Create Date: 2026-09-01 14:52:32.991606

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f85c84493cb6"
down_revision: Union[str, Sequence[str], None] = "151f59fb9b70"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create user blocks table."""

    op.create_table(
        "user_blocks",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False
        ),

        sa.Column(
            "blocker_id",
            sa.Integer(),
            nullable=False
        ),

        sa.Column(
            "blocked_id",
            sa.Integer(),
            nullable=False
        ),

        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False
        ),

        sa.ForeignKeyConstraint(
            ["blocker_id"],
            ["users.id"]
        ),

        sa.ForeignKeyConstraint(
            ["blocked_id"],
            ["users.id"]
        ),

        sa.PrimaryKeyConstraint("id"),

        sa.UniqueConstraint(
            "blocker_id",
            "blocked_id",
            name="uq_user_block"
        )
    )

    op.create_index(
        "ix_user_blocks_id",
        "user_blocks",
        ["id"],
        unique=False
    )

    op.create_index(
        "ix_user_blocks_blocker_id",
        "user_blocks",
        ["blocker_id"],
        unique=False
    )

    op.create_index(
        "ix_user_blocks_blocked_id",
        "user_blocks",
        ["blocked_id"],
        unique=False
    )


def downgrade() -> None:
    """Remove user blocks table."""

    op.drop_index(
        "ix_user_blocks_blocked_id",
        table_name="user_blocks"
    )

    op.drop_index(
        "ix_user_blocks_blocker_id",
        table_name="user_blocks"
    )

    op.drop_index(
        "ix_user_blocks_id",
        table_name="user_blocks"
    )

    op.drop_table("user_blocks")