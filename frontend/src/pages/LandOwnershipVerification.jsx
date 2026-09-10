import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

function LandOwnershipVerification() {
  // Get landId directly from:
  // /land-ownership/:landId
  const { landId } = useParams();

  const [status, setStatus] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fileRef = useRef(null);

  // =========================================================
  // Load ownership verification status
  // =========================================================
  const loadStatus = async () => {
    if (!landId) {
      setErrorMessage("Land ID is missing from the URL.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const response = await api.get(
        `/land-ownership/lands/${landId}/status`
      );

      setStatus(response.data);
    } catch (error) {
      console.error("Ownership status error:", error);

      if (error.response?.status === 404) {
        setStatus(null);
      } else if (error.response?.status === 401) {
        setErrorMessage(
          "Your login session has expired. Please login again."
        );
      } else if (error.response?.status === 403) {
        setErrorMessage(
          "You are not allowed to access ownership verification for this land."
        );
      } else {
        setErrorMessage(
          error.response?.data?.detail ||
            "Failed to load land ownership verification status."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // Load status when landId is available
  // =========================================================
  useEffect(() => {
    loadStatus();
  }, [landId]);

  // =========================================================
  // Select file
  // =========================================================
  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    setSelectedFile(file);
    setErrorMessage("");

    if (!file) {
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setErrorMessage(
        "Only PDF, JPG, PNG or WEBP files are allowed."
      );
      setSelectedFile(null);

      if (fileRef.current) {
        fileRef.current.value = "";
      }

      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("Maximum file size is 10 MB.");
      setSelectedFile(null);

      if (fileRef.current) {
        fileRef.current.value = "";
      }

      return;
    }
  };

  // =========================================================
  // Upload Pattadhar Passbook
  // =========================================================
  const handleUpload = async () => {
    if (!landId) {
      alert("Land ID is missing.");
      return;
    }

    if (!selectedFile) {
      alert("Please select your Pattadhar Passbook first.");
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      alert("Only PDF, JPG, PNG or WEBP files are allowed.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      alert("Maximum file size is 10 MB.");
      return;
    }

    try {
      setUploading(true);
      setErrorMessage("");

      const formData = new FormData();

      formData.append("file", selectedFile);

      await api.post(
        `/land-ownership/lands/${landId}/document`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      alert(
        "Pattadhar Passbook submitted successfully. It is now waiting for admin verification."
      );

      setSelectedFile(null);

      if (fileRef.current) {
        fileRef.current.value = "";
      }

      await loadStatus();
    } catch (error) {
      console.error("Passbook upload error:", error);

      const detail = error.response?.data?.detail;

      if (typeof detail === "string") {
        setErrorMessage(detail);
        alert(detail);
      } else {
        const message =
          "Failed to submit Pattadhar Passbook.";
        setErrorMessage(message);
        alert(message);
      }
    } finally {
      setUploading(false);
    }
  };

  // =========================================================
  // Status
  // =========================================================
  const statusText = (
    status?.status || "not_submitted"
  ).toLowerCase();

  // =========================================================
  // Status styles
  // =========================================================
  const statusStyleMap = {
    pending: {
      background: "#fff3cd",
      color: "#856404",
      border: "1px solid #ffeeba",
    },

    verified: {
      background: "#d4edda",
      color: "#155724",
      border: "1px solid #c3e6cb",
    },

    rejected: {
      background: "#f8d7da",
      color: "#721c24",
      border: "1px solid #f5c6cb",
    },

    changes_requested: {
      background: "#d1ecf1",
      color: "#0c5460",
      border: "1px solid #bee5eb",
    },

    not_submitted: {
      background: "#e2e3e5",
      color: "#383d41",
      border: "1px solid #d6d8db",
    },
  };

  const statusStyle =
    statusStyleMap[statusText] ||
    statusStyleMap.not_submitted;

  // =========================================================
  // Status label
  // =========================================================
  const getStatusLabel = () => {
    switch (statusText) {
      case "pending":
        return "⏳ Passbook Under Review";

      case "verified":
        return "✅ Land Ownership Verified";

      case "rejected":
        return "❌ Passbook Rejected";

      case "changes_requested":
        return "⚠️ Changes Requested";

      default:
        return "📄 Passbook Not Submitted";
    }
  };

  // =========================================================
  // Can upload/resubmit?
  // =========================================================
  const canSubmit =
    statusText === "not_submitted" ||
    statusText === "rejected" ||
    statusText === "changes_requested";

  return (
    <>
      <Navbar />

      <div
        style={{
          maxWidth: 850,
          margin: "30px auto",
          padding: "0 20px",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
            border: "1px solid #e5e7eb",
          }}
        >
          {/* =================================================
              Header
          ================================================= */}
          <h2
            style={{
              marginTop: 0,
              color: "#1b5e20",
            }}
          >
            📜 Land Ownership Verification
          </h2>

          <p
            style={{
              color: "#555",
              lineHeight: 1.6,
            }}
          >
            Upload your Pattadhar Passbook for this land.
            The document is securely reviewed by administrators
            and is not displayed to buyers.
          </p>

          {/* Land ID */}
          <div
            style={{
              marginBottom: 20,
              padding: "10px 14px",
              background: "#f5f5f5",
              borderRadius: 8,
              color: "#555",
            }}
          >
            <strong>Land ID:</strong> {landId || "-"}
          </div>

          {/* =================================================
              Error
          ================================================= */}
          {errorMessage && (
            <div
              style={{
                marginBottom: 20,
                padding: 14,
                borderRadius: 8,
                background: "#fff3f3",
                border: "1px solid #f5c2c7",
                color: "#842029",
                lineHeight: 1.5,
              }}
            >
              <strong>Error:</strong> {errorMessage}
            </div>
          )}

          {/* =================================================
              Loading
          ================================================= */}
          {loading ? (
            <div
              style={{
                padding: 20,
                textAlign: "center",
                color: "#777",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                Loading verification status...
              </p>
            </div>
          ) : (
            <>
              {/* =================================================
                  Status
              ================================================= */}
              <div
                style={{
                  display: "inline-block",
                  padding: "9px 16px",
                  borderRadius: 20,
                  fontWeight: 700,
                  ...statusStyle,
                }}
              >
                {getStatusLabel()}
              </div>

              {/* =================================================
                  Submitted Document
              ================================================= */}
              {status?.original_filename && (
                <div
                  style={{
                    marginTop: 20,
                    padding: 14,
                    background: "#f8f9fa",
                    borderRadius: 8,
                  }}
                >
                  <strong>Submitted document:</strong>{" "}
                  {status.original_filename}
                </div>
              )}

              {/* =================================================
                  Survey Number
              ================================================= */}
              {status?.survey_number_snapshot && (
                <p style={{ marginTop: 15 }}>
                  <strong>
                    Survey number at submission:
                  </strong>{" "}
                  {status.survey_number_snapshot}
                </p>
              )}

              {/* =================================================
                  Owner Name
              ================================================= */}
              {status?.owner_name_snapshot && (
                <p>
                  <strong>
                    Owner name at submission:
                  </strong>{" "}
                  {status.owner_name_snapshot}
                </p>
              )}

              {/* =================================================
                  Rejection / Admin Feedback
              ================================================= */}
              {status?.rejection_reason && (
                <div
                  style={{
                    marginTop: 15,
                    padding: 14,
                    borderRadius: 8,
                    background: "#fff3f3",
                    border: "1px solid #f5c2c7",
                    color: "#842029",
                    lineHeight: 1.5,
                  }}
                >
                  <strong>Admin feedback:</strong>{" "}
                  {status.rejection_reason}
                </div>
              )}

              {/* =================================================
                  Upload / Resubmit
              ================================================= */}
              {canSubmit && (
                <div
                  style={{
                    marginTop: 25,
                    padding: 20,
                    borderRadius: 10,
                    background: "#f9fff9",
                    border: "1px solid #c8e6c9",
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      color: "#1b5e20",
                    }}
                  >
                    📄 Pattadhar Passbook
                  </h3>

                  <p
                    style={{
                      color: "#555",
                      lineHeight: 1.5,
                    }}
                  >
                    Select a clear copy of your Pattadhar
                    Passbook. Accepted formats: PDF, JPG,
                    PNG or WEBP. Maximum size: 10 MB.
                  </p>

                  <label
                    htmlFor={`passbook-${landId}`}
                    style={{
                      display: "block",
                      fontWeight: 700,
                      marginBottom: 8,
                    }}
                  >
                    Select Passbook
                  </label>

                  <input
                    id={`passbook-${landId}`}
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                  />

                  {/* Selected file */}
                  {selectedFile && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 12,
                        background: "#f5f5f5",
                        borderRadius: 8,
                        color: "#555",
                      }}
                    >
                      <strong>Selected:</strong>{" "}
                      {selectedFile.name}
                      <br />
                      <small>
                        Size:{" "}
                        {(
                          selectedFile.size /
                          (1024 * 1024)
                        ).toFixed(2)}{" "}
                        MB
                      </small>
                    </div>
                  )}

                  {/* Upload button */}
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploading || !selectedFile}
                    style={{
                      marginTop: 15,
                      background:
                        uploading || !selectedFile
                          ? "#9e9e9e"
                          : "#2e7d32",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "12px 20px",
                      cursor:
                        uploading || !selectedFile
                          ? "not-allowed"
                          : "pointer",
                      fontWeight: 700,
                    }}
                  >
                    {uploading
                      ? "Uploading..."
                      : statusText === "not_submitted"
                      ? "Submit Passbook"
                      : "Resubmit Passbook"}
                  </button>
                </div>
              )}

              {/* =================================================
                  Pending
              ================================================= */}
              {statusText === "pending" && (
                <div
                  style={{
                    marginTop: 20,
                    padding: 15,
                    borderRadius: 8,
                    background: "#fff8e1",
                    border: "1px solid #ffe082",
                    color: "#856404",
                  }}
                >
                  <strong>
                    ⏳ Your passbook is under review.
                  </strong>

                  <p
                    style={{
                      marginBottom: 0,
                    }}
                  >
                    An administrator will check your
                    Pattadhar Passbook before the land can
                    be approved.
                  </p>
                </div>
              )}

              {/* =================================================
                  Verified
              ================================================= */}
              {statusText === "verified" && (
                <div
                  style={{
                    marginTop: 20,
                    padding: 15,
                    borderRadius: 8,
                    background: "#e8f5e9",
                    border: "1px solid #c8e6c9",
                    color: "#155724",
                  }}
                >
                  <strong>
                    ✓ Land ownership has been verified.
                  </strong>

                  <p
                    style={{
                      marginBottom: 0,
                    }}
                  >
                    The land can now proceed through the
                    normal admin approval process. Ownership
                    verification does not automatically
                    approve or publish the land.
                  </p>
                </div>
              )}

              {/* =================================================
                  Rejected
              ================================================= */}
              {statusText === "rejected" && (
                <div
                  style={{
                    marginTop: 20,
                    padding: 15,
                    borderRadius: 8,
                    background: "#ffebee",
                    border: "1px solid #ffcdd2",
                    color: "#721c24",
                  }}
                >
                  <strong>
                    ❌ Your passbook was rejected.
                  </strong>

                  <p
                    style={{
                      marginBottom: 0,
                    }}
                  >
                    Please review the admin feedback and
                    submit a corrected document.
                  </p>
                </div>
              )}

              {/* =================================================
                  Changes Requested
              ================================================= */}
              {statusText === "changes_requested" && (
                <div
                  style={{
                    marginTop: 20,
                    padding: 15,
                    borderRadius: 8,
                    background: "#fff3e0",
                    border: "1px solid #ffe0b2",
                    color: "#ef6c00",
                  }}
                >
                  <strong>
                    ⚠️ Changes are required.
                  </strong>

                  <p
                    style={{
                      marginBottom: 0,
                    }}
                  >
                    Please correct the passbook/document
                    according to the administrator's feedback
                    and resubmit it.
                  </p>
                </div>
              )}

              {/* =================================================
                  Not submitted
              ================================================= */}
              {statusText === "not_submitted" && (
                <div
                  style={{
                    marginTop: 20,
                    padding: 15,
                    borderRadius: 8,
                    background: "#f5f5f5",
                    border: "1px solid #ddd",
                    color: "#555",
                  }}
                >
                  <strong>
                    📄 Pattadhar Passbook not submitted yet.
                  </strong>

                  <p
                    style={{
                      marginBottom: 0,
                    }}
                  >
                    Submit your passbook above so an
                    administrator can verify land ownership.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default LandOwnershipVerification;