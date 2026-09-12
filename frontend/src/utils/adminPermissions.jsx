export const ADMIN_PERMISSIONS = {
  SUPER_ADMIN: "SUPER_ADMIN",
  VERIFICATION_ADMIN: "VERIFICATION_ADMIN",
  MODERATION_ADMIN: "MODERATION_ADMIN",
  SUPPORT_ADMIN: "SUPPORT_ADMIN",
  ANALYTICS_ADMIN: "ANALYTICS_ADMIN",
};

const PERMISSION_ALIASES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  VERIFICATION: "VERIFICATION_ADMIN",
  VERIFICATION_ADMIN: "VERIFICATION_ADMIN",
  MODERATION: "MODERATION_ADMIN",
  MODERATION_ADMIN: "MODERATION_ADMIN",
  SUPPORT: "SUPPORT_ADMIN",
  SUPPORT_ADMIN: "SUPPORT_ADMIN",
  ANALYTICS: "ANALYTICS_ADMIN",
  ANALYTICS_ADMIN: "ANALYTICS_ADMIN",
};

export function normalizeAdminPermission(permission) {
  const normalized = String(permission || "")
    .trim()
    .toUpperCase();

  return PERMISSION_ALIASES[normalized] || normalized;
}

export function getAdminPermission() {
  return normalizeAdminPermission(
    sessionStorage.getItem("admin_permission_role") || ""
  );
}

export function hasAdminPermission(requiredPermission) {
  const currentPermission = getAdminPermission();
  const required = normalizeAdminPermission(requiredPermission);

  if (!currentPermission || !required) {
    return false;
  }

  if (currentPermission === ADMIN_PERMISSIONS.SUPER_ADMIN) {
    return true;
  }

  return currentPermission === required;
}