"""add recently viewed lands

Revision ID: 0383284b6c5d
Revises: f85c84493cb6
Create Date: 2026-09-01 18:17:58.187237

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0383284b6c5d"
down_revision: Union[str, Sequence[str], None] = "f85c84493cb6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "recently_viewed_lands",
        sa.Column(
            "id",
            sa.Integer(),
            nullable=False
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False
        ),
        sa.Column(
            "land_id",
            sa.Integer(),
            nullable=False
        ),
        sa.Column(
            "viewed_at",
            sa.DateTime(),
            nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"]
        ),
        sa.ForeignKeyConstraint(
            ["land_id"],
            ["lands.id"]
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "land_id",
            name="uq_recently_viewed_user_land"
        ),
    )

    op.create_index(
        op.f("ix_recently_viewed_lands_id"),
        "recently_viewed_lands",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_recently_viewed_lands_user_id"),
        "recently_viewed_lands",
        ["user_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_recently_viewed_lands_land_id"),
        "recently_viewed_lands",
        ["land_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_recently_viewed_lands_viewed_at"),
        "recently_viewed_lands",
        ["viewed_at"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        op.f("ix_recently_viewed_lands_viewed_at"),
        table_name="recently_viewed_lands",
    )

    op.drop_index(
        op.f("ix_recently_viewed_lands_land_id"),
        table_name="recently_viewed_lands",
    )

    op.drop_index(
        op.f("ix_recently_viewed_lands_user_id"),
        table_name="recently_viewed_lands",
    )

    op.drop_index(
        op.f("ix_recently_viewed_lands_id"),
        table_name="recently_viewed_lands",
    )

    op.drop_table("recently_viewed_lands")