"""Add profile image to users

Revision ID: a2324c5015b7
Revises: 6bbde50bca49
Create Date: 2026-08-24 09:19:40.768174

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a2324c5015b7"
down_revision: Union[str, Sequence[str], None] = "6bbde50bca49"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "users",
        sa.Column(
            "profile_image",
            sa.String(),
            nullable=True
        )
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column(
        "users",
        "profile_image"
    )