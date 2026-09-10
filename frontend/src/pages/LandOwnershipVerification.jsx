import { useEffect, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import api from "../services/api";

function LandOwnershipVerification({ landId }) {
  const [status, setStatus] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/land-ownership/lands/${landId}/status`);
      setStatus(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        setStatus(null);
      } else {
        console.error("Ownership status error:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (landId) loadStatus();
  }, [landId]);

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select your Pattadhar Passbook first.");
      return;
    }

    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(selectedFile.type)) {
      alert("Only PDF, JPG, PNG or WEBP files are allowed.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      alert("Maximum file size is 10 MB.");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", selectedFile);

      await api.post(
        `/land-ownership/lands/${landId}/document`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      alert("Pattadhar Passbook submitted successfully. It is now waiting for admin verification.");
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await loadStatus();
    } catch (error) {
      alert(
        error.response?.data?.detail ||
          "Failed to submit Pattadhar Passbook."
      );
    } finally {
      setUploading(false);
    }
  };

  const statusText = status?.status || "not_submitted";

  const statusStyle = {
    pending: { background: "#fff3cd", color: "#856404" },
    verified: { background: "#d4edda", color: "#155724" },
    rejected: { background: "#f8d7da", color: "#721c24" },
    changes_requested: { background: "#d1ecf1", color: "#0c5460" },
    not_submitted: { background: "#e2e3e5", color: "#383d41" },
  }[statusText] || { background: "#e2e3e5", color: "#383d41" };

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 850, margin: "30px auto", padding: "0 20px" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
            border: "1px solid #e5e7eb",
          }}
        >
          <h2 style={{ marginTop: 0, color: "#1b5e20" }}>
            📜 Land Ownership Verification
          </h2>

          <p style={{ color: "#555" }}>
            Upload your Pattadhar Passbook for this land. The document is
            securely reviewed by administrators and is not displayed to buyers.
          </p>

          {loading ? (
            <p>Loading verification status...</p>
          ) : (
            <>
              <div
                style={{
                  display: "inline-block",
                  padding: "8px 14px",
                  borderRadius: 20,
                  fontWeight: 700,
                  textTransform: "capitalize",
                  ...statusStyle,
                }}
              >
                Ownership: {statusText.replaceAll("_", " ")}
              </div>

              {status?.original_filename && (
                <p style={{ marginTop: 15 }}>
                  <strong>Submitted document:</strong>{" "}
                  {status.original_filename}
                </p>
              )}

              {status?.survey_number_snapshot && (
                <p>
                  <strong>Survey number at submission:</strong>{" "}
                  {status.survey_number_snapshot}
                </p>
              )}

              {status?.owner_name_snapshot && (
                <p>
                  <strong>Owner name at submission:</strong>{" "}
                  {status.owner_name_snapshot}
                </p>
              )}

              {status?.rejection_reason && (
                <div
                  style={{
                    marginTop: 15,
                    padding: 12,
                    borderRadius: 8,
                    background: "#fff3f3",
                    border: "1px solid #f5c2c7",
                    color: "#842029",
                  }}
                >
                  <strong>Admin feedback:</strong> {status.rejection_reason}
                </div>
              )}

              {(statusText === "not_submitted" ||
                statusText === "rejected" ||
                statusText === "changes_requested") && (
                <div style={{ marginTop: 25 }}>
                  <label
                    htmlFor={`passbook-${landId}`}
                    style={{ display: "block", fontWeight: 700, marginBottom: 8 }}
                  >
                    Pattadhar Passbook
                  </label>

                  <input
                    id={`passbook-${landId}`}
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />

                  {selectedFile && (
                    <p style={{ color: "#555" }}>
                      Selected: {selectedFile.name}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploading}
                    style={{
                      marginTop: 10,
                      background: uploading ? "#9e9e9e" : "#2e7d32",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "11px 18px",
                      cursor: uploading ? "not-allowed" : "pointer",
                      fontWeight: 700,
                    }}
                  >
                    {uploading ? "Uploading..." : "Submit Passbook"}
                  </button>
                </div>
              )}

              {statusText === "pending" && (
                <p style={{ marginTop: 20, color: "#856404" }}>
                  Your passbook is waiting for admin verification.
                </p>
              )}

              {statusText === "verified" && (
                <p style={{ marginTop: 20, color: "#155724", fontWeight: 700 }}>
                  ✓ Land ownership has been verified. The land can now proceed
                  through the normal admin approval process.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default LandOwnershipVerification;
