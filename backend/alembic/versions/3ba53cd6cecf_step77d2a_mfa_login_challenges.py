"""Step 77D-2A - Admin MFA login challenges

Revision ID: 3ba53cd6cecf
Revises: c2d3e4f5a6b7
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "3ba53cd6cecf"
down_revision = "c2d3e4f5a6b7"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "mfa_challenges",
        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "token_hash",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "expires_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "consumed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "failed_attempts",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_index(
        "ix_mfa_challenges_id",
        "mfa_challenges",
        ["id"],
    )

    op.create_index(
        "ix_mfa_challenges_user_id",
        "mfa_challenges",
        ["user_id"],
    )

    op.create_index(
        "ix_mfa_challenges_token_hash",
        "mfa_challenges",
        ["token_hash"],
        unique=True,
    )

    op.create_index(
        "ix_mfa_challenges_expires_at",
        "mfa_challenges",
        ["expires_at"],
    )

    op.create_index(
        "ix_mfa_challenges_created_at",
        "mfa_challenges",
        ["created_at"],
    )


def downgrade():
    op.drop_index(
        "ix_mfa_challenges_created_at",
        table_name="mfa_challenges",
    )

    op.drop_index(
        "ix_mfa_challenges_expires_at",
        table_name="mfa_challenges",
    )

    op.drop_index(
        "ix_mfa_challenges_token_hash",
        table_name="mfa_challenges",
    )

    op.drop_index(
        "ix_mfa_challenges_user_id",
        table_name="mfa_challenges",
    )

    op.drop_index(
        "ix_mfa_challenges_id",
        table_name="mfa_challenges",
    )

    op.drop_table("mfa_challenges")