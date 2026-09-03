import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import api from "../../services/api";

function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("active");
  const [action, setAction] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFromDate, setAppliedFromDate] = useState("");
  const [appliedToDate, setAppliedToDate] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);

  const [exporting, setExporting] = useState(false);

  // =====================================================
  // FETCH ACTIVE ACTIVITY LOGS
  // =====================================================

  const fetchLogs = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      params.append("page", page);
      params.append("limit", limit);

      if (search) params.append("search", search);
      if (role) params.append("role", role);
      if (status) params.append("status", status);
      if (action) params.append("action", action);
      if (appliedFromDate) params.append("from_date", appliedFromDate);
      if (appliedToDate) params.append("to_date", appliedToDate);

      const response = await api.get(
        `/admin/activity-logs?${params.toString()}`
      );

      setLogs(response.data.logs || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error(
        "Failed to load activity logs:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to load activity logs."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, search, role, status, action, appliedFromDate, appliedToDate]);

  // =====================================================
  // APPLY FILTER
  // =====================================================

  const applyFilters = () => {
    if (fromDate && toDate && fromDate > toDate) {
      alert("From Date cannot be later than To Date.");
      return;
    }
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
    setPage(1);
  };

  // =====================================================
  // CLEAR FILTERS
  // =====================================================

  const clearFilters = () => {
    setSearch("");
    setRole("");
    setStatus("active");
    setAction("");
    setFromDate("");
    setToDate("");
    setAppliedFromDate("");
    setAppliedToDate("");
    setPage(1);
  };

  // =====================================================
  // EXPORT EXCEL
  // =====================================================

  const exportToExcel = async () => {
    if (!fromDate || !toDate) {
      alert(
        "Please select both From Date and To Date before exporting."
      );
      return;
    }

    if (fromDate > toDate) {
      alert(
        "From Date cannot be later than To Date."
      );
      return;
    }

    const confirmed = window.confirm(
      "Export the selected activity logs to Excel?\n\n" +
        "After a successful export, these logs will be archived " +
        "and removed from the active Activity Logs dashboard."
    );

    if (!confirmed) {
      return;
    }

    try {
      setExporting(true);

      const params = new URLSearchParams();

      params.append("from_date", fromDate);
      params.append("to_date", toDate);

      if (search) params.append("search", search);
      if (role) params.append("role", role);
      if (status) params.append("status", status);
      if (action) params.append("action", action);

      const response = await api.get(
        `/admin/activity-logs/export?${params.toString()}`,
        {
          responseType: "blob",
        }
      );

      // =================================================
      // CREATE DOWNLOAD
      // =================================================

      const blob = new Blob(
        [response.data],
        {
          type:
            "application/vnd.openxmlformats-" +
            "officedocument.spreadsheetml.sheet",
        }
      );

      const url =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      // Try to get filename from backend
      const contentDisposition =
        response.headers[
          "content-disposition"
        ];

      let filename =
        "activity_logs.xlsx";

      if (contentDisposition) {
        const filenameMatch =
          contentDisposition.match(
            /filename="?([^"]+)"?/
          );

        if (filenameMatch) {
          filename =
            filenameMatch[1];
        }
      }

      link.setAttribute(
        "download",
        filename
      );

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);

      // =================================================
      // REFRESH ACTIVE LOGS
      // =================================================

      await fetchLogs();

      alert(
        "Activity logs exported successfully.\n\n" +
          "The exported logs have been archived."
      );

    } catch (error) {
      console.error(
        "Export Activity Logs Error:",
        error
      );

      // Blob responses can contain JSON errors
      if (
        error.response?.data instanceof Blob
      ) {
        try {
          const text =
            await error.response.data.text();

          const errorData =
            JSON.parse(text);

          alert(
            errorData.detail ||
              "Failed to export activity logs."
          );
        } catch {
          alert(
            "Failed to export activity logs."
          );
        }
      } else {
        alert(
          error.response?.data?.detail ||
            "Failed to export activity logs."
        );
      }
    } finally {
      setExporting(false);
    }
  };

  // =====================================================
  // ACTION COLORS
  // =====================================================

  const getActionColor = (action) => {
    if (action === "LOGIN") return "#1565C0";

    if (action === "CREATE_LAND")
      return "#2E7D32";

    if (action === "UPDATE_LAND")
      return "#EF6C00";

    if (action === "DELETE_LAND")
      return "#C62828";

    if (action === "APPROVE_LAND")
      return "#2E7D32";

    if (action === "REJECT_LAND")
      return "#C62828";

    if (action === "REQUEST_CHANGES")
      return "#EF6C00";

    if (action === "UPLOAD_IMAGES")
      return "#6A1B9A";

    if (action === "DELETE_IMAGE")
      return "#C62828";

    if (action === "UPDATE_USER")
      return "#1565C0";

    if (action === "DELETE_USER")
      return "#C62828";

    if (action === "ADMIN_UPDATE_LAND")
      return "#1565C0";

    if (action === "ADMIN_DELETE_LAND")
      return "#C62828";

    if (action === "CHAT_MESSAGE_SENT")
      return "#6A1B9A";

    if (action === "CHAT_FILE_SENT")
      return "#6A1B9A";

    if (action === "CHAT_STARTED")
      return "#00897B";

    if (action === "LAND_FAVORITED")
      return "#D81B60";

    if (action === "LAND_UNFAVORITED")
      return "#C62828";

    return "#616161";
  };

  const totalPages =
    Math.ceil(total / limit);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <>
        <Navbar />

        <div
          style={{
            textAlign: "center",
            marginTop: "80px",
            fontSize: "22px",
            color: "#2E7D32",
            fontWeight: "bold",
          }}
        >
          Loading Activity Logs...
        </div>
      </>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <>
      <Navbar />

      <div
        style={{
          padding: "30px",
          backgroundColor: "#f4f4f4",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >

          {/* =================================================
              HEADER
          ================================================= */}

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "15px",
              flexWrap: "wrap",
              marginBottom: "10px",
            }}
          >
            <div>
              <h1
                style={{
                  color: "#2E7D32",
                  marginBottom: "8px",
                }}
              >
                📋 Activity Logs
              </h1>

              <p
                style={{
                  color: "#555",
                  margin: 0,
                }}
              >
                Track administrator and user
                actions across the Farmland
                Marketplace.
              </p>
            </div>

            <button
              onClick={fetchLogs}
              style={{
                padding: "11px 18px",
                background: "#1565C0",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              🔄 Refresh
            </button>
          </div>

          {/* =================================================
              FILTER / EXPORT PANEL
          ================================================= */}

          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "20px",
              marginTop: "25px",
              marginBottom: "25px",
              boxShadow:
                "0 3px 10px rgba(0,0,0,0.10)",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                color: "#2E7D32",
              }}
            >
              📊 Export Activity Logs
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(180px,1fr))",
                gap: "15px",
                alignItems: "end",
              }}
            >

              {/* SEARCH */}
              <div>
                <label style={labelStyle}>Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search user, email, action, description, target..."
                  style={inputStyle}
                />
              </div>

              {/* ROLE */}
              <div>
                <label style={labelStyle}>User Role</label>
                <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} style={inputStyle}>
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="farmer">Farmer</option>
                  <option value="buyer">Buyer</option>
                </select>
              </div>

              {/* LOG STATUS */}
              <div>
                <label style={labelStyle}>Log Status</label>
                <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={inputStyle}>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                  <option value="all">All Logs</option>
                </select>
              </div>

              {/* FROM DATE */}

              <div>
                <label
                  style={labelStyle}
                >
                  From Date
                </label>

                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) =>
                    setFromDate(
                      e.target.value
                    )
                  }
                  style={inputStyle}
                />
              </div>

              {/* TO DATE */}

              <div>
                <label
                  style={labelStyle}
                >
                  To Date
                </label>

                <input
                  type="date"
                  value={toDate}
                  onChange={(e) =>
                    setToDate(
                      e.target.value
                    )
                  }
                  style={inputStyle}
                />
              </div>

              {/* ACTION */}

              <div>
                <label
                  style={labelStyle}
                >
                  Action
                </label>

                <select
                  value={action}
                  onChange={(e) => {
                    setAction(
                      e.target.value
                    );
                    setPage(1);
                  }}
                  style={inputStyle}
                >
                  <option value="">
                    All Actions
                  </option>

                  <option value="LOGIN">
                    LOGIN
                  </option>

                  <option value="CREATE_LAND">
                    CREATE_LAND
                  </option>

                  <option value="UPDATE_LAND">
                    UPDATE_LAND
                  </option>

                  <option value="DELETE_LAND">
                    DELETE_LAND
                  </option>

                  <option value="APPROVE_LAND">
                    APPROVE_LAND
                  </option>

                  <option value="REJECT_LAND">
                    REJECT_LAND
                  </option>

                  <option value="REQUEST_CHANGES">
                    REQUEST_CHANGES
                  </option>

                  <option value="UPLOAD_IMAGES">
                    UPLOAD_IMAGES
                  </option>

                  <option value="DELETE_IMAGE">
                    DELETE_IMAGE
                  </option>

                  <option value="UPDATE_USER">
                    UPDATE_USER
                  </option>

                  <option value="DELETE_USER">
                    DELETE_USER
                  </option>

                  <option value="CHAT_MESSAGE_SENT">
                    CHAT_MESSAGE_SENT
                  </option>

                  <option value="CHAT_FILE_SENT">
                    CHAT_FILE_SENT
                  </option>

                  <option value="CHAT_STARTED">
                    CHAT_STARTED
                  </option>

                  <option value="LAND_FAVORITED">
                    LAND_FAVORITED
                  </option>

                  <option value="LAND_UNFAVORITED">
                    LAND_UNFAVORITED
                  </option>
                </select>
              </div>

              {/* FILTER BUTTON */}

              <button
                onClick={applyFilters}
                style={{
                  ...actionButtonStyle,
                  background: "#2E7D32",
                }}
              >
                🔎 Apply Filter
              </button>

              {/* CLEAR BUTTON */}

              <button
                onClick={clearFilters}
                style={{
                  ...actionButtonStyle,
                  background: "#757575",
                }}
              >
                ✕ Clear
              </button>

              {/* EXPORT BUTTON */}

              <button
                onClick={exportToExcel}
                disabled={exporting}
                style={{
                  ...actionButtonStyle,
                  background: exporting
                    ? "#9E9E9E"
                    : "#00897B",
                  cursor: exporting
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {exporting
                  ? "⏳ Exporting..."
                  : "📥 Export Excel"}
              </button>
            </div>

            <p
              style={{
                marginBottom: 0,
                marginTop: "15px",
                color: "#777",
                fontSize: "13px",
              }}
            >
              ⚠️ After a successful export,
              the exported logs will be archived
              and removed from the active Activity
              Logs dashboard. They remain preserved
              in the database.
            </p>
          </div>

          {/* =================================================
              ACTIVE LOG COUNT
          ================================================= */}

          <div
            style={{
              marginBottom: "15px",
              color: "#555",
              fontWeight: "bold",
            }}
          >
            Active Logs: {total}
          </div>

          {/* =================================================
              LOG TABLE
          ================================================= */}

          <div
            style={{
              background: "white",
              borderRadius: "10px",
              boxShadow:
                "0 2px 8px rgba(0,0,0,0.15)",
              overflowX: "auto",
            }}
          >
            {logs.length === 0 ? (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                }}
              >
                <h3>
                  No active activity logs
                  found.
                </h3>

                <p
                  style={{
                    color: "#777",
                  }}
                >
                  Exported logs are archived
                  and no longer appear here.
                </p>
              </div>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse:
                    "collapse",
                  minWidth: "900px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor:
                        "#2E7D32",
                      color: "white",
                    }}
                  >
                    <th style={thStyle}>
                      ID
                    </th>

                    <th style={thStyle}>
                      User
                    </th>

                    <th style={thStyle}>
                      Action
                    </th>
                    <th style={thStyle}>
                      Status
                    </th>

                    <th style={thStyle}>
                      Description
                    </th>

                    <th style={thStyle}>
                      Target
                    </th>

                    <th style={thStyle}>
                      Date & Time
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      style={{
                        background:
                          log.id % 2 === 0
                            ? "#fff"
                            : "#fafafa",
                      }}
                    >
                      <td
                        style={tdStyle}
                      >
                        {log.id}
                      </td>

                      <td
                        style={tdStyle}
                      >
                        <strong>
                          {log.user_name ||
                            "Unknown"}
                        </strong>

                        <br />

                        <small
                          style={{
                            color:
                              "#666",
                          }}
                        >
                          {log.user_email || ""}
                          {log.user_role && log.user_role !== "system" ? ` • ${log.user_role}` : ""}
                        </small>
                      </td>

                      <td
                        style={tdStyle}
                      >
                        <span
                          style={{
                            display:
                              "inline-block",
                            padding:
                              "6px 10px",
                            borderRadius:
                              "20px",
                            backgroundColor:
                              getActionColor(
                                log.action
                              ),
                            color:
                              "white",
                            fontWeight:
                              "bold",
                            fontSize:
                              "12px",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td style={tdStyle}>
                        <span style={{ display: "inline-block", padding: "5px 9px", borderRadius: "15px", background: log.is_archived ? "#757575" : "#2E7D32", color: "#fff", fontWeight: "bold", fontSize: "11px" }}>
                          {log.is_archived ? "ARCHIVED" : "ACTIVE"}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {log.description}
                      </td>

                      <td
                        style={tdStyle}
                      >
                        {log.target_type ||
                          "-"}

                        {log.target_id ? ` #${log.target_id}` : ""}
                        <br />
                        <button
                          onClick={() => setSelectedLog(log)}
                          style={{ border: "none", background: "transparent", color: "#1565C0", cursor: "pointer", fontWeight: "bold", padding: 0, marginTop: "6px" }}
                        >
                          View Details
                        </button>
                      </td>

                      <td
                        style={tdStyle}
                      >
                        {log.created_at
                          ? new Date(
                              log.created_at
                            ).toLocaleString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* =================================================
              PAGINATION
          ================================================= */}

          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent:
                  "center",
                alignItems: "center",
                gap: "15px",
                marginTop: "25px",
                flexWrap: "wrap",
              }}
            >
              <button
                disabled={
                  page === 1
                }
                onClick={() =>
                  setPage(
                    (previous) =>
                      previous - 1
                  )
                }
                style={{
                  ...paginationButtonStyle,
                  opacity:
                    page === 1
                      ? 0.5
                      : 1,
                  cursor:
                    page === 1
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                ← Previous
              </button>

              <span
                style={{
                  fontWeight: "bold",
                  color: "#444",
                }}
              >
                Page {page} of{" "}
                {totalPages}
              </span>

              <button
                disabled={
                  page >= totalPages
                }
                onClick={() =>
                  setPage(
                    (previous) =>
                      previous + 1
                  )
                }
                style={{
                  ...paginationButtonStyle,
                  opacity:
                    page >= totalPages
                      ? 0.5
                      : 1,
                  cursor:
                    page >= totalPages
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                Next →
              </button>
            </div>
          )}

          {selectedLog && (
            <div onClick={() => setSelectedLog(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1000 }}>
              <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: "14px", width: "100%", maxWidth: "650px", maxHeight: "85vh", overflowY: "auto", padding: "25px", boxShadow: "0 10px 35px rgba(0,0,0,0.25)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "15px" }}>
                  <h2 style={{ margin: 0, color: "#2E7D32" }}>Activity Log Details</h2>
                  <button onClick={() => setSelectedLog(null)} style={{ ...actionButtonStyle, background: "#757575", cursor: "pointer" }}>Close</button>
                </div>
                <div style={{ marginTop: "20px", display: "grid", gap: "12px" }}>
                  <div><strong>ID:</strong> {selectedLog.id}</div>
                  <div><strong>User:</strong> {selectedLog.user_name || "System"}</div>
                  <div><strong>Email:</strong> {selectedLog.user_email || "-"}</div>
                  <div><strong>Role:</strong> {selectedLog.user_role || "system"}</div>
                  <div><strong>Action:</strong> {selectedLog.action}</div>
                  <div><strong>Status:</strong> {selectedLog.is_archived ? "Archived" : "Active"}</div>
                  <div><strong>Target:</strong> {selectedLog.target_type || "-"}{selectedLog.target_id ? ` #${selectedLog.target_id}` : ""}</div>
                  <div><strong>Date & Time:</strong> {selectedLog.created_at ? new Date(selectedLog.created_at).toLocaleString() : "-"}</div>
                  {selectedLog.archived_at && <div><strong>Archived At:</strong> {new Date(selectedLog.archived_at).toLocaleString()}</div>}
                  <div><strong>Description:</strong><div style={{ marginTop: "6px", padding: "12px", background: "#f5f5f5", borderRadius: "8px", whiteSpace: "pre-wrap" }}>{selectedLog.description || "No description"}</div></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}


// =========================================================
// STYLES
// =========================================================

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontWeight: "bold",
  color: "#444",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px",
  border: "1px solid #ccc",
  borderRadius: "7px",
  background: "#fff",
};

const actionButtonStyle = {
  border: "none",
  color: "#fff",
  padding: "10px 14px",
  borderRadius: "7px",
  fontWeight: "bold",
  minHeight: "40px",
};

const thStyle = {
  padding: "14px",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "12px 14px",
  borderBottom: "1px solid #ddd",
  verticalAlign: "top",
};

const paginationButtonStyle = {
  padding: "9px 18px",
  border: "none",
  borderRadius: "5px",
  backgroundColor: "#2E7D32",
  color: "white",
};

export default ActivityLogs;