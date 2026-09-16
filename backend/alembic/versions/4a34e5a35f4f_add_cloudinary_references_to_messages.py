"""add cloudinary references to messages

Revision ID: 4a34e5a35f4f
Revises: 741e8ea78383
Create Date: 2026-09-16 14:31:04.502412

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4a34e5a35f4f'
down_revision: Union[str, Sequence[str], None] = '741e8ea78383'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.add_column(
        'messages',
        sa.Column(
            'cloudinary_public_id',
            sa.String(),
            nullable=True
        )
    )

    op.add_column(
        'messages',
        sa.Column(
            'cloudinary_resource_type',
            sa.String(),
            nullable=True
        )
    )

    op.create_index(
        op.f('ix_messages_cloudinary_public_id'),
        'messages',
        ['cloudinary_public_id'],
        unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        op.f('ix_messages_cloudinary_public_id'),
        table_name='messages'
    )

    op.drop_column(
        'messages',
        'cloudinary_resource_type'
    )

    op.drop_column(
        'messages',
        'cloudinary_public_id'
    )