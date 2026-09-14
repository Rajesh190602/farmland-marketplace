"""Step 77D-2 - Admin MFA / TOTP foundation

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
"""

from alembic import op
import sqlalchemy as sa


revision = "c2d3e4f5a6b7"
down_revision = "b1c2d3e4f5a6"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column(
            "mfa_enabled",
            sa.Boolean(),
            server_default="false",
            nullable=False,
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "mfa_secret",
            sa.String(),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column("users", "mfa_secret")
    op.drop_column("users", "mfa_enabled")