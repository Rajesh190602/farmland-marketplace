"""make land owner required

Revision ID: e752fe269013
Revises: 4d3b3f0cc6eb
Create Date: 2026-09-17 14:58:03.512221

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e752fe269013'
down_revision: Union[str, Sequence[str], None] = '4d3b3f0cc6eb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column(
        "lands",
        "owner_id",
        existing_type=sa.Integer(),
        nullable=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        "lands",
        "owner_id",
        existing_type=sa.Integer(),
        nullable=True,
    )
