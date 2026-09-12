"""
Farmland Marketplace
Step 75 - Advanced Admin Permission Architecture

Centralized definitions and helpers for admin permission roles.

Permission state is stored in the database on
User.admin_permission_role.

FastAPI authorization dependencies remain in auth.py
to avoid circular imports.
"""

ADMIN_PERMISSION_ROLES = {
    "SUPER_ADMIN",
    "VERIFICATION_ADMIN",
    "MODERATION_ADMIN",
    "SUPPORT_ADMIN",
    "ANALYTICS_ADMIN",
}

ADMIN_PERMISSION_ALIASES = {
    "super_admin": "SUPER_ADMIN",
    "verification": "VERIFICATION_ADMIN",
    "verification_admin": "VERIFICATION_ADMIN",
    "moderation": "MODERATION_ADMIN",
    "moderation_admin": "MODERATION_ADMIN",
    "support": "SUPPORT_ADMIN",
    "support_admin": "SUPPORT_ADMIN",
    "analytics": "ANALYTICS_ADMIN",
    "analytics_admin": "ANALYTICS_ADMIN",
}


def normalize_admin_permission(value) -> str:
    """
    Normalize an admin permission value.

    Unknown, empty, or invalid values fail closed to NONE.
    """
    normalized = str(value or "").strip().upper()

    if normalized in ADMIN_PERMISSION_ROLES:
        return normalized

    return "NONE"


def normalize_requested_permission(value) -> str:
    """
    Normalize a permission requested by application code.

    Supports canonical role names and safe aliases.
    Invalid permissions raise ValueError so authorization
    mistakes cannot silently weaken security.
    """
    raw = str(value or "").strip()

    if not raw:
        raise ValueError("Admin permission is required.")

    alias_key = raw.lower()

    if alias_key in ADMIN_PERMISSION_ALIASES:
        return ADMIN_PERMISSION_ALIASES[alias_key]

    normalized = raw.upper()

    if normalized in ADMIN_PERMISSION_ROLES:
        return normalized

    raise ValueError(f"Invalid admin permission: {value}")


def user_has_admin_permission(user, required_permission: str) -> bool:
    """
    Check whether an admin has the requested permission.

    SUPER_ADMIN has access to every admin permission.
    Other admins only have their explicitly assigned permission.
    """
    if not user:
        return False

    if str(getattr(user, "role", "") or "").strip().lower() != "admin":
        return False

    assigned_permission = normalize_admin_permission(
        getattr(user, "admin_permission_role", None)
    )

    required = normalize_requested_permission(required_permission)

    return (
        assigned_permission == "SUPER_ADMIN"
        or assigned_permission == required
    )
