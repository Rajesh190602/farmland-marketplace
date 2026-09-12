"""Step 75 - advanced admin permission architecture

Revision ID: step75_admin_permissions
Revises: c03f36ef6028
"""

from alembic import op
import sqlalchemy as sa


revision = "step75_admin_permissions"
down_revision = "c03f36ef6028"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column(
            "admin_permission_role",
            sa.String(),
            nullable=False,
            server_default="NONE",
        ),
    )

    op.create_index(
        "ix_users_admin_permission_role",
        "users",
        ["admin_permission_role"],
        unique=False,
    )

    # Existing admin accounts retain their existing full capabilities.
    op.execute(
        sa.text(
            "UPDATE users "
            "SET admin_permission_role = 'SUPER_ADMIN' "
            "WHERE LOWER(role) = 'admin'"
        )
    )


def downgrade():
    op.drop_index(
        "ix_users_admin_permission_role",
        table_name="users",
    )

    op.drop_column(
        "users",
        "admin_permission_role",
    )