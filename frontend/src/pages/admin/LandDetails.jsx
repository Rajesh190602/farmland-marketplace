import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";

function LandDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [land, setLand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchLand();
  }, [id]);

  const fetchLand = async () => {
    try {
      setLoading(true);

      const response = await api.get(
        `/admin/lands/${id}`
      );

      setLand(response.data);
    } catch (error) {
      console.error(
        "Failed to load land:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to load land details."
      );

      setLand(null);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // APPROVE LAND
  // =========================================================

  const approveLand = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to approve this land?\n\n" +
        "The land will become visible to buyers."
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);

      await api.put(
        `/admin/lands/${id}/approve`
      );

      alert(
        "Land approved successfully."
      );

      await fetchLand();
    } catch (error) {
      console.error(
        "Approve error:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to approve land."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================
  // REQUEST CHANGES
  // =========================================================

  const requestChanges = async () => {
    const reason = window.prompt(
      "Enter the reason for requesting changes:"
    );

    if (reason === null) return;

    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      alert("Reason is required.");
      return;
    }

    try {
      setActionLoading(true);

      await api.put(
        `/admin/lands/${id}/request-changes`,
        {
          reason: trimmedReason,
        }
      );

      alert(
        "Changes requested successfully."
      );

      await fetchLand();
    } catch (error) {
      console.error(
        "Request changes error:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to request changes."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================
  // REJECT LAND
  // =========================================================

  const rejectLand = async () => {
    const reason = window.prompt(
      "Enter the reason for rejecting this land:"
    );

    if (reason === null) return;

    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      alert("Reason is required.");
      return;
    }

    try {
      setActionLoading(true);

      await api.put(
        `/admin/lands/${id}/reject`,
        {
          reason: trimmedReason,
        }
      );

      alert(
        "Land rejected successfully."
      );

      await fetchLand();
    } catch (error) {
      console.error(
        "Reject error:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to reject land."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================
  // DELETE LAND
  // =========================================================

  const deleteLand = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this land?\n\n" +
        "This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);

      await api.delete(
        `/admin/lands/${id}`
      );

      alert(
        "Land deleted successfully."
      );

      navigate("/admin/lands");
    } catch (error) {
      console.error(
        "Delete error:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to delete land."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================
  // STATUS COLOR
  // =========================================================

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "#2E7D32";

      case "pending":
        return "#F9A825";

      case "rejected":
        return "#D32F2F";

      case "changes_requested":
        return "#EF6C00";

      default:
        return "#757575";
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
          fontWeight: "bold",
          color: "#2E7D32",
        }}
      >
        Loading Land Details...
      </div>
    );
  }

  // =========================================================
  // NOT FOUND
  // =========================================================

  if (!land) {
    return (
      <div
        style={{
          textAlign: "center",
          marginTop: "100px",
        }}
      >
        <h2>Land not found.</h2>

        <button
          onClick={() =>
            navigate("/admin/lands")
          }
          style={backButtonStyle}
        >
          ← Back to Lands
        </button>
      </div>
    );
  }

  const currentStatus =
    land.status?.toLowerCase();

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
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        {/* ===================================================
            BACK BUTTON
        ==================================================== */}

        <button
          onClick={() =>
            navigate("/admin/lands")
          }
          style={backButtonStyle}
        >
          ← Back to Lands
        </button>

        {/* ===================================================
            HEADER
        ==================================================== */}

        <div
          style={{
            background:
              "linear-gradient(135deg,#2E7D32,#66BB6A)",
            color: "#fff",
            padding: "25px",
            borderRadius: "15px",
            marginTop: "20px",
            marginBottom: "20px",
          }}
        >
          <h1 style={{ margin: 0 }}>
            🌾 {land.title || "Land Details"}
          </h1>

          <p style={{ marginBottom: 0 }}>
            Land ID: {land.id}
          </p>
        </div>

        {/* ===================================================
            STATUS
        ==================================================== */}

        <div style={cardStyle}>
          <h2>📌 Status</h2>

          <span
            style={{
              display: "inline-block",
              padding: "8px 15px",
              borderRadius: "20px",
              background:
                getStatusColor(land.status),
              color: "#fff",
              fontWeight: "bold",
            }}
          >
            {land.status === "changes_requested"
              ? "Changes Requested"
              : land.status || "Unknown"}
          </span>
        </div>

        {/* ===================================================
            LAND INFORMATION
        ==================================================== */}

        <div style={cardStyle}>
          <h2>🌾 Land Information</h2>

          <InfoRow
            label="Title"
            value={land.title}
          />

          <InfoRow
            label="Description"
            value={land.description}
          />

          <InfoRow
            label="Area"
            value={
              land.area
                ? `${land.area} Acres`
                : "-"
            }
          />

          <InfoRow
            label="Price"
            value={
              land.price
                ? `₹ ${land.price}`
                : "-"
            }
          />

          <InfoRow
            label="Survey Number"
            value={land.survey_number}
          />

          <InfoRow
            label="Soil Type"
            value={land.soil_type}
          />

          <InfoRow
            label="Water Source"
            value={land.water_source}
          />

          <InfoRow
            label="Crop Type"
            value={land.crop_type}
          />
        </div>

        {/* ===================================================
            LOCATION
        ==================================================== */}

        <div style={cardStyle}>
          <h2>📍 Location</h2>

          <InfoRow
            label="Village"
            value={land.village}
          />

          <InfoRow
            label="Mandal"
            value={land.mandal}
          />

          <InfoRow
            label="District"
            value={land.district}
          />

          <InfoRow
            label="State"
            value={land.state}
          />

          <InfoRow
            label="Pincode"
            value={land.pincode}
          />

          <InfoRow
            label="Latitude"
            value={land.latitude}
          />

          <InfoRow
            label="Longitude"
            value={land.longitude}
          />
        </div>

        {/* ===================================================
            OWNER INFORMATION
        ==================================================== */}

        <div style={cardStyle}>
          <h2>👤 Owner Information</h2>

          <InfoRow
            label="Name"
            value={land.owner_name}
          />

          <InfoRow
            label="Email"
            value={land.owner_email}
          />

          <InfoRow
            label="Mobile"
            value={land.owner_mobile}
          />

          <InfoRow
            label="Owner ID"
            value={land.owner_id}
          />
        </div>

        {/* ===================================================
            IMAGE
        ==================================================== */}

        <div style={cardStyle}>
          <h2>🖼️ Land Image</h2>

          {land.image_url ? (
            <img
              src={land.image_url}
              alt={land.title || "Land"}
              style={{
                width: "100%",
                maxHeight: "500px",
                objectFit: "cover",
                borderRadius: "10px",
              }}
            />
          ) : (
            <p style={{ color: "#777" }}>
              No image available.
            </p>
          )}
        </div>

        {/* ===================================================
            ADMIN ACTIONS
        ==================================================== */}

        <div style={cardStyle}>
          <h2>⚙️ Admin Actions</h2>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            {/* EDIT */}

            <button
              onClick={() =>
                navigate(
                  `/admin/edit-land/${land.id}`
                )
              }
              disabled={actionLoading}
              style={{
                ...actionButtonStyle,
                background: "#1976D2",
              }}
            >
              ✏️ Edit
            </button>

            {/* APPROVE */}

            {(currentStatus === "pending" ||
              currentStatus ===
                "changes_requested") && (
              <button
                onClick={approveLand}
                disabled={actionLoading}
                style={{
                  ...actionButtonStyle,
                  background: "#2E7D32",
                }}
              >
                ✅ Approve
              </button>
            )}

            {/* REQUEST CHANGES */}

            {currentStatus === "pending" && (
              <button
                onClick={requestChanges}
                disabled={actionLoading}
                style={{
                  ...actionButtonStyle,
                  background: "#F9A825",
                }}
              >
                ⚠️ Request Changes
              </button>
            )}

            {/* REJECT */}

            {(currentStatus === "pending" ||
              currentStatus ===
                "changes_requested") && (
              <button
                onClick={rejectLand}
                disabled={actionLoading}
                style={{
                  ...actionButtonStyle,
                  background: "#D32F2F",
                }}
              >
                ❌ Reject
              </button>
            )}

            {/* DELETE */}

            <button
              onClick={deleteLand}
              disabled={actionLoading}
              style={{
                ...actionButtonStyle,
                background: "#B71C1C",
              }}
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// INFO ROW
// =========================================================

function InfoRow({ label, value }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "180px 1fr",
        gap: "15px",
        padding: "12px 0",
        borderBottom: "1px solid #eee",
      }}
    >
      <strong>{label}</strong>

      <span
        style={{
          color: "#555",
          wordBreak: "break-word",
        }}
      >
        {value || "-"}
      </span>
    </div>
  );
}

// =========================================================
// STYLES
// =========================================================

const cardStyle = {
  background: "#fff",
  padding: "25px",
  borderRadius: "15px",
  marginBottom: "20px",
  boxShadow:
    "0 5px 15px rgba(0,0,0,0.08)",
};

const backButtonStyle = {
  background: "#455A64",
  color: "#fff",
  border: "none",
  padding: "10px 18px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const actionButtonStyle = {
  color: "#fff",
  border: "none",
  padding: "11px 16px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

export default LandDetails;