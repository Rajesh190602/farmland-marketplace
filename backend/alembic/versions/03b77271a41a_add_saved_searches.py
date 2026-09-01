"""add saved searches

Revision ID: 03b77271a41a
Revises: 0383284b6c5d
Create Date: 2026-09-01 21:01:35.976531

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "03b77271a41a"
down_revision: Union[str, Sequence[str], None] = "0383284b6c5d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create saved searches table."""

    op.create_table(
        "saved_searches",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "name",
            sa.String(),
            nullable=False,
        ),

        sa.Column(
            "district",
            sa.String(),
            nullable=True,
        ),

        sa.Column(
            "village",
            sa.String(),
            nullable=True,
        ),

        sa.Column(
            "mandal",
            sa.String(),
            nullable=True,
        ),

        sa.Column(
            "crop_type",
            sa.String(),
            nullable=True,
        ),

        sa.Column(
            "soil_type",
            sa.String(),
            nullable=True,
        ),

        sa.Column(
            "water_source",
            sa.String(),
            nullable=True,
        ),

        sa.Column(
            "min_price",
            sa.Float(),
            nullable=True,
        ),

        sa.Column(
            "max_price",
            sa.Float(),
            nullable=True,
        ),

        sa.Column(
            "min_area",
            sa.Float(),
            nullable=True,
        ),

        sa.Column(
            "max_area",
            sa.Float(),
            nullable=True,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
        ),

        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),

        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_saved_searches_id",
        "saved_searches",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_saved_searches_user_id",
        "saved_searches",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Remove saved searches table."""

    op.drop_index(
        "ix_saved_searches_user_id",
        table_name="saved_searches",
    )

    op.drop_index(
        "ix_saved_searches_id",
        table_name="saved_searches",
    )

    op.drop_table("saved_searches")