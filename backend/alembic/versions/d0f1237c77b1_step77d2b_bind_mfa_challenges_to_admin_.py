"""Step 77D-2B - Bind MFA challenges to admin session

Revision ID: d0f1237c77b1
Revises: 3ba53cd6cecf
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d0f1237c77b1"
down_revision = "3ba53cd6cecf"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "mfa_challenges",
        sa.Column(
            "admin_session_version",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )

    op.create_index(
        "ix_mfa_challenges_admin_session_version",
        "mfa_challenges",
        ["admin_session_version"],
    )


def downgrade():
    op.drop_index(
        "ix_mfa_challenges_admin_session_version",
        table_name="mfa_challenges",
    )

    op.drop_column(
        "mfa_challenges",
        "admin_session_version",
    )