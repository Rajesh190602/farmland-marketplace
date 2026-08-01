import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";

function Navbar() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");

  const userName = "Farmer";

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };
  return (
  <nav
    style={{
      position: "sticky",
      top: 0,
      zIndex: 999,
      background: "linear-gradient(90deg,#1B5E20,#2E7D32,#388E3C)",
      color: "#fff",
      padding: "14px 30px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      boxShadow: "0 6px 18px rgba(0,0,0,.18)",
    }}
  >


 
      <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "15px",
  }}
>
  <div
    style={{
      width: "50px",
      height: "50px",
      borderRadius: "50%",
      background: "rgba(255,255,255,.18)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontSize: "26px",
    }}
  >
    🌾
  </div>

  <div>
    <h2
      style={{
        margin: 0,
        fontSize: "24px",
      }}
    >
      Farmland Marketplace
    </h2>

    <div
      style={{
        fontSize: "12px",
        opacity: ".9",
      }}
    >
      Buy • Sell • Connect
    </div>
  </div>
</div>

      <div
        style={{
          display: "flex",
          gap: "18px",
          alignItems: "center",
        }}
      >
        <input
  type="text"
  placeholder="🔍 Search lands..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  style={{
    padding: "10px 15px",
    borderRadius: "25px",
    border: "none",
    outline: "none",
    width: "220px",
    fontSize: "14px",
  }}
/>

<NavLink
  to="/home"
  style={({ isActive }) => ({
    ...linkStyle,
    color: isActive ? "#FFD54F" : "#fff",
  })}
>
  🏠 Home
</NavLink>

<NavLink
  to="/add-land"
  style={({ isActive }) => ({
    ...linkStyle,
    color: isActive ? "#FFD54F" : "#fff",
  })}
>
  ➕ Add Land
</NavLink>

<NavLink
  to="/my-lands"
  style={({ isActive }) => ({
    ...linkStyle,
    color: isActive ? "#FFD54F" : "#fff",
  })}
>
  🌾 My Lands
</NavLink>

<NavLink
  to="/all-lands"
  style={({ isActive }) => ({
    ...linkStyle,
    color: isActive ? "#FFD54F" : "#fff",
  })}
>
  🔍 Browse
</NavLink>

<NavLink
  to="/favorites"
  style={({ isActive }) => ({
    ...linkStyle,
    color: isActive ? "#FFD54F" : "#fff",
  })}
>
  ❤️ Favorites
</NavLink>

<NavLink
  to="/my-chats"
  style={({ isActive }) => ({
    ...linkStyle,
    color: isActive ? "#FFD54F" : "#fff",
  })}
>
  💬 Chats
</NavLink>

<NavLink
  to="/notifications"
  style={({ isActive }) => ({
    ...linkStyle,
    color: isActive ? "#FFD54F" : "#fff",
  })}
>
  🔔 Notifications
</NavLink>

<NavLink
  to="/profile"
  style={({ isActive }) => ({
    ...linkStyle,
    color: isActive ? "#FFD54F" : "#fff",
  })}
>
  👤 Profile
</NavLink>

        <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "15px",
  }}
>
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      background: "rgba(255,255,255,.15)",
      padding: "8px 14px",
      borderRadius: "30px",
    }}
  >
    <div
      style={{
        width: "38px",
        height: "38px",
        borderRadius: "50%",
        background: "#FFD54F",
        color: "#1B5E20",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontWeight: "bold",
        fontSize: "18px",
      }}
    >
      👤
    </div>

    <div>
      <div
        style={{
          fontSize: "12px",
          opacity: 0.8,
        }}
      >
        Welcome
      </div>

      <div
        style={{
          fontWeight: "bold",
          fontSize: "14px",
        }}
      >
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
      transition: "0.3s",
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
  transition: "all .3s ease",
  whiteSpace: "nowrap",
};


export default Navbar;