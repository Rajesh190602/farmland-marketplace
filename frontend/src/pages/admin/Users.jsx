import { useEffect, useState } from "react";
import {
  FaUsers,
  FaSearch,
  FaSyncAlt,
  FaEye,
  FaUserShield,
  FaUserTie,
  FaShoppingCart,
} from "react-icons/fa";
import api from "../../services/api";

function Users() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const result = users.filter((user) => {
      const keyword = search.toLowerCase();

      return (
        user.full_name?.toLowerCase().includes(keyword) ||
        user.email?.toLowerCase().includes(keyword)
      );
    });

    setFilteredUsers(result);
  }, [search, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const response = await api.get("/admin/users");

      setUsers(response.data);
      setFilteredUsers(response.data);
    } catch (error) {
      console.log(error);
      alert("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "#D81B60";
      case "farmer":
        return "#2E7D32";
      case "buyer":
        return "#1565C0";
      default:
        return "#757575";
    }
  };

  const getRoleIcon = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return <FaUserShield />;
      case "farmer":
        return <FaUserTie />;
      case "buyer":
        return <FaShoppingCart />;
      default:
        return <FaUsers />;
    }
  };

  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          marginTop: "100px",
          fontSize: "24px",
          color: "#2E7D32",
          fontWeight: "bold",
        }}
      >
        Loading Users...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5F7FA",
        padding: "30px",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg,#1565C0,#42A5F5)",
          color: "#fff",
          padding: "25px",
          borderRadius: "18px",
          marginBottom: "30px",
        }}
      >
        <h1 style={{ margin: 0 }}>👥 User Management</h1>

        <p style={{ marginTop: "10px" }}>
          Manage all registered users.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: "20px",
          marginBottom: "30px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "#fff",
            borderRadius: "10px",
            padding: "12px",
            flex: 1,
          }}
        >
          <FaSearch color="#777" />

          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              marginLeft: "10px",
              width: "100%",
              fontSize: "16px",
            }}
          />
        </div>

        <button
          onClick={fetchUsers}
          style={{
            background: "#2E7D32",
            color: "#fff",
            border: "none",
            padding: "12px 20px",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        >
          <FaSyncAlt /> Refresh
        </button>
      </div>

      <h3>Total Users : {filteredUsers.length}</h3>

      {filteredUsers.length === 0 ? (
        <div
          style={{
            background: "#fff",
            padding: "40px",
            borderRadius: "15px",
            textAlign: "center",
            marginTop: "30px",
          }}
        >
          <h2>No Users Found</h2>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(320px,1fr))",
            gap: "20px",
            marginTop: "25px",
          }}
        >
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              style={{
                background: "#fff",
                borderRadius: "18px",
                padding: "20px",
                boxShadow: "0 6px 18px rgba(0,0,0,.10)",
              }}
            >
              <h2>{user.full_name}</h2>

              <p>
                <strong>Email :</strong> {user.email}
              </p>

              <p>
                <strong>Mobile :</strong> {user.mobile}
              </p>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: getRoleColor(user.role),
                  color: "#fff",
                  padding: "8px 14px",
                  borderRadius: "30px",
                  fontWeight: "bold",
                }}
              >
                {getRoleIcon(user.role)}
                {user.role}
              </div>

              <button
                style={{
                  marginTop: "20px",
                  width: "100%",
                  background: "#1976D2",
                  color: "#fff",
                  border: "none",
                  padding: "12px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                <FaEye /> View Details
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Users;