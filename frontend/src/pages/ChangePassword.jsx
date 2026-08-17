import { useState } from "react";
import Navbar from "../components/Navbar";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

function ChangePassword() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!form.current_password.trim()) {
    alert("Please enter your current password.");
    return;
  }

  if (form.new_password.length < 8) {
    alert("New password must be at least 8 characters.");
    return;
  }

  if (form.new_password !== form.confirm_password) {
    alert("New Password and Confirm Password do not match.");
    return;
  }

  try {
    const response = await api.put("/users/change-password", form);

    alert(response.data.message);

    sessionStorage.removeItem("token");
    localStorage.removeItem("user");

    alert("Please login again with your new password.");

    navigate("/");
  } catch (error) {
    console.error(error);

    alert(
      error.response?.data?.detail ||
      "Failed to change password."
    );
  }
};

  return (
    <>
      <Navbar />

      <div
        style={{
          maxWidth: "500px",
          margin: "40px auto",
          background: "#fff",
          padding: "30px",
          borderRadius: "10px",
          boxShadow: "0 0 10px rgba(0,0,0,0.2)",
        }}
      >
        <h2>🔒 Change Password</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            name="current_password"
            placeholder="Current Password"
            value={form.current_password}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "15px",
            }}
          />

          <input
            type="password"
            name="new_password"
            placeholder="New Password"
            value={form.new_password}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "15px",
            }}
          />

          <input
            type="password"
            name="confirm_password"
            placeholder="Confirm Password"
            value={form.confirm_password}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "20px",
            }}
          />

          <button
            type="submit"
            style={{
              width: "100%",
              background: "#1976D2",
              color: "white",
              padding: "12px",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Update Password
          </button>
        </form>
      </div>
    </>
  );
}

export default ChangePassword;