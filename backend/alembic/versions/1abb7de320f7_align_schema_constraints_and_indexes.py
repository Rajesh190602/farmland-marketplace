"""align schema constraints and indexes

Revision ID: 1abb7de320f7
Revises: 301c49069f2e
Create Date: 2026-09-17 13:47:15.288570

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1abb7de320f7'
down_revision: Union[str, Sequence[str], None] = '301c49069f2e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Align schema constraints and indexes."""

    op.alter_column(
        "email_verifications",
        "verified",
        existing_type=sa.Boolean(),
        nullable=False,
    )

    op.alter_column(
        "email_verifications",
        "created_at",
        existing_type=sa.DateTime(),
        nullable=False,
    )

    op.alter_column(
        "favorites",
        "user_id",
        existing_type=sa.Integer(),
        nullable=False,
    )

    op.alter_column(
        "favorites",
        "land_id",
        existing_type=sa.Integer(),
        nullable=False,
    )

    op.create_index(
        "ix_lands_is_published",
        "lands",
        ["is_published"],
        unique=False,
    )

    op.create_index(
        "ix_users_is_suspended",
        "users",
        ["is_suspended"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    pass