"""step77b login abuse protection

Revision ID: a28698a0d39e
Revises: e853df952f5f
Create Date: 2026-09-13
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a28698a0d39e"
down_revision: Union[str, Sequence[str], None] = "e853df952f5f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # =========================================================
    # STEP 77B - LOGIN / ACCOUNT ABUSE PROTECTION
    # =========================================================

    op.add_column(
        "users",
        sa.Column(
            "failed_login_attempts",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "locked_until",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "last_failed_login_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.create_index(
        "ix_users_locked_until",
        "users",
        ["locked_until"],
        unique=False,
    )


def downgrade() -> None:
    # =========================================================
    # STEP 77B - ROLLBACK
    # =========================================================

    op.drop_index(
        "ix_users_locked_until",
        table_name="users",
    )

    op.drop_column(
        "users",
        "last_failed_login_at",
    )

    op.drop_column(
        "users",
        "locked_until",
    )

    op.drop_column(
        "users",
        "failed_login_attempts",
    )