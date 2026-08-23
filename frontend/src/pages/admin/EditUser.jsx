import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";

function EditUser() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalRole, setOriginalRole] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    mobile: "",
    role: "",
  });

  // =========================================================
  // LOAD USER
  // =========================================================

  useEffect(() => {
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
      setLoading(true);

      const response = await api.get(
        `/admin/users/${id}`
      );

      const user = response.data;

      setForm({
        full_name: user.full_name || "",
        email: user.email || "",
        mobile: user.mobile || "",
        role: user.role || "",
      });

      setOriginalRole(
        (user.role || "").toLowerCase()
      );
    } catch (error) {
      console.error(
        "Failed to load user:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to load user."
      );

      navigate("/admin/users");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // HANDLE INPUT
  // =========================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  };

  // =========================================================
  // VALIDATION
  // =========================================================

  const validateForm = () => {
    const fullName = form.full_name.trim();
    const email = form.email.trim();
    const mobile = form.mobile.trim();
    const role = form.role.trim().toLowerCase();

    if (fullName.length < 2) {
      alert(
        "Full Name must contain at least 2 characters."
      );
      return false;
    }

    if (email.length === 0) {
      alert("Email is required.");
      return false;
    }

    // Basic email validation
    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      alert("Enter a valid email address.");
      return false;
    }

    if (mobile.length === 0) {
      alert("Mobile number is required.");
      return false;
    }

    if (!/^\d{10}$/.test(mobile)) {
      alert(
        "Mobile number must contain exactly 10 digits."
      );
      return false;
    }

    if (
      !["admin", "farmer", "buyer"].includes(role)
    ) {
      alert("Please select a valid role.");
      return false;
    }

    return true;
  };

  // =========================================================
  // SAVE USER
  // =========================================================

  const saveUser = async () => {
    if (!validateForm()) {
      return;
    }

    const fullName = form.full_name.trim();
    const email = form.email.trim();
    const mobile = form.mobile.trim();
    const role = form.role.trim().toLowerCase();

    // -------------------------------------------------------
    // Confirm role escalation
    // -------------------------------------------------------

    if (
      role === "admin" &&
      originalRole !== "admin"
    ) {
      const confirmed = window.confirm(
        "You are giving this user ADMIN access.\n\n" +
          "Admins can access the admin dashboard and manage users and lands.\n\n" +
          "Do you want to continue?"
      );

      if (!confirmed) {
        return;
      }
    }

    // -------------------------------------------------------
    // Confirm removing admin privileges
    // -------------------------------------------------------

    if (
      originalRole === "admin" &&
      role !== "admin"
    ) {
      const confirmed = window.confirm(
        "You are removing ADMIN privileges from this user.\n\n" +
          "They will no longer have access to the admin dashboard.\n\n" +
          "Do you want to continue?"
      );

      if (!confirmed) {
        return;
      }
    }

    try {
      setSaving(true);

      const payload = {
        full_name: fullName,
        email,
        mobile,
        role,
      };

      console.log(
        "Updating user:",
        payload
      );

      const response = await api.put(
        `/admin/users/${id}`,
        payload
      );

      alert(
        response.data?.message ||
          "User updated successfully."
      );

      navigate(`/admin/users/${id}`);

    } catch (error) {
      console.error(
        "Failed to update user:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to update user."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "24px",
          color: "#2E7D32",
          fontWeight: "bold",
        }}
      >
        Loading User...
      </div>
    );
  }

  // =========================================================
  // UI
  // =========================================================

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
          maxWidth: "700px",
          margin: "40px auto",
          background: "#fff",
          padding: "30px",
          borderRadius: "15px",
          boxShadow:
            "0 5px 15px rgba(0,0,0,0.15)",
        }}
      >
        <h1
          style={{
            color: "#2E7D32",
            marginBottom: "10px",
          }}
        >
          ✏️ Edit User
        </h1>

        <p
          style={{
            color: "#666",
            marginBottom: "25px",
          }}
        >
          Update the user's account information.
        </p>

        <hr />

        {/* ===================================================
            FULL NAME
        ==================================================== */}

        <div
          style={{
            marginTop: "25px",
            marginBottom: "18px",
          }}
        >
          <label>
            <strong>Full Name</strong>
          </label>

          <input
            type="text"
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            disabled={saving}
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* ===================================================
            EMAIL
        ==================================================== */}

        <div
          style={{
            marginBottom: "18px",
          }}
        >
          <label>
            <strong>Email</strong>
          </label>

          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            disabled={saving}
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* ===================================================
            MOBILE
        ==================================================== */}

        <div
          style={{
            marginBottom: "18px",
          }}
        >
          <label>
            <strong>Mobile</strong>
          </label>

          <input
            type="tel"
            name="mobile"
            value={form.mobile}
            onChange={handleChange}
            disabled={saving}
            maxLength={10}
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* ===================================================
            ROLE
        ==================================================== */}

        <div
          style={{
            marginBottom: "25px",
          }}
        >
          <label>
            <strong>Role</strong>
          </label>

          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            disabled={saving}
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              boxSizing: "border-box",
              background: "#fff",
            }}
          >
            <option value="">
              Select Role
            </option>

            <option value="farmer">
              Farmer
            </option>

            <option value="buyer">
              Buyer
            </option>

            <option value="admin">
              Admin
            </option>
          </select>
        </div>

        {/* ===================================================
            WARNING FOR ADMIN ROLE
        ==================================================== */}

        {form.role === "admin" &&
          originalRole !== "admin" && (
            <div
              style={{
                background: "#FFF3E0",
                color: "#E65100",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "20px",
                fontWeight: "bold",
              }}
            >
              ⚠️ This change will give the user
              administrator privileges.
            </div>
          )}

        {/* ===================================================
            BUTTONS
        ==================================================== */}

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
              background: saving
                ? "#81A985"
                : "#2E7D32",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: saving
                ? "not-allowed"
                : "pointer",
              fontWeight: "bold",
              fontSize: "16px",
            }}
          >
            {saving
              ? "Saving..."
              : "💾 Save Changes"}
          </button>

          <button
            onClick={() =>
              navigate(
                `/admin/users/${id}`
              )
            }
            disabled={saving}
            style={{
              flex: 1,
              padding: "14px",
              background: "#757575",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: saving
                ? "not-allowed"
                : "pointer",
              fontWeight: "bold",
              fontSize: "16px",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditUser;