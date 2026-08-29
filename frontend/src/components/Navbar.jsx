import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { FaBars, FaTimes } from "react-icons/fa";

function Navbar() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    window.innerWidth <= 1200
  );

  // =====================================================
  // USER DETAILS
  // =====================================================

  const userName =
    sessionStorage.getItem("full_name") || "Farmer";

  const storedUser = (() => {
    try {
      return JSON.parse(
        localStorage.getItem("user") || "{}"
      );
    } catch {
      return {};
    }
  })();

  const userRole = (
    sessionStorage.getItem("role") ||
    storedUser.role ||
    ""
  )
    .trim()
    .toLowerCase();

  // =====================================================
  // RESPONSIVE NAVBAR
  // =====================================================

  useEffect(() => {
    const handleResize = () => {
      console.log("Screen Width:", window.innerWidth);

      setIsMobile(window.innerWidth <= 1200);

      if (window.innerWidth > 1200) {
        setMenuOpen(false);
      }
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () =>
      window.removeEventListener(
        "resize",
        handleResize
      );
  }, []);

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user_id");
    sessionStorage.removeItem("full_name");
    sessionStorage.removeItem("role");

    localStorage.removeItem("token");

    navigate("/");
  };

  // =====================================================
  // SEARCH
  // Buyers/Admins ONLY
  // =====================================================

  const handleSearch = () => {
    // Farmers are not allowed to search other farmers' lands.
    if (userRole === "farmer") {
      return;
    }

    if (!search.trim()) {
      navigate("/search");

      if (isMobile) {
        setMenuOpen(false);
      }

      return;
    }

    navigate(
      `/search?district=${encodeURIComponent(search)}`
    );

    if (isMobile) {
      setMenuOpen(false);
    }
  };

  // =====================================================
  // NAVIGATION LINK STYLE
  // =====================================================

  const desktopLinkStyle = ({ isActive }) => ({
    ...linkStyle,
    color: isActive ? "#FFD54F" : "#fff",
  });

  // =====================================================
  // RENDER
  // =====================================================

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
        {/* =================================================
            TOP NAVBAR
        ================================================= */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 22px",
          }}
        >
          {/* =================================================
              LOGO
          ================================================= */}

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
                  opacity: 0.85,
                }}
              >
                Buy • Sell • Connect
              </div>
            </div>
          </div>

          {/* =================================================
              DESKTOP NAVIGATION
          ================================================= */}

          {!isMobile && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "18px",
              }}
            >

              {/* =================================================
                  SEARCH
                  IMPORTANT:
                  Farmers DO NOT see this.
              ================================================= */}

              {userRole !== "farmer" && (
                <>
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
                </>
              )}

              {/* HOME */}

              <NavLink
                to="/home"
                style={desktopLinkStyle}
              >
                🏠 Home
              </NavLink>

              {/* ADD LAND */}

              <NavLink
                to="/add-land"
                style={desktopLinkStyle}
              >
                ➕ Add Land
              </NavLink>

              {/* MY LANDS */}

              <NavLink
                to="/my-lands"
                style={desktopLinkStyle}
              >
                🌾 My Lands
              </NavLink>

              {/* =================================================
                  BROWSE
                  Farmers cannot access Browse.
              ================================================= */}

              <NavLink
                to={
                  userRole === "farmer"
                    ? "/home"
                    : "/all-lands"
                }
                onClick={(e) => {
                  if (userRole === "farmer") {
                    e.preventDefault();
                  }
                }}
                aria-disabled={
                  userRole === "farmer"
                }
                style={({ isActive }) => ({
                  ...linkStyle,
                  color: isActive
                    ? "#FFD54F"
                    : "#fff",
                  opacity:
                    userRole === "farmer"
                      ? 0.55
                      : 1,
                  cursor:
                    userRole === "farmer"
                      ? "not-allowed"
                      : "pointer",
                })}
              >
                🔍 Browse
              </NavLink>

              {/* FAVORITES */}

              <NavLink
                to="/favorites"
                style={desktopLinkStyle}
              >
                ❤️ Favorites
              </NavLink>

              {/* CHATS */}

              <NavLink
                to="/my-chats"
                style={desktopLinkStyle}
              >
                💬 Chats
              </NavLink>

              {/* NOTIFICATIONS */}

              <NavLink
                to="/notifications"
                style={desktopLinkStyle}
              >
                🔔 Notifications
              </NavLink>

              {/* PROFILE */}

              <NavLink
                to="/profile"
                style={desktopLinkStyle}
              >
                👤 Profile
              </NavLink>

              {/* =================================================
                  USER + LOGOUT
              ================================================= */}

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
                    background:
                      "rgba(255,255,255,.15)",
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

          {/* =================================================
              MOBILE HAMBURGER
              PRESERVED
          ================================================= */}

          {isMobile && (
            <button
              onClick={() =>
                setMenuOpen(!menuOpen)
              }
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: "30px",
                cursor: "pointer",
              }}
            >
              {menuOpen ? (
                <FaTimes />
              ) : (
                <FaBars />
              )}
            </button>
          )}
        </div>

        {/* =================================================
            MOBILE MENU
        ================================================= */}

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

            {/* =================================================
                MOBILE SEARCH
                Farmers DO NOT SEE IT.
            ================================================= */}

            {userRole !== "farmer" && (
              <>
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
              </>
            )}

            {/* HOME */}

            <NavLink
              to="/home"
              style={mobileLinkStyle}
              onClick={() =>
                setMenuOpen(false)
              }
            >
              🏠 Home
            </NavLink>

            {/* ADD LAND */}

            <NavLink
              to="/add-land"
              style={mobileLinkStyle}
              onClick={() =>
                setMenuOpen(false)
              }
            >
              ➕ Add Land
            </NavLink>

            {/* MY LANDS */}

            <NavLink
              to="/my-lands"
              style={mobileLinkStyle}
              onClick={() =>
                setMenuOpen(false)
              }
            >
              🌾 My Lands
            </NavLink>

            {/* =================================================
                BROWSE
                Farmers cannot access.
            ================================================= */}

            <NavLink
              to={
                userRole === "farmer"
                  ? "/home"
                  : "/all-lands"
              }
              onClick={(e) => {
                if (userRole === "farmer") {
                  e.preventDefault();
                  return;
                }

                setMenuOpen(false);
              }}
              aria-disabled={
                userRole === "farmer"
              }
              style={() => ({
                ...mobileLinkStyle({
                  isActive: false,
                }),
                opacity:
                  userRole === "farmer"
                    ? 0.55
                    : 1,
                cursor:
                  userRole === "farmer"
                    ? "not-allowed"
                    : "pointer",
              })}
            >
              🔍 Browse
            </NavLink>

            {/* FAVORITES */}

            <NavLink
              to="/favorites"
              style={mobileLinkStyle}
              onClick={() =>
                setMenuOpen(false)
              }
            >
              ❤️ Favorites
            </NavLink>

            {/* CHATS */}

            <NavLink
              to="/my-chats"
              style={mobileLinkStyle}
              onClick={() =>
                setMenuOpen(false)
              }
            >
              💬 Chats
            </NavLink>

            {/* NOTIFICATIONS */}

            <NavLink
              to="/notifications"
              style={mobileLinkStyle}
              onClick={() =>
                setMenuOpen(false)
              }
            >
              🔔 Notifications
            </NavLink>

            {/* PROFILE */}

            <NavLink
              to="/profile"
              style={mobileLinkStyle}
              onClick={() =>
                setMenuOpen(false)
              }
            >
              👤 Profile
            </NavLink>

            {/* LOGOUT */}

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

// =====================================================
// DESKTOP LINK STYLE
// =====================================================

const linkStyle = {
  color: "#fff",
  textDecoration: "none",
  fontWeight: "600",
  fontSize: "15px",
  transition: ".3s",
};

// =====================================================
// MOBILE LINK STYLE
// =====================================================

const mobileLinkStyle = ({ isActive }) => ({
  color: isActive ? "#FFD54F" : "#fff",
  textDecoration: "none",
  fontWeight: "600",
  fontSize: "18px",
});

export default Navbar;