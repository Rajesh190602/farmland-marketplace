"""add cloudinary public id to land images

Revision ID: 741e8ea78383
Revises: e1f2a3b4c5d6
Create Date: 2026-09-16 13:39:26.311362

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '741e8ea78383'
down_revision: Union[str, Sequence[str], None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'land_images',
        sa.Column(
            'cloudinary_public_id',
            sa.String(),
            nullable=True
        )
    )

    op.create_index(
        op.f('ix_land_images_cloudinary_public_id'),
        'land_images',
        ['cloudinary_public_id'],
        unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f('ix_land_images_cloudinary_public_id'),
        table_name='land_images'
    )

    op.drop_column(
        'land_images',
        'cloudinary_public_id'
    )