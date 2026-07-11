import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <nav
      style={{
        background: "#2E7D32",
        color: "white",
        padding: "15px 30px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <h2>🌾 Farmland Marketplace</h2>

      <div style={{ display: "flex", gap: "15px" }}>
        <Link to="/home" style={{ color: "white", textDecoration: "none" }}>
          Home
        </Link>

        <Link to="/add-land" style={{ color: "white", textDecoration: "none" }}>
          Add Land
        </Link>

        <Link to="/my-lands" style={{ color: "white", textDecoration: "none" }}>
          My Lands
        </Link>

        <Link to="/all-lands" style={{ color: "white", textDecoration: "none" }}>
          Browse
        </Link>

        <button
          onClick={logout}
          style={{
            background: "#C62828",
            color: "white",
            border: "none",
            padding: "8px 15px",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;