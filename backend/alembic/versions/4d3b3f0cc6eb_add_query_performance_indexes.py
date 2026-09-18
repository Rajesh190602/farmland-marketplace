"""add query performance indexes

Revision ID: 4d3b3f0cc6eb
Revises: 1abb7de320f7
Create Date: 2026-09-17 14:25:40.035139

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4d3b3f0cc6eb'
down_revision: Union[str, Sequence[str], None] = '1abb7de320f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add indexes for frequently used query patterns."""

    op.create_index(
        "ix_lands_owner_id",
        "lands",
        ["owner_id"],
        unique=False,
    )

    op.create_index(
        "ix_lands_status",
        "lands",
        ["status"],
        unique=False,
    )

    op.create_index(
        "ix_land_images_land_id",
        "land_images",
        ["land_id"],
        unique=False,
    )

    op.create_index(
        "ix_conversations_buyer_id",
        "conversations",
        ["buyer_id"],
        unique=False,
    )

    op.create_index(
        "ix_conversations_farmer_id",
        "conversations",
        ["farmer_id"],
        unique=False,
    )

    op.create_index(
        "ix_conversations_land_id",
        "conversations",
        ["land_id"],
        unique=False,
    )

    op.create_index(
        "ix_messages_conversation_created_at",
        "messages",
        ["conversation_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    """Remove query performance indexes."""

    op.drop_index(
        "ix_messages_conversation_created_at",
        table_name="messages",
    )

    op.drop_index(
        "ix_conversations_land_id",
        table_name="conversations",
    )

    op.drop_index(
        "ix_conversations_farmer_id",
        table_name="conversations",
    )

    op.drop_index(
        "ix_conversations_buyer_id",
        table_name="conversations",
    )

    op.drop_index(
        "ix_land_images_land_id",
        table_name="land_images",
    )

    op.drop_index(
        "ix_lands_status",
        table_name="lands",
    )

    op.drop_index(
        "ix_lands_owner_id",
        table_name="lands",
    )