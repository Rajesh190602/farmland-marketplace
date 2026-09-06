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
  const [deleting, setDeleting] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  // =========================================================
  // FETCH USER
  // =========================================================

  useEffect(() => {
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
      setLoading(true);

      const response = await api.get(`/admin/users/${id}`);

      setUser(response.data);
    } catch (error) {
      console.error("User Details Error:", error);

      alert(
        error.response?.data?.detail ||
          "Failed to load user details."
      );

      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // DELETE USER
  // =========================================================

  const deleteUser = async () => {
    if (user?.role?.toLowerCase() === "admin") {
      alert("Admin accounts cannot be deleted.");
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${user.full_name}"?\n\n` +
        "This action cannot be undone."
    );

    if (!confirmDelete) {
      return;
    }

    try {
      setDeleting(true);

      await api.delete(`/admin/users/${id}`);

      alert("User deleted successfully.");

      navigate("/admin/users");
    } catch (error) {
      console.error("Delete User Error:", error);

      alert(
        error.response?.data?.detail ||
          "Failed to delete user."
      );
    } finally {
      setDeleting(false);
    }
  };

  // =========================================================
  // REACTIVATE ACCOUNT
  // =========================================================

  const reactivateAccount = async () => {
    if (user?.role?.toLowerCase() === "admin") {
      alert("Admin accounts cannot be reactivated.");
      return;
    }

    if (user?.account_status !== "deactivated") {
      alert("This account is already active.");
      return;
    }

    const confirmReactivate = window.confirm(
      `Are you sure you want to reactivate "${user.full_name}"?\n\n` +
        "The user will be able to log in again."
    );

    if (!confirmReactivate) {
      return;
    }

    try {
      setReactivating(true);

      const response = await api.put(
        `/admin/users/${id}/reactivate`
      );

      setUser((previousUser) => ({
        ...previousUser,
        account_status:
          response.data?.account_status || "active",
        reactivated_at:
          response.data?.reactivated_at ||
          new Date().toISOString(),
      }));

      alert(
        response.data?.message ||
          "User account reactivated successfully."
      );
    } catch (error) {
      console.error("Reactivate User Error:", error);

      alert(
        error.response?.data?.detail ||
          "Failed to reactivate user account."
      );
    } finally {
      setReactivating(false);
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

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

  // =========================================================
  // USER NOT FOUND
  // =========================================================

  if (!user) {
    return (
      <div
        style={{
          textAlign: "center",
          marginTop: "100px",
        }}
      >
        <h2>User not found.</h2>

        <button
          onClick={() => navigate("/admin/users")}
          style={{
            marginTop: "20px",
            background: "#1976D2",
            color: "#fff",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          <FaArrowLeft /> Back to Users
        </button>
      </div>
    );
  }

  const isAdmin = user.role?.toLowerCase() === "admin";

  const isDeactivated =
    user.account_status?.toLowerCase() === "deactivated";

  const isSuspended = Boolean(user.is_suspended);

  const displayAccountStatus = isDeactivated
    ? "Deactivated"
    : isSuspended
    ? "Suspended"
    : "Active";

  const accountStatusColor = isDeactivated
    ? "#C62828"
    : isSuspended
    ? "#EF6C00"
    : "#2E7D32";

  const accountStatusBackground = isDeactivated
    ? "#FFEBEE"
    : isSuspended
    ? "#FFF3E0"
    : "#E8F5E9";

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
          margin: "0 auto",
          background: "#fff",
          padding: "30px",
          borderRadius: "15px",
          boxShadow: "0 5px 15px rgba(0,0,0,0.15)",
        }}
      >
        {/* =====================================================
            BACK BUTTON
        ====================================================== */}

        <button
          onClick={() => navigate("/admin/users")}
          style={{
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#1976D2",
            color: "#fff",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          <FaArrowLeft />
          Back
        </button>

        {/* =====================================================
            TITLE
        ====================================================== */}

        <h1
          style={{
            color: "#2E7D32",
            marginBottom: "10px",
          }}
        >
          👤 User Details
        </h1>

        <hr />

        {/* =====================================================
            USER INFORMATION
        ====================================================== */}

        <div style={{ marginTop: "25px" }}>
          <p>
            <FaUser /> <strong>Name:</strong>{" "}
            {user.full_name || "-"}
          </p>

          <p>
            <FaEnvelope /> <strong>Email:</strong>{" "}
            {user.email || "-"}
          </p>

          <p>
            <FaPhone /> <strong>Mobile:</strong>{" "}
            {user.mobile || "-"}
          </p>

          <p>
            <FaUserShield /> <strong>Role:</strong>{" "}
            <span
              style={{
                fontWeight: "bold",
                textTransform: "capitalize",
                color: isAdmin
                  ? "#D81B60"
                  : user.role === "farmer"
                  ? "#2E7D32"
                  : "#1565C0",
              }}
            >
              {user.role || "-"}
            </span>
          </p>

          <p>
            <strong>User ID:</strong> {user.id}
          </p>

          <p>
            <FaSeedling /> <strong>Total Lands:</strong>{" "}
            {user.total_lands ?? 0}
          </p>

          {user.created_at && (
            <p>
              <strong>Created At:</strong>{" "}
              {new Date(user.created_at).toLocaleString()}
            </p>
          )}

          {user.last_seen && (
            <p>
              <strong>Last Seen:</strong>{" "}
              {new Date(user.last_seen).toLocaleString()}
            </p>
          )}
        </div>

        {/* =====================================================
            ACCOUNT STATUS
        ====================================================== */}

        <div
          style={{
            marginTop: "25px",
            padding: "18px",
            background: accountStatusBackground,
            borderRadius: "10px",
            border: `1px solid ${accountStatusColor}`,
          }}
        >
          <h3
            style={{
              marginTop: 0,
              marginBottom: "12px",
              color: accountStatusColor,
            }}
          >
            Account Status
          </h3>

          <p style={{ margin: "8px 0" }}>
            <strong>Status:</strong>{" "}
            <span
              style={{
                display: "inline-block",
                padding: "5px 12px",
                borderRadius: "20px",
                background: accountStatusColor,
                color: "#fff",
                fontWeight: "bold",
              }}
            >
              {displayAccountStatus}
            </span>
          </p>

          {user.deactivated_at && (
            <p style={{ margin: "8px 0" }}>
              <strong>Deactivated At:</strong>{" "}
              {new Date(user.deactivated_at).toLocaleString()}
            </p>
          )}

          {user.reactivated_at && (
            <p style={{ margin: "8px 0" }}>
              <strong>Reactivated At:</strong>{" "}
              {new Date(user.reactivated_at).toLocaleString()}
            </p>
          )}

          {isDeactivated && (
            <p
              style={{
                marginBottom: 0,
                color: "#8D1B1B",
                lineHeight: 1.5,
              }}
            >
              This account is deactivated. The user cannot
              log in until an administrator reactivates the
              account.
            </p>
          )}
        </div>

        {/* =====================================================
            ACTION BUTTONS
        ====================================================== */}

        <div
          style={{
            display: "flex",
            gap: "15px",
            marginTop: "30px",
            flexWrap: "wrap",
          }}
        >
          {/* EDIT */}

          <button
            onClick={() =>
              navigate(`/admin/users/edit/${id}`)
            }
            disabled={deleting || reactivating}
            style={{
              flex: 1,
              minWidth: "180px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              background:
                deleting || reactivating ? "#999" : "#F9A825",
              color: "#fff",
              border: "none",
              padding: "12px",
              borderRadius: "8px",
              cursor:
                deleting || reactivating
                  ? "not-allowed"
                  : "pointer",
              fontWeight: "bold",
            }}
          >
            <FaEdit />
            Edit User
          </button>

          {/* REACTIVATE ACCOUNT */}

          {!isAdmin && isDeactivated && (
            <button
              onClick={reactivateAccount}
              disabled={reactivating || deleting}
              style={{
                flex: 1,
                minWidth: "180px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: reactivating ? "#999" : "#2E7D32",
                color: "#fff",
                border: "none",
                padding: "12px",
                borderRadius: "8px",
                cursor: reactivating
                  ? "not-allowed"
                  : "pointer",
                fontWeight: "bold",
              }}
            >
              🔄{" "}
              {reactivating
                ? "Reactivating..."
                : "Reactivate Account"}
            </button>
          )}

          {/* DELETE */}

          {!isAdmin && (
            <button
              onClick={deleteUser}
              disabled={deleting || reactivating}
              style={{
                flex: 1,
                minWidth: "180px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background:
                  deleting || reactivating ? "#999" : "#D32F2F",
                color: "#fff",
                border: "none",
                padding: "12px",
                borderRadius: "8px",
                cursor:
                  deleting || reactivating
                    ? "not-allowed"
                    : "pointer",
                fontWeight: "bold",
              }}
            >
              <FaTrash />
              {deleting ? "Deleting..." : "Delete User"}
            </button>
          )}
        </div>

        {/* ADMIN PROTECTION MESSAGE */}

        {isAdmin && (
          <div
            style={{
              marginTop: "20px",
              padding: "12px",
              background: "#FFF3E0",
              borderRadius: "8px",
              color: "#E65100",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            🔒 Admin accounts cannot be deleted or reactivated
            through account management.
          </div>
        )}

        {/* DEACTIVATED ACCOUNT MESSAGE */}

        {isDeactivated && !isAdmin && (
          <div
            style={{
              marginTop: "20px",
              padding: "12px",
              background: "#FFEBEE",
              borderRadius: "8px",
              color: "#C62828",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            ⚠️ This user has deactivated their account.
            Reactivating the account restores login access.
            Existing listings remain unpublished until
            explicitly published again.
          </div>
        )}
      </div>
    </div>
  );
}

export default UserDetails;
