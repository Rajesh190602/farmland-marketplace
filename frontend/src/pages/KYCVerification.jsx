import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const DOCUMENT_TYPES = [
  { value: "aadhaar", label: "Aadhaar Card" },
  { value: "pan", label: "PAN Card" },
  { value: "voter_id", label: "Voter ID" },
  { value: "driving_license", label: "Driving License" },
  { value: "passport", label: "Passport" },
  { value: "other", label: "Other Government ID" },
];

const STATUS_META = {
  not_submitted: {
    label: "Not Submitted",
    icon: "📝",
    background: "#FFF8E1",
    color: "#8D6E00",
  },
  pending: {
    label: "Pending Verification",
    icon: "⏳",
    background: "#E3F2FD",
    color: "#1565C0",
  },
  verified: {
    label: "Verified",
    icon: "✓",
    background: "#E8F5E9",
    color: "#2E7D32",
  },
  rejected: {
    label: "Rejected",
    icon: "✕",
    background: "#FFEBEE",
    color: "#C62828",
  },
  changes_requested: {
    label: "Changes Requested",
    icon: "🔄",
    background: "#FFF3E0",
    color: "#E65100",
  },
};

function getRole() {
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  return (
    sessionStorage.getItem("role") ||
    sessionStorage.getItem("user_role") ||
    storedUser.role ||
    ""
  )
    .trim()
    .toLowerCase();
}

