import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import api from "../services/api";

function Navbar() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1200);
  const [unreadCount, setUnreadCount] = useState(0);

  const userName = "Farmer";

useEffect(() => {
  const handleResize = () => {
  console.log("Screen Width:", window.innerWidth);

    setIsMobile(window.innerWidth <= 1200);

    if (window.innerWidth > 1200) {
      setMenuOpen(false);
    }
  };

  handleResize();
  fetchUnreadCount();
  const interval = setInterval(() => {
    fetchUnreadCount();
  }, 30000);

  window.addEventListener("resize", handleResize);
  return () => {

    window.removeEventListener("resize", handleResize);
    clearInterval(interval);
  };
}, []);
useEffect(() => {
  const handleNotificationsUpdated = () => {
    fetchUnreadCount();
  };

  window.addEventListener(
    "notificationsUpdated",
    handleNotificationsUpdated
  );

  return () => {
    window.removeEventListener(
      "notificationsUpdated",
      handleNotificationsUpdated
    );
  };
}, []);
const fetchUnreadCount = async () => {
  try {
    const response = await api.get("/notifications/unread-count");
    setUnreadCount(response.data.unread_count);
  } catch (error) {
    console.log(error);
  }
};
  const logout = () => {
   sessionStorage.removeItem("token");
    navigate("/");
  };

  const handleSearch = () => {
    if (!search.trim()) {
      navigate("/search");
      return;
    }

    navigate(
      `/search?district=${encodeURIComponent(search)}`
    );

    if (isMobile) {
      setMenuOpen(false);
    }
  };

  return (
    <>
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 999,
          width: "100%",
          background:
            "linear-gradient(90deg,#1B5E20,#2E7D32,#388E3C)",
          boxShadow: "0 6px 18px rgba(0,0,0,.18)",
        }}
      >
        {/* Top Navbar */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 22px",
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
                fontSize: "28px",
              }}
            >
              🌾
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#fff",
                  fontSize: "26px",
                }}
              >
                Farmland Marketplace
              </h2>

              <div
                style={{
                  color: "#fff",
                  fontSize: "12px",
                  opacity: .85,
                }}
              >
                Buy • Sell • Connect
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}

          {!isMobile && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "18px",
              }}
            >
              <input
                type="text"
                placeholder="🔍 Search lands..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: "25px",
                  border: "none",
                  width: "220px",
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
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  })}
>
  <span>🔔 Notifications</span>

  {unreadCount > 0 && (
    <span
      style={{
        background: "#D32F2F",
        color: "#fff",
        borderRadius: "50%",
        minWidth: "22px",
        height: "22px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: "12px",
        fontWeight: "bold",
      }}
    >
      {unreadCount}
    </span>
  )}
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
                  gap: "12px",
                  marginLeft: "10px",
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
                    color: "#fff",
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
                    }}
                  >
                    👤
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                      }}
                    >
                      Welcome
                    </div>

                    <div
                      style={{
                        fontWeight: "bold",
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
                    padding: "10px 18px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          )}

          {/* Mobile Hamburger */}

          {isMobile && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: "30px",
                cursor: "pointer",
              }}
            >
              {menuOpen ? <FaTimes /> : <FaBars />}
            </button>
          )}
        </div>

        {/* Mobile Menu */}

        {isMobile && menuOpen && (
          <div
            style={{
              background: "#2E7D32",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <input
              type="text"
              placeholder="🔍 Search lands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "12px",
                borderRadius: "8px",
                border: "none",
              }}
            />

            <button
              onClick={handleSearch}
              style={{
                background: "#FFD54F",
                color: "#1B5E20",
                border: "none",
                padding: "12px",
                borderRadius: "8px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Search
            </button>

            <NavLink to="/home" style={mobileLinkStyle}>🏠 Home</NavLink>
            <NavLink to="/add-land" style={mobileLinkStyle}>➕ Add Land</NavLink>
            <NavLink to="/my-lands" style={mobileLinkStyle}>🌾 My Lands</NavLink>
            <NavLink to="/all-lands" style={mobileLinkStyle}>🔍 Browse</NavLink>
            <NavLink to="/favorites" style={mobileLinkStyle}>❤️ Favorites</NavLink>
            <NavLink to="/my-chats" style={mobileLinkStyle}>💬 Chats</NavLink>
            <NavLink
  to="/notifications"
  style={mobileLinkStyle}
>
  🔔 Notifications
  {unreadCount > 0 && (
    <span
      style={{
        marginLeft: "10px",
        background: "#D32F2F",
        color: "#fff",
        borderRadius: "50%",
        padding: "2px 8px",
        fontSize: "12px",
        fontWeight: "bold",
      }}
    >
      {unreadCount}
    </span>
  )}
</NavLink>
           <NavLink to="/profile" style={mobileLinkStyle}>👤 Profile</NavLink>

            <button
              onClick={logout}
              style={{
                background: "#D32F2F",
                color: "#fff",
                border: "none",
                padding: "12px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              🚪 Logout
            </button>
          </div>
        )}
      </nav>
    </>
  );
}

const linkStyle = {
  color: "#fff",
  textDecoration: "none",
  fontWeight: "600",
  fontSize: "15px",
  transition: ".3s",
};

const mobileLinkStyle = ({ isActive }) => ({
  color: isActive ? "#FFD54F" : "#fff",
  textDecoration: "none",
  fontWeight: "600",
  fontSize: "18px",
});

export default Navbar;
