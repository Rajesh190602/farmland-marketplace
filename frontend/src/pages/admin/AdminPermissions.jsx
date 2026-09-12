import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "";

const PERMISSION_OPTIONS = [
  {
    value: "VERIFICATION_ADMIN",
    label: "Verification Admin",
    description: "KYC and Pattadhar land ownership verification",
  },
  {
    value: "MODERATION_ADMIN",
    label: "Moderation Admin",
    description: "Listings, reports, blocking, suspensions and moderation",
  },
  {
    value: "SUPPORT_ADMIN",
    label: "Support Admin",
    description: "Users, user details and activity logs",
  },
  {
    value: "ANALYTICS_ADMIN",
    label: "Analytics Admin",
    description: "Dashboard and marketplace analytics",
  },
  {
    value: "SUPER_ADMIN",
    label: "Super Admin",
    description: "Full administrative access",
  },
];

function getPermissionLabel(value) {
  const option = PERMISSION_OPTIONS.find((item) => item.value === value);
  return option ? option.label : value || "NONE";
}

function getPermissionDescription(value) {
  const option = PERMISSION_OPTIONS.find((item) => item.value === value);
  return option ? option.description : "No administrative permission assigned";
}

function AdminPermissions() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = sessionStorage.getItem("token");
  const currentUserId = Number(sessionStorage.getItem("user_id"));

  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const loadAdmins = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/admin/admin-permissions");
      setAdmins(
        Array.isArray(response.data?.admins) ? response.data.admins : []
      );
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        "Failed to load administrator permissions.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
    // The page intentionally loads once when opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updatePermission = async (userId, permissionRole) => {
    setSavingId(userId);
    setError("");
    setSuccess("");

    try {
      await api.put(`/admin/admin-permissions/${userId}`, null, {
        params: {
          permission_role: permissionRole,
        },
      });

      setAdmins((current) =>
        current.map((admin) =>
          admin.id === userId
            ? {
                ...admin,
                admin_permission_role: permissionRole,
              }
            : admin
        )
      );

      setSuccess("Administrator permission updated successfully.");
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        "Failed to update administrator permission.";
      setError(message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
          marginBottom: "20px",
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: "8px" }}>
          🔐 Admin Permission Management
        </h1>
        <p style={{ margin: 0, color: "#555", lineHeight: 1.5 }}>
          Assign administrative permissions to administrator accounts. This
          page is available to Super Admins only.
        </p>
      </div>

      {error && (
        <div
          style={{
            background: "#ffebee",
            color: "#b71c1c",
            border: "1px solid #ef9a9a",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "16px",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            background: "#e8f5e9",
            color: "#1b5e20",
            border: "1px solid #a5d6a7",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "16px",
          }}
        >
          {success}
        </div>
      )}

      <div
        style={{
          background: "#fff8e1",
          border: "1px solid #ffe082",
          borderRadius: "8px",
          padding: "12px 16px",
          marginBottom: "20px",
          color: "#6d4c00",
        }}
      >
        <strong>Security:</strong> The backend enforces Super Admin access.
        Changing a permission here cannot bypass the server-side permission
        checks.
      </div>

      {loading ? (
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "30px",
            textAlign: "center",
          }}
        >
          Loading administrator accounts...
        </div>
      ) : admins.length === 0 ? (
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "30px",
            textAlign: "center",
          }}
        >
          No administrator accounts found.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "16px",
          }}
        >
          {admins.map((admin) => {
            const isCurrentAdmin =
              Number(admin.id) === currentUserId ||
              String(admin.id) === sessionStorage.getItem("user_id");

            const currentPermission =
              admin.admin_permission_role || "NONE";

            return (
              <div
                key={admin.id}
                style={{
                  background: "white",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                  border: isCurrentAdmin
                    ? "2px solid #1B5E20"
                    : "1px solid #eee",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "20px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: "260px", flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <h3 style={{ margin: 0 }}>
                        {admin.full_name || "Unnamed Administrator"}
                      </h3>

                      {isCurrentAdmin && (
                        <span
                          style={{
                            background: "#e8f5e9",
                            color: "#1B5E20",
                            borderRadius: "12px",
                            padding: "4px 9px",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                        >
                          You
                        </span>
                      )}

                      {admin.is_suspended && (
                        <span
                          style={{
                            background: "#ffebee",
                            color: "#b71c1c",
                            borderRadius: "12px",
                            padding: "4px 9px",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                        >
                          Suspended
                        </span>
                      )}
                    </div>

                    <div style={{ color: "#666", marginTop: "6px" }}>
                      {admin.email}
                    </div>

                    <div style={{ marginTop: "12px" }}>
                      <strong>Current permission:</strong>{" "}
                      {getPermissionLabel(currentPermission)}
                    </div>

                    <div
                      style={{
                        color: "#666",
                        fontSize: "13px",
                        marginTop: "4px",
                      }}
                    >
                      {getPermissionDescription(currentPermission)}
                    </div>
                  </div>

                  <div style={{ minWidth: "280px" }}>
                    <label
                      htmlFor={`permission-${admin.id}`}
                      style={{
                        display: "block",
                        fontWeight: 700,
                        marginBottom: "7px",
                      }}
                    >
                      Change permission
                    </label>

                    <select
                      id={`permission-${admin.id}`}
                      value={currentPermission}
                      disabled={isCurrentAdmin || savingId === admin.id}
                      onChange={(event) =>
                        updatePermission(admin.id, event.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "7px",
                        border: "1px solid #ccc",
                        background: isCurrentAdmin ? "#f5f5f5" : "white",
                        cursor: isCurrentAdmin ? "not-allowed" : "pointer",
                        boxSizing: "border-box",
                      }}
                    >
                      {!PERMISSION_OPTIONS.some(
                        (option) => option.value === currentPermission
                      ) && (
                        <option value={currentPermission}>
                          {getPermissionLabel(currentPermission)}
                        </option>
                      )}

                      {PERMISSION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    {isCurrentAdmin ? (
                      <div
                        style={{
                          marginTop: "7px",
                          fontSize: "12px",
                          color: "#777",
                        }}
                      >
                        Your own Super Admin permission cannot be changed.
                      </div>
                    ) : savingId === admin.id ? (
                      <div
                        style={{
                          marginTop: "7px",
                          fontSize: "12px",
                          color: "#555",
                        }}
                      >
                        Saving permission...
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminPermissions;
