"""add profile image public id

Revision ID: 3c4a478a1f17
Revises: 898096236026
Create Date: 2026-09-26 11:33:03.452426

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3c4a478a1f17'
down_revision: Union[str, Sequence[str], None] = '898096236026'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "users",
        sa.Column(
            "profile_image_public_id",
            sa.String(),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "profile_image_public_id")