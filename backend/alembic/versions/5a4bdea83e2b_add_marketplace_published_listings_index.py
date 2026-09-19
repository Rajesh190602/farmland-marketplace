"""add marketplace published listings index

Revision ID: 5a4bdea83e2b
Revises: e752fe269013
Create Date: 2026-09-19
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "5a4bdea83e2b"
down_revision: Union[str, Sequence[str], None] = "e752fe269013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE INDEX ix_lands_marketplace_published_id
        ON lands (id DESC)
        WHERE status = 'approved'
          AND is_published = true
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP INDEX IF EXISTS ix_lands_marketplace_published_id
        """
    )