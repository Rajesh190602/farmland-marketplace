import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaUserShield,
  FaSeedling,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import api from "../../services/api";

function UserDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
      setLoading(true);

      const response = await api.get(`/admin/users/${id}`);

      setUser(response.data);
    } catch (error) {
      console.error(error);
      alert("Failed to load user details.");
    } finally {
      setLoading(false);
    }
  };
const deleteUser = async () => {
  const confirmDelete = window.confirm(
    "Are you sure you want to delete this user?"
  );

  if (!confirmDelete) return;

  try {
    await api.delete(`/admin/users/${id}`);

    alert("User deleted successfully.");

    navigate("/admin/users");
  } catch (error) {
    console.log(error);

    alert("Failed to delete user.");
  }
};
  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          marginTop: "100px",
          fontSize: "24px",
          fontWeight: "bold",
          color: "#2E7D32",
        }}
      >
        Loading User Details...
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          textAlign: "center",
          marginTop: "100px",
        }}
      >
        User not found.
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "700px",
        margin: "40px auto",
        background: "#fff",
        padding: "30px",
        borderRadius: "15px",
        boxShadow: "0 5px 15px rgba(0,0,0,0.15)",
      }}
    >
      <button
        onClick={() => navigate("/admin/users")}
        style={{
          marginBottom: "20px",
          background: "#1976D2",
          color: "#fff",
          border: "none",
          padding: "10px 20px",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        <FaArrowLeft /> Back
      </button>

      <h1 style={{ color: "#2E7D32" }}>
        👤 User Details
      </h1>

      <hr />

      <p>
        <FaUser /> <strong>Name:</strong> {user.full_name}
      </p>

      <p>
        <FaEnvelope /> <strong>Email:</strong> {user.email}
      </p>

      <p>
        <FaPhone /> <strong>Mobile:</strong> {user.mobile}
      </p>

      <p>
        <FaUserShield /> <strong>Role:</strong> {user.role}
      </p>

      <p>
        <FaSeedling /> <strong>Total Lands:</strong> {user.total_lands}
      </p>

      <div
        style={{
          display: "flex",
          gap: "15px",
          marginTop: "30px",
        }}
      >
        <button
          onClick={() => navigate(`/admin/users/edit/${id}`)}
          style={{
            flex: 1,
            background: "#F9A825",
            color: "#fff",
            border: "none",
            padding: "12px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          <FaEdit /> Edit User
        </button>

        <button
          onClick={deleteUser}
          style={{
            flex: 1,
            background: "#D32F2F",
            color: "#fff",
            border: "none",
            padding: "12px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          <FaTrash /> Delete User
        </button>
      </div>
    </div>
  );
}

export default UserDetails;