import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import api from "../../services/api";

function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      const response = await api.get(
        `/admin/activity-logs?page=${page}&limit=${limit}`
      );

      setLogs(response.data.logs || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error("Failed to load activity logs:", error);

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
  }, [page]);

  const totalPages = Math.ceil(total / limit);

  const getActionColor = (action) => {
    if (action === "LOGIN") return "#1565C0";
    if (action === "CREATE_LAND") return "#2E7D32";
    if (action === "UPDATE_LAND") return "#EF6C00";
    if (action === "DELETE_LAND") return "#C62828";
    if (action === "APPROVE_LAND") return "#2E7D32";
    if (action === "REJECT_LAND") return "#C62828";
    if (action === "REQUEST_CHANGES") return "#EF6C00";
    if (action === "UPLOAD_IMAGES") return "#6A1B9A";
    if (action === "DELETE_IMAGE") return "#C62828";
    if (action === "UPDATE_USER") return "#1565C0";
    if (action === "DELETE_USER") return "#C62828";
    if (action === "ADMIN_UPDATE_LAND") return "#1565C0";
    if (action === "ADMIN_DELETE_LAND") return "#C62828";

    return "#616161";
  };

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
          <h1 style={{ color: "#2E7D32" }}>
            Activity Logs
          </h1>

          <p style={{ color: "#555" }}>
            Track administrator and user actions across the
            Farmland Marketplace.
          </p>

          <div
            style={{
              background: "white",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
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
                <h3>No activity logs found.</h3>
              </div>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "900px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: "#2E7D32",
                      color: "white",
                    }}
                  >
                    <th style={thStyle}>ID</th>
                    <th style={thStyle}>User</th>
                    <th style={thStyle}>Action</th>
                    <th style={thStyle}>Description</th>
                    <th style={thStyle}>Target</th>
                    <th style={thStyle}>Date & Time</th>
                  </tr>
                </thead>

                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={tdStyle}>
                        {log.id}
                      </td>

                      <td style={tdStyle}>
                        <strong>
                          {log.user_name || "Unknown"}
                        </strong>

                        <br />

                        <small>
                          {log.user_email || ""}
                        </small>
                      </td>

                      <td style={tdStyle}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "6px 10px",
                            borderRadius: "20px",
                            backgroundColor:
                              getActionColor(log.action),
                            color: "white",
                            fontWeight: "bold",
                            fontSize: "12px",
                          }}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td style={tdStyle}>
                        {log.description}
                      </td>

                      <td style={tdStyle}>
                        {log.target_type || "-"}
                        {log.target_id
                          ? ` #${log.target_id}`
                          : ""}
                      </td>

                      <td style={tdStyle}>
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

          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "15px",
                marginTop: "25px",
              }}
            >
              <button
                disabled={page === 1}
                onClick={() =>
                  setPage((previous) => previous - 1)
                }
                style={paginationButtonStyle}
              >
                ← Previous
              </button>

              <span>
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((previous) => previous + 1)
                }
                style={paginationButtonStyle}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

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
  cursor: "pointer",
};

export default ActivityLogs;