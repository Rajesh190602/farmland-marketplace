"""step 69 land ownership verification

Revision ID: c03f36ef6028
Revises: 03b77271a41a
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c03f36ef6028"
down_revision: Union[str, Sequence[str], None] = "03b77271a41a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_kyc_verifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("document_type", sa.String(), nullable=False),
        sa.Column("document_public_id", sa.String(), nullable=False),
        sa.Column("original_filename", sa.String(), nullable=True),
        sa.Column("content_type", sa.String(), nullable=True),
        sa.Column("masked_document_number", sa.String(), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("reviewed_by_id", sa.Integer(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["reviewed_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("ix_user_kyc_verifications_id", "user_kyc_verifications", ["id"], unique=False)
    op.create_index("ix_user_kyc_verifications_status", "user_kyc_verifications", ["status"], unique=False)
    op.create_index("ix_user_kyc_verifications_user_id", "user_kyc_verifications", ["user_id"], unique=True)

    op.create_table(
        "land_ownership_verifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("land_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("document_public_id", sa.String(), nullable=False),
        sa.Column("original_filename", sa.String(), nullable=True),
        sa.Column("content_type", sa.String(), nullable=True),
        sa.Column("masked_document_number", sa.String(), nullable=True),
        sa.Column("survey_number_snapshot", sa.String(), nullable=True),
        sa.Column("owner_name_snapshot", sa.String(), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("reviewed_by_id", sa.Integer(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["land_id"], ["lands.id"]),
        sa.ForeignKeyConstraint(["reviewed_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("ix_land_ownership_verifications_id", "land_ownership_verifications", ["id"], unique=False)
    op.create_index("ix_land_ownership_verifications_land_id", "land_ownership_verifications", ["land_id"], unique=True)
    op.create_index("ix_land_ownership_verifications_reviewed_by_id", "land_ownership_verifications", ["reviewed_by_id"], unique=False)
    op.create_index("ix_land_ownership_verifications_status", "land_ownership_verifications", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_land_ownership_verifications_status", table_name="land_ownership_verifications")
    op.drop_index("ix_land_ownership_verifications_reviewed_by_id", table_name="land_ownership_verifications")
    op.drop_index("ix_land_ownership_verifications_land_id", table_name="land_ownership_verifications")
    op.drop_index("ix_land_ownership_verifications_id", table_name="land_ownership_verifications")
    op.drop_table("land_ownership_verifications")

    op.drop_index("ix_user_kyc_verifications_user_id", table_name="user_kyc_verifications")
    op.drop_index("ix_user_kyc_verifications_status", table_name="user_kyc_verifications")
    op.drop_index("ix_user_kyc_verifications_id", table_name="user_kyc_verifications")
    op.drop_table("user_kyc_verifications")
