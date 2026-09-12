import { Navigate, useLocation } from "react-router-dom";
import {
  hasAdminPermission,
  getAdminPermission,
} from "../utils/adminPermissions";

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

function normalizePermission(permission) {
  const normalized = String(permission || "")
    .trim()
    .toUpperCase();

  return PERMISSION_ALIASES[normalized] || normalized;
}

function getDefaultAdminPath() {
  const permission = normalizePermission(getAdminPermission());

  switch (permission) {
    case "SUPER_ADMIN":
      return "/admin";

    case "VERIFICATION_ADMIN":
      return "/admin/kyc";

    case "MODERATION_ADMIN":
      return "/admin/lands";

    case "SUPPORT_ADMIN":
      return "/admin/users";

    case "ANALYTICS_ADMIN":
      return "/admin";

    default:
      return "/home";
  }
}

function AdminRoute({ children, requiredPermission }) {
  const location = useLocation();

  const token = sessionStorage.getItem("token");
  const role = String(sessionStorage.getItem("role") || "")
    .trim()
    .toLowerCase();

  // Not logged in
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Logged-in user is not an admin
  if (role !== "admin") {
    return <Navigate to="/home" replace />;
  }

  // Permission-specific protection
  if (
    requiredPermission &&
    !hasAdminPermission(requiredPermission)
  ) {
    const fallback = getDefaultAdminPath();

    if (location.pathname !== fallback) {
      return <Navigate to={fallback} replace />;
    }

    return <Navigate to="/home" replace />;
  }

  return children;
}

export default AdminRoute;