import { Link, Outlet } from "react-router-dom";

function AdminLayout() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
      }}
    >
      {/* Sidebar */}
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
        <h2>👑 Admin Panel</h2>

        <hr />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            marginTop: "20px",
          }}
        >
          {/* Dashboard */}
          <Link
            to="/admin"
            style={{
              color: "white",
              textDecoration: "none",
            }}
          >
            📊 Dashboard
          </Link>

          {/* Users */}
          <Link
            to="/admin/users"
            style={{
              color: "white",
              textDecoration: "none",
            }}
          >
            👥 Users
          </Link>

          {/* Lands */}
          <Link
            to="/admin/lands"
            style={{
              color: "white",
              textDecoration: "none",
            }}
          >
            🌾 Lands
          </Link>

          {/* Pending Approvals */}
          <Link
            to="/admin/pending-lands"
            style={{
              color: "white",
              textDecoration: "none",
            }}
          >
            🟡 Pending Approvals
          </Link>

          {/* Reports */}
          <Link
            to="/admin/reports"
            style={{
              color: "white",
              textDecoration: "none",
            }}
          >
            🚩 Reports
          </Link>

          {/* Activity Logs */}
          <Link
            to="/admin/activity-logs"
            style={{
              color: "white",
              textDecoration: "none",
            }}
          >
            📋 Activity Logs
          </Link>

          {/* Home */}
          <Link
            to="/home"
            style={{
              color: "white",
              textDecoration: "none",
            }}
          >
            🏠 Home
          </Link>
        </div>
      </div>

      {/* Main Content */}
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