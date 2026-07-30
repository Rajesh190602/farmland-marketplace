import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get("/users/profile");
      setUser(response.data);
    } catch (error) {
      console.error("Profile Load Error:", error);
      alert("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    setSaving(true);

    try {
      await api.put("/users/profile", {
        full_name: user.full_name,
        mobile: user.mobile,
      });

      alert("Profile updated successfully!");

      await fetchProfile();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.detail || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <h2 style={{ textAlign: "center", marginTop: "50px" }}>
          Loading...
        </h2>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div
        style={{
          maxWidth: "600px",
          margin: "40px auto",
          background: "#fff",
          padding: "30px",
          borderRadius: "10px",
          boxShadow: "0 0 10px rgba(0,0,0,0.15)",
        }}
      >
        <h2 style={{ textAlign: "center" }}>👤 My Profile</h2>

        <div style={{ marginTop: "20px" }}>
          <label><strong>Full Name</strong></label>

          <input
            type="text"
            value={user.full_name || ""}
            onChange={(e) =>
              setUser({
                ...user,
                full_name: e.target.value,
              })
            }
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "5px",
              marginBottom: "15px",
            }}
          />

          <label><strong>Mobile</strong></label>

          <input
            type="text"
            value={user.mobile || ""}
            onChange={(e) =>
              setUser({
                ...user,
                mobile: e.target.value,
              })
            }
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "5px",
              marginBottom: "15px",
            }}
          />

          <label><strong>Email</strong></label>

          <input
            type="text"
            value={user.email || ""}
            disabled
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "5px",
              marginBottom: "15px",
              background: "#f2f2f2",
            }}
          />

          <label><strong>Role</strong></label>

          <input
            type="text"
            value={user.role || ""}
            disabled
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "5px",
              marginBottom: "25px",
              background: "#f2f2f2",
            }}
          />

          <div
            style={{
              display: "flex",
              gap: "10px",
            }}
          >
            <button
              onClick={updateProfile}
              disabled={saving}
              style={{
                flex: 1,
                padding: "12px",
                background: "#1976D2",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              {saving ? "Saving..." : "💾 Save Profile"}
            </button>

            <button
              onClick={() => navigate("/change-password")}
              style={{
                flex: 1,
                padding: "12px",
                background: "#2E7D32",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              🔒 Change Password
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Profile;