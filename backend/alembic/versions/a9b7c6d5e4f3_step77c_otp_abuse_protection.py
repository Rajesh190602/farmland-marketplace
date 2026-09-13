"""Step 77C - OTP abuse protection

Revision ID: a9b7c6d5e4f3
Revises: a28698a0d39e
"""
from alembic import op
import sqlalchemy as sa

revision = "a9b7c6d5e4f3"
down_revision = "a28698a0d39e"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "email_verifications",
        sa.Column(
            "otp_request_count",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )
    op.add_column(
        "email_verifications",
        sa.Column(
            "otp_request_window_started_at",
            sa.DateTime(),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column("email_verifications", "otp_request_window_started_at")
    op.drop_column("email_verifications", "otp_request_count")
