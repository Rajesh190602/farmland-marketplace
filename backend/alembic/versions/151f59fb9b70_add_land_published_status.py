"""add land published status

Revision ID: 151f59fb9b70
Revises: 149dbf8295a1
Create Date: 2026-09-01
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "151f59fb9b70"
down_revision: Union[str, Sequence[str], None] = "149dbf8295a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add publication status to land listings."""

    # Add the column with a temporary server default so
    # existing rows can be populated safely.
    op.add_column(
        "lands",
        sa.Column(
            "is_published",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    # Only already-approved lands should initially be visible
    # in the marketplace.
    op.execute(
        sa.text(
            """
            UPDATE lands
            SET is_published = TRUE
            WHERE status = 'approved'
            """
        )
    )

    # Remove the server-side default after existing rows
    # have been initialized. New Land objects get their
    # default from the SQLAlchemy model.
    op.alter_column(
        "lands",
        "is_published",
        server_default=None,
    )


def downgrade() -> None:
    """Remove publication status from land listings."""

    op.drop_column(
        "lands",
        "is_published",
    )