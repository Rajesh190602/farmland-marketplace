import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUsers,
  FaSeedling,
  FaUserTie,
  FaShoppingCart,
  FaUserShield,
  FaComments,
  FaBell,
  FaUserCog,
  FaMapMarkedAlt,
} from "react-icons/fa";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import api from "../../services/api";

function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    total_users: 0,
    farmers: 0,
    buyers: 0,
    admins: 0,
    total_lands: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    changes_requested: 0,
    total_chats: 0,
  });

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get("/admin/analytics");

      setStats({
        total_users: response.data.total_users || 0,
        farmers: response.data.farmers || 0,
        buyers: response.data.buyers || 0,
        admins: response.data.admins || 0,
        total_lands: response.data.total_lands || 0,
        pending: response.data.pending || 0,
        approved: response.data.approved || 0,
        rejected: response.data.rejected || 0,
        changes_requested: response.data.changes_requested || 0,
        total_chats: response.data.total_chats || 0,
      });
    } catch (error) {
      console.log(error);
      alert("Failed to load Admin Dashboard");
    }
  };

  // Download Excel Reports
  const downloadReport = async (type) => {
    try {
      const token = localStorage.getItem("token");

      const response = await api.get(`/reports/${type}`, {
        responseType: "blob",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const url = window.URL.createObjectURL(
        new Blob([response.data])
      );

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${type}.xlsx`);

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.log(error);
      alert("Failed to download report.");
    }
  };

  const cardStyle = (color) => ({
    background: "#fff",
    borderRadius: "18px",
    padding: "25px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
    textAlign: "center",
    borderTop: `6px solid ${color}`,
    minWidth: "220px",
    flex: "1",
  });

  const actionButton = (color) => ({
    background: color,
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "15px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    width: "250px",
  });

  const chartData = [
    { name: "Pending", value: stats.pending },
    { name: "Approved", value: stats.approved },
    { name: "Rejected", value: stats.rejected },
    { name: "Changes Requested", value: stats.changes_requested },
  ];

  const barData = [
    { name: "Users", value: stats.total_users },
    { name: "Farmers", value: stats.farmers },
    { name: "Buyers", value: stats.buyers },
    { name: "Admins", value: stats.admins },
    { name: "Lands", value: stats.total_lands },
  ];

  const COLORS = [
    "#F9A825",
    "#43A047",
    "#E53935",
    "#FB8C00",
  ];

  return (
    <div
  style={{
    minHeight: "100vh",
    background: "#F5F7FA",
    padding: "30px",
  }}
>
  {/* Header */}

  <div
    style={{
      background:
        "linear-gradient(135deg,#1B5E20,#43A047)",
      color: "#fff",
      borderRadius: "20px",
      padding: "30px",
      marginBottom: "35px",
    }}
  >
    <h1
      style={{
        margin: 0,
      }}
    >
      👑 Admin Dashboard
    </h1>

    <p
      style={{
        marginTop: "10px",
        fontSize: "17px",
      }}
    >
      Monitor users, lands and marketplace
      activities.
    </p>
  </div>

  {/* Dashboard Cards */}

  <h2
    style={{
      color: "#2E7D32",
      marginBottom: "20px",
    }}
  >
    Dashboard Overview
  </h2>

  <div
    style={{
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit,minmax(220px,1fr))",
      gap: "20px",
    }}
  >
    <div style={cardStyle("#1565C0")}>
      <FaUsers size={42} color="#1565C0" />
      <h3>Total Users</h3>
      <h1>{stats.total_users}</h1>
    </div>

    <div style={cardStyle("#2E7D32")}>
      <FaSeedling size={42} color="#2E7D32" />
      <h3>Total Lands</h3>
      <h1>{stats.total_lands}</h1>
    </div>

    <div style={cardStyle("#EF6C00")}>
      <FaUserTie size={42} color="#EF6C00" />
      <h3>Farmers</h3>
      <h1>{stats.farmers}</h1>
    </div>

    <div style={cardStyle("#8E24AA")}>
      <FaShoppingCart size={42} color="#8E24AA" />
      <h3>Buyers</h3>
      <h1>{stats.buyers}</h1>
    </div>

    <div style={cardStyle("#D81B60")}>
      <FaUserShield size={42} color="#D81B60" />
      <h3>Admins</h3>
      <h1>{stats.admins}</h1>
    </div>

    <div style={cardStyle("#F9A825")}>
      <h3>🟡 Pending</h3>
      <h1>{stats.pending}</h1>
    </div>

    <div style={cardStyle("#43A047")}>
      <h3>✅ Approved</h3>
      <h1>{stats.approved}</h1>
    </div>

    <div style={cardStyle("#E53935")}>
      <h3>❌ Rejected</h3>
      <h1>{stats.rejected}</h1>
    </div>

    <div style={cardStyle("#FB8C00")}>
      <h3>📝 Changes Requested</h3>
      <h1>{stats.changes_requested}</h1>
    </div>

    <div style={cardStyle("#00897B")}>
      <FaComments size={42} color="#00897B" />
      <h3>Total Chats</h3>
      <h1>{stats.total_chats}</h1>
    </div>
  </div>

  {/* Charts */}

  <div
    style={{
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit,minmax(450px,1fr))",
      gap: "30px",
      marginTop: "40px",
    }}
  >
    {/* Pie Chart */}

    <div
      style={{
        background: "#fff",
        padding: "25px",
        borderRadius: "18px",
        boxShadow: "0 6px 18px rgba(0,0,0,0.10)",
      }}
    >
      <h3
        style={{
          textAlign: "center",
          color: "#2E7D32",
        }}
      >
        🥧 Land Status Overview
      </h3>

      <ResponsiveContainer
        width="100%"
        height={320}
      >
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            outerRadius={110}
            label
          >
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={
                  COLORS[index % COLORS.length]
                }
              />
            ))}
          </Pie>

          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>

    {/* Bar Chart */}

    <div
      style={{
        background: "#fff",
        padding: "25px",
        borderRadius: "18px",
        boxShadow: "0 6px 18px rgba(0,0,0,0.10)",
      }}
    >
      <h3
        style={{
          textAlign: "center",
          color: "#2E7D32",
        }}
      >
        📊 Marketplace Statistics
      </h3>

      <ResponsiveContainer
        width="100%"
        height={320}
      >
        <BarChart data={barData}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="name" />

          <YAxis />

          <Tooltip />

          <Legend />

          <Bar
            dataKey="value"
            fill="#2E7D32"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
    {/* Reports */}

  <h2
    style={{
      color: "#2E7D32",
      marginTop: "50px",
    }}
  >
    📄 Reports
  </h2>

  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "20px",
      marginTop: "20px",
    }}
  >
    <button
      style={actionButton("#1565C0")}
      onClick={() => downloadReport("users")}
    >
      👥 Export Users
    </button>

    <button
      style={actionButton("#2E7D32")}
      onClick={() => downloadReport("lands")}
    >
      🌾 Export Lands
    </button>

    <button
      style={actionButton("#F9A825")}
      onClick={() => downloadReport("pending-lands")}
    >
      🟡 Export Pending Lands
    </button>

    <button
      style={actionButton("#43A047")}
      onClick={() => downloadReport("approved-lands")}
    >
      ✅ Export Approved Lands
    </button>
  </div>

  {/* Quick Actions */}

  <h2
    style={{
      color: "#2E7D32",
      marginTop: "50px",
    }}
  >
    Quick Actions
  </h2>

  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "20px",
      marginTop: "20px",
    }}
  >
    <button
      style={actionButton("#1976D2")}
      onClick={() => navigate("/admin/users")}
    >
      <FaUserCog /> Manage Users
    </button>

    <button
      style={actionButton("#2E7D32")}
      onClick={() => navigate("/admin/lands")}
    >
      <FaMapMarkedAlt /> Manage Lands
    </button>

    <button
      style={actionButton("#F9A825")}
      onClick={() => navigate("/admin/pending-lands")}
    >
      <FaBell /> Pending Approvals
    </button>
  </div>

  {/* Recent Activity */}

  <div
    style={{
      marginTop: "60px",
      background: "#fff",
      borderRadius: "18px",
      padding: "30px",
      boxShadow: "0 6px 18px rgba(0,0,0,0.10)",
    }}
  >
    <h2
      style={{
        color: "#2E7D32",
      }}
    >
      📈 Recent Activity
    </h2>

    <p
      style={{
        marginTop: "20px",
        color: "#666",
        fontSize: "16px",
      }}
    >
      Export reports, manage users, approve lands,
      and monitor marketplace activities from this
      dashboard.
    </p>
  </div>

</div>
  );
}

export default AdminDashboard;