import { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import api from "../../services/api";

const DOCUMENT_LABELS = {
  aadhaar: "Aadhaar",
  pan: "PAN",
  voter_id: "Voter ID",
  driving_license: "Driving License",
  passport: "Passport",
  other: "Other",
};

const STATUS_META = {
  pending: { label: "Pending", background: "#fff3cd", color: "#856404" },
  changes_requested: {
    label: "Changes Requested",
    background: "#fff3e0",
    color: "#e65100",
  },
  verified: { label: "Verified", background: "#e8f5e9", color: "#1b5e20" },
  rejected: { label: "Rejected", background: "#ffebee", color: "#b71c1c" },
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function documentLabel(type) {
  return DOCUMENT_LABELS[type] || type || "—";
}

function KYCVerificationAdmin() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState(null);
  const [documentPreviewLoading, setDocumentPreviewLoading] = useState(false);
  const [filter, setFilter] = useState("all");

  const loadPending = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/kyc/admin/pending");
      setItems(response.data?.kyc_verifications || []);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to load the KYC verification queue."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  useEffect(() => {
    return () => {
      if (documentPreviewUrl) URL.revokeObjectURL(documentPreviewUrl);
    };
  }, [documentPreviewUrl]);

  const closeDocumentPreview = () => {
    if (documentPreviewUrl) URL.revokeObjectURL(documentPreviewUrl);
    setDocumentPreviewUrl(null);
  };

  const openVerification = async (verificationId) => {
    closeDocumentPreview();
    setDetailLoading(true);
    setError("");

    try {
      const response = await api.get(`/kyc/admin/${verificationId}`);
      setSelected(response.data);
      setReason(response.data?.rejection_reason || "");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to load KYC verification details."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const closeVerification = () => {
    closeDocumentPreview();
    setSelected(null);
    setReason("");
  };

  const review = async (action) => {
    if (!selected) return;

    if (
      (action === "reject" || action === "changes_requested") &&
      !reason.trim()
    ) {
      alert("Please enter a reason for rejection or requested changes.");
      return;
    }

    const confirmationText =
      action === "verify"
        ? "Verify this user's KYC document?"
        : action === "reject"
        ? "Reject this KYC submission?"
        : "Request changes to this KYC submission?";

    if (!window.confirm(confirmationText)) return;

    try {
      setReviewing(true);
      setError("");

      await api.post(`/kyc/admin/${selected.id}/review`, {
        action,
        reason: reason.trim() || null,
      });

      alert(
        action === "verify"
          ? "KYC verified successfully."
          : action === "reject"
          ? "KYC rejected successfully."
          : "Changes requested successfully."
      );

      closeVerification();
      await loadPending();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to review this KYC submission."
      );
    } finally {
      setReviewing(false);
    }
  };

  const viewDocument = async () => {
    if (!selected) return;

    try {
      setDocumentPreviewLoading(true);
      setError("");
      closeDocumentPreview();

      const response = await api.get(
        `/kyc/admin/${selected.id}/document`,
        { responseType: "blob" }
      );

      const contentType =
        selected.content_type || response.data?.type || "application/octet-stream";

      const viewableBlob = new Blob([response.data], {
        type: contentType,
      });

      const blobUrl = URL.createObjectURL(viewableBlob);
      setDocumentPreviewUrl(blobUrl);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to open the private KYC document."
      );
    } finally {
      setDocumentPreviewLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.status === filter);
  }, [items, filter]);

  const pendingCount = items.filter((item) => item.status === "pending").length;
  const changesCount = items.filter(
    (item) => item.status === "changes_requested"
  ).length;

  const selectedContentType = selected?.content_type || "";
  const isImage = selectedContentType.startsWith("image/");
  const isPdf = selectedContentType === "application/pdf";
  const selectedStatus = STATUS_META[selected?.status] || STATUS_META.pending;

  return (
    <>
      <Navbar />

      <main style={pageStyle}>
        <div style={containerStyle}>
          <div style={headerStyle}>
            <div>
              <div style={eyebrowStyle}>ADMIN • IDENTITY VERIFICATION</div>
              <h1 style={titleStyle}>🪪 KYC Verification</h1>
              <p style={subtitleStyle}>
                Review farmer and buyer identity documents. KYC documents are
                private and can only be opened through this admin-protected
                workflow.
              </p>
            </div>

            <button
              type="button"
              onClick={loadPending}
              disabled={loading}
              style={secondaryButtonStyle}
            >
              {loading ? "Refreshing..." : "↻ Refresh Queue"}
            </button>
          </div>

          <div style={summaryGridStyle}>
            <div style={summaryCardStyle}>
              <span style={summaryLabelStyle}>Total in queue</span>
              <strong style={summaryNumberStyle}>{items.length}</strong>
            </div>
            <div style={summaryCardStyle}>
              <span style={summaryLabelStyle}>Pending review</span>
              <strong style={summaryNumberStyle}>{pendingCount}</strong>
            </div>
            <div style={summaryCardStyle}>
              <span style={summaryLabelStyle}>Changes requested</span>
              <strong style={summaryNumberStyle}>{changesCount}</strong>
            </div>
          </div>

          {error && <div style={errorStyle}>{error}</div>}

          <div style={toolbarStyle}>
            <div>
              <strong>KYC review queue</strong>
              <span style={toolbarMutedStyle}>
                {filteredItems.length} record{filteredItems.length === 1 ? "" : "s"}
              </span>
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={filterStyle}
            >
              <option value="all">All active</option>
              <option value="pending">Pending</option>
              <option value="changes_requested">Changes requested</option>
            </select>
          </div>

          {loading ? (
            <div style={emptyCardStyle}>Loading KYC verification queue...</div>
          ) : filteredItems.length === 0 ? (
            <div style={emptyCardStyle}>
              <div style={{ fontSize: 42, marginBottom: 10 }}>✓</div>
              <strong>No KYC submissions require review.</strong>
              <p style={{ color: "#607d8b", marginBottom: 0 }}>
                New farmer or buyer submissions will appear here automatically.
              </p>
            </div>
          ) : (
            <div style={tableCardStyle}>
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      {["ID", "User", "Document", "Number", "Submitted", "Status", "Action"].map(
                        (heading) => (
                          <th key={heading} style={thStyle}>
                            {heading}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const meta = STATUS_META[item.status] || STATUS_META.pending;
                      return (
                        <tr key={item.id}>
                          <td style={tdStyle}>#{item.id}</td>
                          <td style={tdStyle}>
                            <strong>{item.user_name || "Unknown"}</strong>
                            <div style={mutedTextStyle}>{item.user_email || "—"}</div>
                            <div style={mutedTextStyle}>{item.user_mobile || "—"}</div>
                          </td>
                          <td style={tdStyle}>
                            <strong>{documentLabel(item.document_type)}</strong>
                            <div style={mutedTextStyle}>
                              {item.original_filename || "Document"}
                            </div>
                          </td>
                          <td style={tdStyle}>
                            {item.masked_document_number || "Not provided"}
                          </td>
                          <td style={tdStyle}>{formatDate(item.submitted_at)}</td>
                          <td style={tdStyle}>
                            <span style={statusBadge(meta)}>{meta.label}</span>
                          </td>
                          <td style={tdStyle}>
                            <button
                              type="button"
                              onClick={() => openVerification(item.id)}
                              style={primarySmallButtonStyle}
                              disabled={detailLoading}
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selected && (
            <div style={overlayStyle} role="dialog" aria-modal="true">
              <div style={modalStyle}>
                <div style={modalHeaderStyle}>
                  <div>
                    <div style={eyebrowStyle}>KYC RECORD #{selected.id}</div>
                    <h2 style={modalTitleStyle}>Identity Verification Review</h2>
                  </div>
                  <button
                    type="button"
                    onClick={closeVerification}
                    style={closeButtonStyle}
                    aria-label="Close review"
                  >
                    ×
                  </button>
                </div>

                <div style={detailGridStyle}>
                  <Detail label="Name" value={selected.user_name || "Not provided"} />
                  <Detail label="Email" value={selected.user_email || "Not provided"} />
                  <Detail label="Mobile" value={selected.user_mobile || "Not provided"} />
                  <Detail
                    label="Role"
                    value={
                      selected.user_role
                        ? String(selected.user_role).replace(/^./, (c) => c.toUpperCase())
                        : "Not supplied by KYC API"
                    }
                  />
                  <Detail label="Document" value={documentLabel(selected.document_type)} />
                  <Detail
                    label="Document number"
                    value={selected.masked_document_number || "Not provided"}
                  />
                  <Detail label="Filename" value={selected.original_filename || "—"} />
                  <Detail label="Content type" value={selected.content_type || "—"} />
                  <Detail label="Submitted" value={formatDate(selected.submitted_at)} />
                  <Detail label="Reviewed" value={formatDate(selected.reviewed_at)} />
                </div>

                <div style={statusPanelStyle(selectedStatus)}>
                  <strong>Status: {selectedStatus.label}</strong>
                  {selected.rejection_reason && (
                    <div style={{ marginTop: 7 }}>
                      <strong>Admin feedback:</strong> {selected.rejection_reason}
                    </div>
                  )}
                </div>

                <div style={securityBoxStyle}>
                  <strong>🔒 Private document handling</strong>
                  <p style={{ margin: "7px 0 0", color: "#455a64" }}>
                    The document is fetched through the authenticated admin endpoint
                    and displayed in a temporary browser-local preview. It is not
                    made public by this page.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={viewDocument}
                  disabled={documentPreviewLoading}
                  style={documentButtonStyle}
                >
                  {documentPreviewLoading ? "Opening document..." : "📄 View Private KYC Document"}
                </button>

                {documentPreviewUrl && (
                  <div style={previewContainerStyle}>
                    <div style={previewHeaderStyle}>
                      <strong>Private document preview</strong>
                      <button
                        type="button"
                        onClick={closeDocumentPreview}
                        style={previewCloseButtonStyle}
                      >
                        Close Preview
                      </button>
                    </div>

                    {isImage ? (
                      <div style={imagePreviewStyle}>
                        <img
                          src={documentPreviewUrl}
                          alt="Private KYC document"
                          style={imageStyle}
                        />
                      </div>
                    ) : isPdf ? (
                      <iframe
                        src={documentPreviewUrl}
                        title="Private KYC document"
                        style={pdfStyle}
                      />
                    ) : (
                      <p style={{ padding: 20 }}>
                        This document type cannot be previewed in the browser.
                      </p>
                    )}
                  </div>
                )}

                <div style={{ marginTop: 22 }}>
                  <label htmlFor="kyc-review-reason" style={labelStyle}>
                    Reason / Admin feedback
                  </label>
                  <textarea
                    id="kyc-review-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Required for reject or changes requested"
                    rows={4}
                    maxLength={1000}
                    style={textareaStyle}
                    disabled={reviewing}
                  />
                  <small style={{ color: "#78909c" }}>
                    Required when rejecting or requesting changes. Maximum 1000 characters.
                  </small>
                </div>

                <div style={actionRowStyle}>
                  <button
                    type="button"
                    onClick={() => review("verify")}
                    disabled={reviewing}
                    style={verifyButtonStyle}
                  >
                    {reviewing ? "Processing..." : "✓ Verify KYC"}
                  </button>
                  <button
                    type="button"
                    onClick={() => review("changes_requested")}
                    disabled={reviewing}
                    style={changesButtonStyle}
                  >
                    ↻ Request Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => review("reject")}
                    disabled={reviewing}
                    style={rejectButtonStyle}
                  >
                    ✕ Reject
                  </button>
                </div>

                <p style={noteStyle}>
                  Verification here approves the user's identity verification only.
                  It does not approve land listings or land ownership documents.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function Detail({ label, value }) {
  return (
    <div style={detailItemStyle}>
      <span style={detailLabelStyle}>{label}</span>
      <strong style={detailValueStyle}>{value}</strong>
    </div>
  );
}

const pageStyle = {
  minHeight: "calc(100vh - 80px)",
  background: "#f5f7fa",
  padding: "32px 20px 60px",
  boxSizing: "border-box",
};

const containerStyle = { maxWidth: 1250, margin: "0 auto" };

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  marginBottom: 24,
  flexWrap: "wrap",
};

const eyebrowStyle = {
  color: "#2e7d32",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 1.3,
  marginBottom: 6,
};

const titleStyle = { margin: 0, color: "#1b5e20", fontSize: 30 };
const subtitleStyle = { margin: "8px 0 0", color: "#607d8b", lineHeight: 1.55, maxWidth: 760 };

const secondaryButtonStyle = {
  border: "1px solid #2e7d32",
  background: "#fff",
  color: "#2e7d32",
  borderRadius: 9,
  padding: "11px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 14,
  marginBottom: 20,
};

const summaryCardStyle = {
  background: "#fff",
  borderRadius: 12,
  padding: 18,
  boxShadow: "0 4px 18px rgba(0,0,0,.06)",
  border: "1px solid #e6ebef",
};

const summaryLabelStyle = { display: "block", color: "#607d8b", fontSize: 13, marginBottom: 5 };
const summaryNumberStyle = { fontSize: 28, color: "#1b5e20" };

const errorStyle = {
  background: "#ffebee",
  color: "#b71c1c",
  border: "1px solid #ffcdd2",
  padding: "12px 15px",
  borderRadius: 9,
  marginBottom: 16,
};

const toolbarStyle = {
  background: "#fff",
  border: "1px solid #e6ebef",
  borderRadius: "12px 12px 0 0",
  padding: "14px 16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  flexWrap: "wrap",
};

const toolbarMutedStyle = { color: "#78909c", marginLeft: 10, fontSize: 13 };
const filterStyle = { padding: "9px 11px", border: "1px solid #cfd8dc", borderRadius: 8, background: "#fff" };

const tableCardStyle = {
  background: "#fff",
  border: "1px solid #e6ebef",
  borderTop: "none",
  borderRadius: "0 0 12px 12px",
  overflow: "hidden",
  boxShadow: "0 5px 20px rgba(0,0,0,.05)",
};

const tableStyle = { width: "100%", borderCollapse: "collapse", minWidth: 950 };
const thStyle = { textAlign: "left", padding: 13, background: "#f8fafb", borderBottom: "2px solid #e0e6e9", color: "#455a64", fontSize: 13 };
const tdStyle = { padding: 13, borderBottom: "1px solid #edf1f3", verticalAlign: "top", fontSize: 14 };
const mutedTextStyle = { color: "#78909c", fontSize: 12, marginTop: 3 };

const statusBadge = (meta) => ({
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: 20,
  background: meta.background,
  color: meta.color,
  fontWeight: 800,
  fontSize: 12,
  whiteSpace: "nowrap",
});

const primarySmallButtonStyle = {
  background: "#2e7d32",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "9px 13px",
  cursor: "pointer",
  fontWeight: 700,
};

const emptyCardStyle = {
  background: "#fff",
  border: "1px solid #e6ebef",
  borderRadius: 12,
  padding: 45,
  textAlign: "center",
  color: "#455a64",
  boxShadow: "0 5px 20px rgba(0,0,0,.05)",
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 2000,
  background: "rgba(15, 23, 30, .62)",
  padding: 20,
  overflowY: "auto",
  boxSizing: "border-box",
};

const modalStyle = {
  width: "min(100%, 1050px)",
  margin: "20px auto",
  background: "#fff",
  borderRadius: 16,
  padding: 24,
  boxSizing: "border-box",
  boxShadow: "0 20px 60px rgba(0,0,0,.25)",
};

const modalHeaderStyle = { display: "flex", justifyContent: "space-between", gap: 15, alignItems: "flex-start" };
const modalTitleStyle = { margin: 0, color: "#1b5e20", fontSize: 24 };
const closeButtonStyle = { border: "none", background: "#eceff1", width: 38, height: 38, borderRadius: "50%", fontSize: 26, cursor: "pointer", color: "#455a64" };

const detailGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 10,
  marginTop: 20,
};

const detailItemStyle = { background: "#f8fafb", borderRadius: 9, padding: 12, minWidth: 0 };
const detailLabelStyle = { display: "block", color: "#78909c", fontSize: 12, marginBottom: 4, fontWeight: 700 };
const detailValueStyle = { color: "#263238", overflowWrap: "anywhere" };

const statusPanelStyle = (meta) => ({
  marginTop: 16,
  padding: 13,
  borderRadius: 9,
  background: meta.background,
  color: meta.color,
});

const securityBoxStyle = { marginTop: 16, padding: 13, borderRadius: 9, background: "#eef7f0", border: "1px solid #c8e6c9" };

const documentButtonStyle = {
  marginTop: 16,
  background: "#6a1b9a",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "11px 16px",
  cursor: "pointer",
  fontWeight: 800,
};

const previewContainerStyle = { marginTop: 16, border: "1px solid #dfe5e8", borderRadius: 10, overflow: "hidden", background: "#f5f7fa" };
const previewHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 12px", background: "#eceff1" };
const previewCloseButtonStyle = { border: "1px solid #90a4ae", background: "#fff", borderRadius: 7, padding: "7px 10px", cursor: "pointer" };
const imagePreviewStyle = { maxHeight: "70vh", overflow: "auto", padding: 10, textAlign: "center" };
const imageStyle = { maxWidth: "100%", height: "auto", display: "block", margin: "0 auto" };
const pdfStyle = { width: "100%", height: "70vh", border: "none", background: "#fff" };

const labelStyle = { display: "block", fontWeight: 800, marginBottom: 8, color: "#37474f" };
const textareaStyle = { width: "100%", boxSizing: "border-box", padding: 11, borderRadius: 8, border: "1px solid #cfd8dc", resize: "vertical", fontFamily: "inherit", fontSize: 14 };
const actionRowStyle = { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 };

const actionButtonBase = { color: "#fff", border: "none", borderRadius: 8, padding: "11px 16px", cursor: "pointer", fontWeight: 800 };
const verifyButtonStyle = { ...actionButtonBase, background: "#2e7d32" };
const changesButtonStyle = { ...actionButtonBase, background: "#ef6c00" };
const rejectButtonStyle = { ...actionButtonBase, background: "#c62828" };
const noteStyle = { margin: "16px 0 0", color: "#607d8b", fontSize: 13, lineHeight: 1.5 };

export default KYCVerificationAdmin;