function KYCVerification() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const role = getRole();
  const isBuyer = role === "buyer";
  const isFarmer = role === "farmer";

  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [documentType, setDocumentType] = useState("aadhaar");
  const [documentNumber, setDocumentNumber] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const status = String(
    verification?.status || "not_submitted"
  ).toLowerCase();

  const statusMeta =
    STATUS_META[status] || STATUS_META.not_submitted;

  const canSubmit =
    (isFarmer || isBuyer) &&
    !submitting &&
    selectedFile &&
    ["not_submitted", "rejected", "changes_requested"].includes(status);

  const roleLabel = isBuyer ? "Buyer" : isFarmer ? "Farmer" : "User";
  const verifiedLabel = isBuyer ? "Verified Buyer" : "Verified Farmer";

  const maskedNumber = verification?.masked_document_number || "";

  const loadKyc = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/kyc/me");
      setVerification(response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setVerification(null);
      } else {
        setError(
          err.response?.data?.detail ||
            "Unable to load your KYC verification status."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isFarmer && !isBuyer) {
      setLoading(false);
      setError("KYC verification is available only for farmers and buyers.");
      return;
    }

    loadKyc();
  }, [isFarmer, isBuyer]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setError("");
    setSuccess("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setSelectedFile(null);
      event.target.value = "";
      setError("Only PDF, JPG, PNG, and WEBP files are allowed.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setSelectedFile(null);
      event.target.value = "";
      setError("KYC document must be 10 MB or smaller.");
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedFile) {
      setError("Please select your KYC document.");
      return;
    }

    if (!documentType) {
      setError("Please select a document type.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("document_type", documentType);

    if (documentNumber.trim()) {
      formData.append("document_number", documentNumber.trim());
    }

    try {
      setSubmitting(true);

      const response = await api.post("/kyc/submit", formData);

      setSuccess(
        response.data?.message ||
          "KYC document submitted successfully. It is waiting for admin verification."
      );

      setSelectedFile(null);
      setDocumentNumber("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadKyc();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "KYC submission failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const selectedDocumentName = useMemo(() => {
    return (
      DOCUMENT_TYPES.find(
        (item) => item.value === verification?.document_type
      )?.label ||
      verification?.document_type ||
      "—"
    );
  }, [verification]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={loadingStyle}>Loading KYC verification...</div>
        </div>
      </div>
    );
  }

  if (!isFarmer && !isBuyer) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={titleStyle}>🪪 KYC Verification</h2>
          <div style={alertError}>{error}</div>
          <button style={secondaryButton} onClick={() => navigate("/home")}>
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  const isVerified = status === "verified";
  const canEdit =
    ["not_submitted", "rejected", "changes_requested"].includes(status);

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div>
            <div style={eyebrowStyle}>IDENTITY VERIFICATION</div>
            <h1 style={titleStyle}>🪪 {roleLabel} KYC Verification</h1>
            <p style={subtitleStyle}>
              Verify your identity to build trust in the Farmland Marketplace.
            </p>
          </div>

          <div
            style={{
              ...statusBadgeStyle,
              background: statusMeta.background,
              color: statusMeta.color,
            }}
          >
            <span style={{ fontSize: 18 }}>{statusMeta.icon}</span>
            <span>{isVerified ? `✓ ${verifiedLabel}` : statusMeta.label}</span>
          </div>
        </div>

        {success && <div style={alertSuccess}>{success}</div>}
        {error && <div style={alertError}>{error}</div>}

        {isVerified ? (
          <div style={verifiedCardStyle}>
            <div style={verifiedIconStyle}>✓</div>
            <div>
              <h2 style={{ margin: "0 0 8px", color: "#1B5E20" }}>
                {verifiedLabel}
              </h2>
              <p style={{ margin: 0, color: "#455A64", lineHeight: 1.6 }}>
                Your identity has been verified by the administrator.
                Your verification badge can now be shown on your marketplace
                profile.
              </p>
            </div>
          </div>
        ) : (
          <>
            {verification && (
              <div style={statusPanelStyle}>
                <div style={{ fontWeight: "700", marginBottom: 8 }}>
                  Current verification
                </div>

                <div style={detailGridStyle}>
                  <div>
                    <span style={detailLabelStyle}>Status</span>
                    <strong>{statusMeta.label}</strong>
                  </div>

                  <div>
                    <span style={detailLabelStyle}>Document</span>
                    <strong>{selectedDocumentName}</strong>
                  </div>

                  <div>
                    <span style={detailLabelStyle}>Document number</span>
                    <strong>{maskedNumber || "Not provided"}</strong>
                  </div>

                  <div>
                    <span style={detailLabelStyle}>Submitted</span>
                    <strong>{formatDate(verification.submitted_at)}</strong>
                  </div>
                </div>

                {verification.rejection_reason && (
                  <div style={reasonBoxStyle}>
                    <strong>
                      {status === "rejected"
                        ? "Rejection reason"
                        : "Admin message"}
                    </strong>
                    <div style={{ marginTop: 6 }}>
                      {verification.rejection_reason}
                    </div>
                  </div>
                )}
              </div>
            )}

            {status === "pending" && (
              <div style={infoBoxStyle}>
                ⏳ Your KYC document is currently under admin review.
                You do not need to submit it again unless the administrator
                requests changes.
              </div>
            )}

            {status === "changes_requested" && (
              <div style={warningBoxStyle}>
                🔄 The administrator requested changes. Please review the
                message above and submit a corrected document.
              </div>
            )}

            {status === "rejected" && (
              <div style={warningBoxStyle}>
                ⚠️ Your previous KYC submission was rejected. Correct the
                information/document and submit again.
              </div>
            )}

            <form onSubmit={handleSubmit} style={formCardStyle}>
              <h2 style={sectionTitleStyle}>
                {verification ? "Submit Updated KYC" : "Submit KYC Document"}
              </h2>

              <p style={formHelpStyle}>
                Upload one valid government-issued identity document. The
                document is stored privately and is available only to
                authorized administrators for verification.
              </p>

              <div style={fieldStyle}>
                <label style={labelStyle}>Document Type *</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  style={inputStyle}
                  disabled={!canEdit || submitting}
                  required
                >
                  {DOCUMENT_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Document Number{" "}
                  <span style={{ fontWeight: "400", color: "#78909C" }}>
                    (optional)
                  </span>
                </label>
                <input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Enter document number"
                  style={inputStyle}
                  disabled={!canEdit || submitting}
                  maxLength={100}
                />
                <small style={hintStyle}>
                  Only a masked suffix will be stored. The complete number is
                  not returned to the frontend.
                </small>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Identity Document *</label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  style={fileInputStyle}
                  disabled={!canEdit || submitting}
                  required
                />

                <small style={hintStyle}>
                  PDF, JPG, PNG or WEBP • Maximum 10 MB
                </small>

                {selectedFile && (
                  <div style={selectedFileStyle}>
                    <span>📎 {selectedFile.name}</span>
                    <span>
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                )}
              </div>

              <div style={securityBoxStyle}>
                <strong>🔒 Privacy & Security</strong>
                <ul style={{ margin: "8px 0 0 20px", padding: 0 }}>
                  <li>Your KYC document is stored as a private resource.</li>
                  <li>Farmers and buyers cannot access each other's documents.</li>
                  <li>The full document number is not exposed in KYC status.</li>
                  <li>Only authorized administrators can review the document.</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                style={{
                  ...primaryButton,
                  opacity: canSubmit ? 1 : 0.55,
                  cursor: canSubmit ? "pointer" : "not-allowed",
                }}
              >
                {submitting
                  ? "Submitting..."
                  : verification
                  ? "🔄 Submit Updated KYC"
                  : "🪪 Submit KYC for Verification"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "calc(100vh - 80px)",
  background: "#F5F7FA",
  padding: "35px 20px 60px",
  boxSizing: "border-box",
};

const containerStyle = {
  maxWidth: "1000px",
  margin: "0 auto",
};

const cardStyle = {
  maxWidth: "700px",
  margin: "50px auto",
  background: "#fff",
  borderRadius: "16px",
  padding: "30px",
  boxShadow: "0 8px 25px rgba(0,0,0,.08)",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "25px",
  flexWrap: "wrap",
};

const eyebrowStyle = {
  color: "#2E7D32",
  fontSize: "12px",
  fontWeight: "800",
  letterSpacing: "1.4px",
  marginBottom: "6px",
};

const titleStyle = {
  margin: 0,
  color: "#1B5E20",
  fontSize: "30px",
};

const subtitleStyle = {
  margin: "8px 0 0",
  color: "#607D8B",
  lineHeight: 1.5,
};

const statusBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 15px",
  borderRadius: "30px",
  fontWeight: "800",
  whiteSpace: "nowrap",
};

const verifiedCardStyle = {
  display: "flex",
  alignItems: "center",
  gap: "20px",
  background: "#E8F5E9",
  border: "1px solid #A5D6A7",
  borderRadius: "16px",
  padding: "25px",
};

const verifiedIconStyle = {
  width: "58px",
  height: "58px",
  borderRadius: "50%",
  background: "#2E7D32",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "32px",
  fontWeight: "900",
  flexShrink: 0,
};

const statusPanelStyle = {
  background: "#fff",
  borderRadius: "16px",
  padding: "22px",
  boxShadow: "0 5px 18px rgba(0,0,0,.06)",
  marginBottom: "20px",
};

const detailGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "16px",
};

const detailLabelStyle = {
  display: "block",
  color: "#78909C",
  fontSize: "12px",
  marginBottom: "4px",
};

const reasonBoxStyle = {
  marginTop: "18px",
  background: "#FFF8E1",
  border: "1px solid #FFE082",
  borderRadius: "10px",
  padding: "14px",
  color: "#6D4C41",
};

const infoBoxStyle = {
  background: "#E3F2FD",
  border: "1px solid #90CAF9",
  color: "#0D47A1",
  borderRadius: "10px",
  padding: "14px 16px",
  marginBottom: "20px",
  lineHeight: 1.5,
};

const warningBoxStyle = {
  background: "#FFF3E0",
  border: "1px solid #FFCC80",
  color: "#E65100",
  borderRadius: "10px",
  padding: "14px 16px",
  marginBottom: "20px",
  lineHeight: 1.5,
};

const formCardStyle = {
  background: "#fff",
  borderRadius: "16px",
  padding: "28px",
  boxShadow: "0 5px 18px rgba(0,0,0,.06)",
};

const sectionTitleStyle = {
  margin: "0 0 8px",
  color: "#263238",
};

const formHelpStyle = {
  margin: "0 0 22px",
  color: "#607D8B",
  lineHeight: 1.6,
};

const fieldStyle = {
  marginBottom: "20px",
};

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  fontWeight: "700",
  color: "#37474F",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  border: "1px solid #CFD8DC",
  borderRadius: "9px",
  outline: "none",
  fontSize: "15px",
  background: "#fff",
};

const fileInputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px",
  border: "1px dashed #90A4AE",
  borderRadius: "9px",
  background: "#FAFAFA",
};

const hintStyle = {
  display: "block",
  marginTop: "6px",
  color: "#78909C",
  fontSize: "12px",
  lineHeight: 1.4,
};

const selectedFileStyle = {
  marginTop: "10px",
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  background: "#F1F8E9",
  borderRadius: "8px",
  padding: "10px 12px",
  color: "#33691E",
  fontSize: "13px",
};

const securityBoxStyle = {
  background: "#ECEFF1",
  borderRadius: "10px",
  padding: "14px 16px",
  color: "#455A64",
  fontSize: "13px",
  lineHeight: 1.5,
  marginBottom: "20px",
};

const primaryButton = {
  width: "100%",
  border: "none",
  borderRadius: "10px",
  padding: "14px 18px",
  background: "#2E7D32",
  color: "#fff",
  fontSize: "15px",
  fontWeight: "800",
};

const secondaryButton = {
  border: "none",
  borderRadius: "10px",
  padding: "12px 18px",
  background: "#607D8B",
  color: "#fff",
  fontWeight: "700",
  cursor: "pointer",
};

const alertSuccess = {
  background: "#E8F5E9",
  border: "1px solid #A5D6A7",
  color: "#1B5E20",
  borderRadius: "10px",
  padding: "13px 15px",
  marginBottom: "18px",
};

const alertError = {
  background: "#FFEBEE",
  border: "1px solid #EF9A9A",
  color: "#B71C1C",
  borderRadius: "10px",
  padding: "13px 15px",
  marginBottom: "18px",
};

const loadingStyle = {
  textAlign: "center",
  color: "#2E7D32",
  fontWeight: "700",
  padding: "40px",
};

export default KYCVerification;
