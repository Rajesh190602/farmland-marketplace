import { Link, Outlet } from "react-router-dom";

function AdminLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <div
        style={{
          width: "250px",
          background: "#1B5E20",
          color: "white",
          padding: "20px",
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
          <Link to="/admin" style={{ color: "white", textDecoration: "none" }}>
            📊 Dashboard
          </Link>

          <Link
            to="/admin/users"
            style={{ color: "white", textDecoration: "none" }}
          >
            👥 Users
          </Link>

          <Link
            to="/admin/lands"
            style={{ color: "white", textDecoration: "none" }}
          >
            🌾 Lands
          </Link>
          <Link
            to="/admin/pending-lands"
            style={{ color: "white", textDecoration: "none" }}
          >

            🟡 Pending Approvals
          </Link>

          <Link
            to="/home"
            style={{ color: "white", textDecoration: "none" }}
          >
            🏠 Home
          </Link>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: "30px",
          background: "#f5f5f5",
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}

export default AdminLayout;