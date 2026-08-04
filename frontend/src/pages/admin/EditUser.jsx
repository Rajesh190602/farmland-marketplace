import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";

function EditUser() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    mobile: "",
    role: "",
  });

  useEffect(() => {
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
      setLoading(true);

      const response = await api.get(`/admin/users/${id}`);

      setForm({
        full_name: response.data.full_name || "",
        email: response.data.email || "",
        mobile: response.data.mobile || "",
        role: response.data.role || "",
      });
    } catch (error) {
      console.log(error);
      alert("Failed to load user.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const saveUser = async () => {
    try {
      setSaving(true);

      await api.put(`/admin/users/${id}`, form);

      alert("User updated successfully.");

      navigate(`/admin/users/${id}`);
    } catch (error) {
      console.log(error);
      alert("Failed to update user.");
    } finally {
      setSaving(false);
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
        Loading User...
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
      <h1
        style={{
          color: "#2E7D32",
          marginBottom: "25px",
        }}
      >
        ✏️ Edit User
      </h1>

      <div style={{ marginBottom: "18px" }}>
        <label><strong>Full Name</strong></label>

        <input
          type="text"
          name="full_name"
          value={form.full_name}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "8px",
            borderRadius: "8px",
            border: "1px solid #ccc",
          }}
        />
      </div>

      <div style={{ marginBottom: "18px" }}>
        <label><strong>Email</strong></label>

        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "8px",
            borderRadius: "8px",
            border: "1px solid #ccc",
          }}
        />
      </div>

      <div style={{ marginBottom: "18px" }}>
        <label><strong>Mobile</strong></label>

        <input
          type="text"
          name="mobile"
          value={form.mobile}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "8px",
            borderRadius: "8px",
            border: "1px solid #ccc",
          }}
        />
      </div>

      <div style={{ marginBottom: "25px" }}>
        <label><strong>Role</strong></label>

        <select
          name="role"
          value={form.role}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "8px",
            borderRadius: "8px",
            border: "1px solid #ccc",
          }}
        >
          <option value="admin">Admin</option>
          <option value="farmer">Farmer</option>
          <option value="buyer">Buyer</option>
        </select>
      </div>
            <div
        style={{
          display: "flex",
          gap: "15px",
        }}
      >
        <button
          onClick={saveUser}
          disabled={saving}
          style={{
            flex: 1,
            padding: "14px",
            background: "#2E7D32",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: saving ? "not-allowed" : "pointer",
            fontWeight: "bold",
            fontSize: "16px",
          }}
        >
          {saving ? "Saving..." : "💾 Save Changes"}
        </button>

        <button
          onClick={() => navigate(`/admin/users/${id}`)}
          style={{
            flex: 1,
            padding: "14px",
            background: "#757575",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "16px",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default EditUser;
