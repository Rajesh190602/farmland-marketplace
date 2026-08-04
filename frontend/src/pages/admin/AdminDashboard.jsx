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
import api from "../../services/api";

function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    total_users: 0,
    total_lands: 0,
    total_farmers: 0,
    total_buyers: 0,
    total_admins: 0,
    total_chats: 0,
    total_notifications: 0,
  });

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get("/admin/dashboard");

      setStats({
        total_users: response.data.total_users || 0,
        total_lands: response.data.total_lands || 0,
        total_farmers: response.data.total_farmers || 0,
        total_buyers: response.data.total_buyers || 0,
        total_admins: response.data.total_admins || 0,
        total_chats: response.data.total_chats || 0,
        total_notifications:
          response.data.total_notifications || 0,
      });
    } catch (error) {
      console.log(error);
      alert("Failed to load Admin Dashboard");
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
          <h1>{stats.total_farmers}</h1>
        </div>

        <div style={cardStyle("#8E24AA")}>
          <FaShoppingCart size={42} color="#8E24AA" />
          <h3>Buyers</h3>
          <h1>{stats.total_buyers}</h1>
        </div>

        <div style={cardStyle("#D81B60")}>
          <FaUserShield size={42} color="#D81B60" />
          <h3>Admins</h3>
          <h1>{stats.total_admins}</h1>
        </div>

        <div style={cardStyle("#00897B")}>
          <FaComments size={42} color="#00897B" />
          <h3>Total Chats</h3>
          <h1>{stats.total_chats}</h1>
        </div>
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
          onClick={() => navigate("/notifications")}
        >
          <FaBell /> Notifications
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
          Recent user registrations, land approvals,
          notifications and reports will appear here.
        </p>
      </div>
    </div>
  );
}

export default AdminDashboard;