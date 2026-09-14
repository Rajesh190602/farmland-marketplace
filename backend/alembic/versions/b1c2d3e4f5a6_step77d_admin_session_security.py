"""Step 77D - Server-side admin session invalidation

Revision ID: b1c2d3e4f5a6
Revises: a9b7c6d5e4f3
"""

from alembic import op
import sqlalchemy as sa


revision = "b1c2d3e4f5a6"
down_revision = "a9b7c6d5e4f3"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column(
            "admin_session_version",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )


def downgrade():
    op.drop_column("users", "admin_session_version")