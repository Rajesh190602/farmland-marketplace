import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

function Home() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    total_users: 0,
    total_lands: 0,
    my_lands: 0,
  });

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get("/dashboard");
      setStats(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const cardStyle = {
    background: "white",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
    width: "250px",
    textAlign: "center",
  };

  return (
    <>
      <Navbar />

      <div
        style={{
          padding: "30px",
          background: "#f5f5f5",
          minHeight: "100vh",
        }}
      >
        <h1 style={{ color: "#2E7D32" }}>
          🌾 Farmland Marketplace Dashboard
        </h1>

        <div
          style={{
            display: "flex",
            gap: "20px",
            flexWrap: "wrap",
            marginTop: "30px",
            marginBottom: "40px",
          }}
        >
          <div style={cardStyle}>
            <h2>👨‍🌾</h2>
            <h3>Total Farmers</h3>
            <h1>{stats.total_users}</h1>
          </div>

          <div style={cardStyle}>
            <h2>🌾</h2>
            <h3>Total Lands</h3>
            <h1>{stats.total_lands}</h1>
          </div>

          <div style={cardStyle}>
            <h2>📍</h2>
            <h3>My Lands</h3>
            <h1>{stats.my_lands}</h1>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => navigate("/add-land")}
            style={{
              padding: "15px 30px",
              background: "#2E7D32",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            ➕ Add Land
          </button>

          <button
            onClick={() => navigate("/my-lands")}
            style={{
              padding: "15px 30px",
              background: "#1565C0",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            🌾 My Lands
          </button>

          <button
            onClick={() => navigate("/all-lands")}
            style={{
              padding: "15px 30px",
              background: "#EF6C00",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            🔍 Browse Lands
          </button>
        </div>
      </div>
    </>
  );
}

export default Home;