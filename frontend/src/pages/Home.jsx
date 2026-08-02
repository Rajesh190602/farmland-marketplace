import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUsers,
  FaSeedling,
  FaMapMarkedAlt,
  FaHeart,
  FaPlusCircle,
  FaSearch,
  FaUserCircle,
  FaComments,
  FaBell,
} from "react-icons/fa";

import Navbar from "../components/Navbar";
import api from "../services/api";

function Home() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    total_users: 0,
    total_lands: 0,
    my_lands: 0,
    favorites: 0,
    chats: 0,
    notifications: 0,
  });

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get("/dashboard");

      setStats({
        total_users: response.data.total_users || 0,
        total_lands: response.data.total_lands || 0,
        my_lands: response.data.my_lands || 0,
        favorites: response.data.favorites || 0,
        chats: response.data.chats || 0,
        notifications: response.data.notifications || 0,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const cardStyle = {
    background: "#fff",
    borderRadius: "15px",
    padding: "25px",
    boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
    textAlign: "center",
    flex: "1",
    minWidth: "180px",
  };

  const quickButton = (color) => ({
    background: color,
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "15px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    width: "100%",
    maxWidth: "280px",
    
  });

  return (
    <>
      <Navbar />

      <div
        style={{
          minHeight: "100vh",
          background: "#F5F7FA",
          padding: "25px",
        }}
      >
        {/* Welcome */}

        <div
          style={{
            background:
              "linear-gradient(135deg,#2E7D32,#43A047)",
            color: "#fff",
            borderRadius: "20px",
            padding: "24px",
            marginBottom: "35px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize:"clamp(28px, 5vw, 38px)" ,
            }}
          >
            🌾 Farmland Marketplace
          </h1>

          <h2
            style={{
              marginTop: "15px",
            }}
          >
            Welcome Back 👋
          </h2>

          <p
            style={{
              fontSize: "clamp(15px, 2.5vw, 18px)",
              marginTop: "10px",
            }}
          >
            Manage your farmland, connect with buyers,
            and grow your farming business.
          </p>
        </div>

        {/* Statistics */}

        <h2
          style={{
            marginBottom: "20px",
            color: "#2E7D32",
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
          <div style={cardStyle}>
            <FaUsers
              size={42}
              color="#1565C0"
            />
            <h3>Total Farmers</h3>
            <h1>{stats.total_users}</h1>
          </div>

          <div style={cardStyle}>
            <FaSeedling
              size={42}
              color="#2E7D32"
            />
            <h3>Total Lands</h3>
            <h1>{stats.total_lands}</h1>
          </div>

          <div style={cardStyle}>
            <FaMapMarkedAlt
              size={42}
              color="#EF6C00"
            />
            <h3>My Lands</h3>
            <h1>{stats.my_lands}</h1>
          </div>

          <div style={cardStyle}>
            <FaHeart
              size={42}
              color="#D81B60"
            />
            <h3>Favorites</h3>
            <h1>{stats.favorites}</h1>
          </div>

          <div style={cardStyle}>
            <FaComments
              size={42}
              color="#6A1B9A"
            />
            <h3>Chats</h3>
            <h1>{stats.chats}</h1>
          </div>

          <div style={cardStyle}>
            <FaBell
              size={42}
              color="#F9A825"
            />
            <h3>Notifications</h3>
            <h1>{stats.notifications}</h1>
          </div>
        </div>

        {/* Quick Actions */}

        <h2
          style={{
            marginTop: "50px",
            color: "#2E7D32",
          }}
        >
          Quick Actions
        </h2>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
             justifyContent: "center",
            gap: "20px",
            marginTop: "25px",
          }}
        >
          <button
            style={quickButton("#2E7D32")}
            onClick={() => navigate("/add-land")}
          >
            <FaPlusCircle /> Add Land
          </button>

          <button
            style={quickButton("#1565C0")}
            onClick={() => navigate("/my-lands")}
          >
            <FaMapMarkedAlt /> My Lands
          </button>

          <button
            style={quickButton("#EF6C00")}
            onClick={() => navigate("/all-lands")}
          >
            <FaSearch /> Browse Lands
          </button>

          <button
            style={quickButton("#6A1B9A")}
            onClick={() => navigate("/profile")}
          >
            <FaUserCircle /> My Profile
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
            🌱 Recent Activity
          </h2>

          <p
            style={{
              color: "#666",
              marginTop: "20px",
            }}
          >
            Recent land listings, buyer inquiries,
            notifications, and chat updates will appear
            here.
          </p>
        </div>
      </div>
    </>
  );
}

export default Home;