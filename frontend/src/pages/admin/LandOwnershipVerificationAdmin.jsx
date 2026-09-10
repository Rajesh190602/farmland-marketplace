import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import api from "../../services/api";

function LandOwnershipVerificationAdmin() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [reason, setReason] = useState("");

  const loadPending = async () => {
    try {
      setLoading(true);
      const response = await api.get("/land-ownership/admin/pending");
      setItems(response.data || []);
    } catch (error) {
      alert(
        error.response?.data?.detail ||
          "Failed to load ownership verification queue."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const openVerification = async (verificationId) => {
    try {
      const response = await api.get(
        `/land-ownership/admin/${verificationId}`
      );
      setSelected(response.data);
      setReason(response.data?.verification?.rejection_reason || "");
    } catch (error) {
      alert(
        error.response?.data?.detail ||
          "Failed to load verification details."
      );
    }
  };

  const review = async (action) => {
    if (!selected) return;

    if ((action === "reject" || action === "changes_requested") &&
        !reason.trim()) {
      alert("Please enter a reason.");
      return;
    }

    try {
      setReviewing(true);
      await api.post(
        `/land-ownership/admin/${selected.verification_id}/review`,
        {
          action,
          reason: reason.trim() || null,
        }
      );

      alert(
        action === "verify"
          ? "Land ownership verified successfully."
          : action === "reject"
          ? "Ownership verification rejected."
          : "Changes requested successfully."
      );

      setSelected(null);
      setReason("");
      await loadPending();
    } catch (error) {
      alert(
        error.response?.data?.detail ||
          "Failed to review ownership verification."
      );
    } finally {
      setReviewing(false);
    }
  };

  const viewDocument = async () => {
    if (!selected) return;

    try {
      const response = await api.get(
        `/land-ownership/admin/${selected.verification_id}/document`,
        { responseType: "blob" }
      );

      const blobUrl = URL.createObjectURL(response.data);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (error) {
      alert(
        error.response?.data?.detail ||
          "Unable to open the private passbook."
      );
    }
  };

  return (
    <>
      <Navbar />
      <div
        style={{
          maxWidth: 1200,
          margin: "30px auto",
          padding: "0 20px",
        }}
      >
        <h1 style={{ color: "#1b5e20" }}>
          📜 Land Ownership Verification
        </h1>

        {loading ? (
          <p>Loading verification queue...</p>
        ) : items.length === 0 ? (
          <div
            style={{
              padding: 20,
              background: "#f5f5f5",
              borderRadius: 10,
            }}
          >
            No pending ownership verifications.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "#fff",
              }}
            >
              <thead>
                <tr>
                  {[
                    "Verification",
                    "Land",
                    "Owner",
                    "Location",
                    "Survey No.",
                    "Status",
                    "Action",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        textAlign: "left",
                        padding: 12,
                        borderBottom: "2px solid #ddd",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.verification_id}>
                    <td style={{ padding: 12 }}>
                      #{item.verification_id}
                    </td>
                    <td style={{ padding: 12 }}>
                      {item.land_title}
                      <br />
                      <small>Land #{item.land_id}</small>
                    </td>
                    <td style={{ padding: 12 }}>
                      {item.owner_name}
                      <br />
                      <small>User #{item.owner_id}</small>
                    </td>
                    <td style={{ padding: 12 }}>
                      {item.village}, {item.mandal}, {item.district}
                    </td>
                    <td style={{ padding: 12 }}>
                      {item.survey_number || "-"}
                    </td>
                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          background: "#fff3cd",
                          color: "#856404",
                          padding: "5px 10px",
                          borderRadius: 14,
                          fontWeight: 700,
                        }}
                      >
                        {item.verification_status}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>
                      <button
                        onClick={() => openVerification(item.verification_id)}
                        style={{
                          border: "none",
                          borderRadius: 7,
                          padding: "8px 12px",
                          background: "#1565c0",
                          color: "#fff",
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected && (
          <div
            style={{
              marginTop: 25,
              padding: 24,
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: 12,
              boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 15,
                alignItems: "center",
              }}
            >
              <h2 style={{ marginTop: 0 }}>
                Review Verification #{selected.verification_id}
              </h2>
              <button
                onClick={() => setSelected(null)}
                style={{
                  border: "none",
                  background: "#eee",
                  padding: "8px 12px",
                  borderRadius: 7,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
                gap: 12,
              }}
            >
              <div><strong>Land:</strong> {selected.land?.title}</div>
              <div><strong>Land ID:</strong> {selected.land?.id}</div>
              <div><strong>Owner:</strong> {selected.owner?.full_name}</div>
              <div><strong>Mobile:</strong> {selected.owner?.mobile}</div>
              <div><strong>Email:</strong> {selected.owner?.email}</div>
              <div><strong>Survey No.:</strong> {selected.land?.survey_number}</div>
              <div><strong>Submitted file:</strong> {selected.verification?.original_filename}</div>
              <div><strong>Content type:</strong> {selected.verification?.content_type}</div>
              <div><strong>Snapshot owner:</strong> {selected.verification?.owner_name_snapshot}</div>
              <div><strong>Snapshot survey:</strong> {selected.verification?.survey_number_snapshot}</div>
            </div>

            <button
              onClick={viewDocument}
              style={{
                marginTop: 20,
                background: "#6a1b9a",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "11px 16px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              📄 View Private Passbook
            </button>

            <div style={{ marginTop: 20 }}>
              <label
                htmlFor="ownership-review-reason"
                style={{ display: "block", fontWeight: 700, marginBottom: 8 }}
              >
                Reason / Admin feedback
              </label>
              <textarea
                id="ownership-review-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Required for reject or changes requested"
                rows={4}
                maxLength={1000}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #ccc",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 15,
              }}
            >
              <button
                onClick={() => review("verify")}
                disabled={reviewing}
                style={{
                  background: "#2e7d32",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "11px 16px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                ✓ Verify Ownership
              </button>

              <button
                onClick={() => review("changes_requested")}
                disabled={reviewing}
                style={{
                  background: "#ef6c00",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "11px 16px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                ↻ Request Changes
              </button>

              <button
                onClick={() => review("reject")}
                disabled={reviewing}
                style={{
                  background: "#c62828",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "11px 16px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                ✕ Reject
              </button>
            </div>

            <p style={{ marginTop: 15, color: "#555" }}>
              Ownership verification is separate from marketplace approval.
              Verifying here does not automatically publish or approve the land.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export default LandOwnershipVerificationAdmin;
