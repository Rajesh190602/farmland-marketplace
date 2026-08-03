import {  NavLink, useNavigate } from "react-router-dom";
import { useState,useEffect } from "react";

function Navbar() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");

  const userName = "Farmer";

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };
  const handleSearch = () => {
  if (!search.trim()) {
    navigate("/search");
    return;
  }

  navigate(`/search?district=${encodeURIComponent(search)}`);
};
  return (
  <nav
    style={{
      position: "sticky",
      top: 0,
      zIndex: 999,
      background: "linear-gradient(90deg,#1B5E20,#2E7D32,#388E3C)",
      color: "#fff",
      padding: "12px 24px",
      boxShadow: "0 6px 18px rgba(0,0,0,.18)",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "20px",
      }}
    >
      {/* Logo */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "15px",
        }}
      >
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            background: "rgba(255,255,255,.18)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "clamp(20px,2vw,28px)",
            
          }}
        >
          🌾
        </div>

        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "28px",
            }}
          >
            Farmland Marketplace
          </h2>

          <div
            style={{
              fontSize: "12px",
              opacity: .9,
            }}
          >
            Buy • Sell • Connect
          </div>
        </div>
      </div>

      {/* Search + Menu */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "18px",
          flex: "1 1 400px",
          justifyContent: "center",
        }}
      >
        <input
          type="text"
          placeholder="🔍 Search lands..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {     
              handleSearch();
            }
          }}
          style={{
            padding: "10px 16px",
            borderRadius: "25px",
            border: "none",
            width: "min(250px,100%)",
            outline: "none",
          }}
        />
        <button
          onClick={handleSearch}
           style={{
            background: "#FFD54F",
             color: "#1B5E20",
             border: "none",
             padding: "10px 18px",
             borderRadius: "25px",
             cursor: "pointer",
             fontWeight: "bold",
            }}
          >
             Search
          </button>



        <NavLink to="/home" style={({ isActive }) => ({ ...linkStyle, color: isActive ? "#FFD54F" : "#fff" })}>
          🏠 Home
        </NavLink>

        <NavLink to="/add-land" style={({ isActive }) => ({ ...linkStyle, color: isActive ? "#FFD54F" : "#fff" })}>
          ➕ Add Land
        </NavLink>

        <NavLink to="/my-lands" style={({ isActive }) => ({ ...linkStyle, color: isActive ? "#FFD54F" : "#fff" })}>
          🌾 My Lands
        </NavLink>

        <NavLink to="/all-lands" style={({ isActive }) => ({ ...linkStyle, color: isActive ? "#FFD54F" : "#fff" })}>
          🔍 Browse
        </NavLink>

        <NavLink to="/favorites" style={({ isActive }) => ({ ...linkStyle, color: isActive ? "#FFD54F" : "#fff" })}>
          ❤️ Favorites
        </NavLink>

        <NavLink to="/my-chats" style={({ isActive }) => ({ ...linkStyle, color: isActive ? "#FFD54F" : "#fff" })}>
          💬 Chats
        </NavLink>

        <NavLink to="/notifications" style={({ isActive }) => ({ ...linkStyle, color: isActive ? "#FFD54F" : "#fff" })}>
          🔔 Notifications
        </NavLink>

        <NavLink to="/profile" style={({ isActive }) => ({ ...linkStyle, color: isActive ? "#FFD54F" : "#fff" })}>
          👤 Profile
        </NavLink>
      </div>

      {/* Right Side */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "15px",
          flexWrap: "wrap",
          justifyContent:"flex-end",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(255,255,255,.15)",
            padding: "8px 15px",
            borderRadius: "30px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#FFD54F",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "20px",
            }}
          >
            👤
          </div>

          <div>
            <div style={{ fontSize: "12px" }}>Welcome</div>

            <div style={{ fontWeight: "bold" }}>
              {userName}
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          style={{
            background: "#D32F2F",
            color: "#fff",
            border: "none",
            padding: "12px 20px",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          🚪 Logout
        </button>
      </div>
    </div>
  </nav>
);
}
const linkStyle = {
  color: "#FFFFFF",
  textDecoration: "none",
  fontWeight: "600",
  fontSize: "15px",
  padding: "10px 14px",
  borderRadius: "8px",
  transition: "0.3s",
  whiteSpace: "nowrap",
};
export default Navbar;