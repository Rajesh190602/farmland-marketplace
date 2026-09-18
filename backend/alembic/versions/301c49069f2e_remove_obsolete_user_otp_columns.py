"""remove obsolete user otp columns

Revision ID: 301c49069f2e
Revises: 4a34e5a35f4f
Create Date: 2026-09-17 13:39:35.924432

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '301c49069f2e'
down_revision: Union[str, Sequence[str], None] = '4a34e5a35f4f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.drop_column("users", "email_verified")
    op.drop_column("users", "email_otp")
    op.drop_column("users", "otp_expiry")


def downgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email_verified", sa.Boolean(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("email_otp", sa.String(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("otp_expiry", sa.DateTime(), nullable=True),
    )