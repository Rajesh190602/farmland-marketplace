import { Link, Outlet } from "react-router-dom";
import {
  ADMIN_PERMISSIONS,
  hasAdminPermission,
  getAdminPermission,
} from "../utils/adminPermissions";

function AdminLayout() {
  const permission = getAdminPermission();

  const can = (requiredPermission) =>
    hasAdminPermission(requiredPermission);

  const permissionLabel = {
    SUPER_ADMIN: "Super Admin",
    VERIFICATION_ADMIN: "Verification Admin",
    MODERATION_ADMIN: "Moderation Admin",
    SUPPORT_ADMIN: "Support Admin",
    ANALYTICS_ADMIN: "Analytics Admin",
  }[permission] || "Admin";

  const linkStyle = {
    color: "white",
    textDecoration: "none",
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div
        style={{
          width: "250px",
          background: "#1B5E20",
          color: "white",
          padding: "20px",
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        <h2>Admin Panel</h2>

        <div
          style={{
            display: "inline-block",
            padding: "6px 10px",
            marginBottom: "12px",
            borderRadius: "14px",
            background: "rgba(255,255,255,0.16)",
            fontSize: "12px",
            fontWeight: "700",
          }}
        >
          {permissionLabel}
        </div>

        <hr />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            marginTop: "20px",
          }}
        >
          {can(ADMIN_PERMISSIONS.ANALYTICS_ADMIN) && (
            <Link to="/admin" style={linkStyle}>
              Dashboard
            </Link>
          )}

          {can(ADMIN_PERMISSIONS.SUPPORT_ADMIN) && (
            <Link to="/admin/users" style={linkStyle}>
              Users
            </Link>
          )}

          {can(ADMIN_PERMISSIONS.MODERATION_ADMIN) && (
            <>
              <Link to="/admin/lands" style={linkStyle}>
                Lands
              </Link>

              <Link to="/admin/pending-lands" style={linkStyle}>
                Pending Approvals
              </Link>
            </>
          )}

          {can(ADMIN_PERMISSIONS.VERIFICATION_ADMIN) && (
            <>
              <Link to="/admin/land-ownership" style={linkStyle}>
                Land Ownership Verification
              </Link>

              <Link to="/admin/kyc" style={linkStyle}>
                KYC Verification
              </Link>
            </>
          )}

          {can(ADMIN_PERMISSIONS.MODERATION_ADMIN) && (
            <Link to="/admin/reports" style={linkStyle}>
              Reports
            </Link>
          )}

          {can(ADMIN_PERMISSIONS.SUPPORT_ADMIN) && (
            <Link to="/admin/activity-logs" style={linkStyle}>
              Activity Logs
            </Link>
          )}

          {permission === ADMIN_PERMISSIONS.SUPER_ADMIN && (
            <Link to="/admin/permissions" style={linkStyle}>
              Admin Permissions
            </Link>
          )}

          <Link to="/home" style={linkStyle}>
            Home
          </Link>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          padding: "30px",
          background: "#f5f5f5",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}

export default AdminLayout;
