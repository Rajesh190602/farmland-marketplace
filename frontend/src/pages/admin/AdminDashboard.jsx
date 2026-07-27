import { useEffect, useState } from "react";
import api from "../../services/api";

function AdminDashboard() {
  const [stats, setStats] = useState({
    total_users: 0,
    total_lands: 0,
    total_farmers: 0,
    total_buyers: 0,
    total_admins: 0,
  });

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log("Stored Token:", token);

      const response = await api.get("/admin/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setStats(response.data);

    } catch (error) {
  console.log("Status:", error.response?.status);
  console.log("Response:", error.response?.data);
  console.log("Token:", localStorage.getItem("token"));

  alert("Failed to load Admin Dashboard");
}
  };

  const cardStyle = {
    background: "#ffffff",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
    width: "220px",
    textAlign: "center",
  };

  return (
    <div
      style={{
        padding: "40px",
        background: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ color: "#2E7D32" }}>
        👑 Admin Dashboard
      </h1>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          marginTop: "30px",
        }}
      >
        <div style={cardStyle}>
          <h2>👥</h2>
          <h3>Total Users</h3>
          <h1>{stats.total_users}</h1>
        </div>

        <div style={cardStyle}>
          <h2>🌾</h2>
          <h3>Total Lands</h3>
          <h1>{stats.total_lands}</h1>
        </div>

        <div style={cardStyle}>
          <h2>👨‍🌾</h2>
          <h3>Farmers</h3>
          <h1>{stats.total_farmers}</h1>
        </div>

        <div style={cardStyle}>
          <h2>🛒</h2>
          <h3>Buyers</h3>
          <h1>{stats.total_buyers}</h1>
        </div>

        <div style={cardStyle}>
          <h2>👑</h2>
          <h3>Admins</h3>
          <h1>{stats.total_admins}</h1>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;