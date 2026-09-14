"""Step 77D-3 - Admin sensitive-action re-authentication

Revision ID: e1f2a3b4c5d6
Revises: d0f1237c77b1
"""

from alembic import op


revision = "e1f2a3b4c5d6"
down_revision = "d0f1237c77b1"
branch_labels = None
depends_on = None


def upgrade():
    # The admin_reauth_challenges table already exists in the database
    # with the complete Step 77D-3 schema.
    #
    # Therefore, this migration only records the migration version.
    pass


def downgrade():
    # Do not remove the existing table automatically.
    # It existed before this migration was applied.
    pass