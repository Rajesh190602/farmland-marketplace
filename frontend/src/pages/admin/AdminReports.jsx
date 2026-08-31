import { useEffect, useState } from "react";
import api from "../../services/api";

function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    resolved: 0,
    dismissed: 0,
  });

  // =====================================================
  // LOAD REPORTS
  // =====================================================

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);

      const response = await api.get("/admin/reports");

      setReports(response.data?.reports || []);

      setStats({
        total: response.data?.total || 0,
        pending: response.data?.pending || 0,
        resolved: response.data?.resolved || 0,
        dismissed: response.data?.dismissed || 0,
      });
    } catch (error) {
      console.error("Failed to load reports:", error);

      alert(
        error.response?.data?.detail ||
          "Failed to load reports."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FILTER REPORTS
  // =====================================================

  const filteredReports = reports.filter((report) => {
    const typeMatches =
      typeFilter === "all" ||
      report.report_type === typeFilter;

    const statusMatches =
      statusFilter === "all" ||
      report.status === statusFilter;

    return typeMatches && statusMatches;
  });

  // =====================================================
  // STATUS STYLE
  // =====================================================

  const getStatusStyle = (status) => {
    if (status === "pending") {
      return {
        background: "#FFF3E0",
        color: "#EF6C00",
      };
    }

    if (status === "resolved") {
      return {
        background: "#E8F5E9",
        color: "#2E7D32",
      };
    }

    if (status === "dismissed") {
      return {
        background: "#EEEEEE",
        color: "#616161",
      };
    }

    return {
      background: "#EEEEEE",
      color: "#616161",
    };
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 20px",
          color: "#2E7D32",
          fontSize: "22px",
          fontWeight: "bold",
        }}
      >
        Loading Reports...
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      {/* Header */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "15px",
          flexWrap: "wrap",
          marginBottom: "25px",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              color: "#1B5E20",
            }}
          >
            🚩 Reports
          </h1>

          <p
            style={{
              marginTop: "8px",
              color: "#666",
            }}
          >
            Review reports submitted by marketplace users.
          </p>
        </div>

        <button
          onClick={loadReports}
          style={{
            background: "#1976D2",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "11px 18px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Statistics */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "15px",
          marginBottom: "25px",
        }}
      >
        <StatCard
          title="Total Reports"
          value={stats.total}
          icon="🚩"
        />

        <StatCard
          title="Pending"
          value={stats.pending}
          icon="🟠"
        />

        <StatCard
          title="Resolved"
          value={stats.resolved}
          icon="🟢"
        />

        <StatCard
          title="Dismissed"
          value={stats.dismissed}
          icon="⚪"
        />
      </div>

      {/* Filters */}

      <div
        style={{
          background: "white",
          padding: "18px",
          borderRadius: "12px",
          marginBottom: "25px",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.08)",
          display: "flex",
          gap: "15px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <strong>Report Type:</strong>{" "}
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value)
            }
            style={{
              padding: "9px 12px",
              marginLeft: "8px",
              borderRadius: "7px",
              border: "1px solid #ccc",
            }}
          >
            <option value="all">All</option>
            <option value="land">Land Reports</option>
            <option value="user">User Reports</option>
          </select>
        </div>

        <div>
          <strong>Status:</strong>{" "}
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
            style={{
              padding: "9px 12px",
              marginLeft: "8px",
              borderRadius: "7px",
              border: "1px solid #ccc",
            }}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      {/* Report Count */}

      <div
        style={{
          marginBottom: "15px",
          color: "#555",
          fontWeight: "bold",
        }}
      >
        Showing {filteredReports.length} report
        {filteredReports.length !== 1 ? "s" : ""}
      </div>

      {/* Empty State */}

      {filteredReports.length === 0 ? (
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "60px 20px",
            textAlign: "center",
            boxShadow:
              "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ fontSize: "50px" }}>
            📭
          </div>

          <h2>No Reports Found</h2>

          <p style={{ color: "#777" }}>
            There are no reports matching the
            selected filters.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {filteredReports.map((report) => {
            const uniqueKey =
              `${report.report_type}-${report.id}`;

            return (
              <div
                key={uniqueKey}
                style={{
                  background: "white",
                  borderRadius: "14px",
                  padding: "22px",
                  boxShadow:
                    "0 2px 10px rgba(0,0,0,0.1)",
                  borderLeft:
                    report.report_type === "land"
                      ? "5px solid #2E7D32"
                      : "5px solid #1976D2",
                }}
              >
                {/* Top Row */}

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                    marginBottom: "15px",
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      color: "#333",
                      fontSize: "20px",
                    }}
                  >
                    {report.report_type === "land"
                      ? "🌾 Land Report"
                      : "👤 User Report"}
                  </h2>

                  <span
                    style={{
                      ...getStatusStyle(
                        report.status
                      ),
                      padding: "6px 12px",
                      borderRadius: "20px",
                      fontWeight: "bold",
                      textTransform:
                        "capitalize",
                      fontSize: "13px",
                    }}
                  >
                    {report.status}
                  </span>
                </div>

                {/* Reported Target */}

                <div
                  style={{
                    background: "#F5F5F5",
                    padding: "14px",
                    borderRadius: "8px",
                    marginBottom: "15px",
                  }}
                >
                  {report.report_type ===
                  "land" ? (
                    <>
                      <div>
                        <strong>
                          🌾 Reported Land:
                        </strong>{" "}
                        {report.land_title ||
                          "Land unavailable"}
                      </div>

                      <div
                        style={{
                          marginTop: "6px",
                        }}
                      >
                        <strong>
                          Land ID:
                        </strong>{" "}
                        {report.land_id}
                      </div>

                      <div
                        style={{
                          marginTop: "6px",
                        }}
                      >
                        <strong>
                          👤 Land Owner:
                        </strong>{" "}
                        {report.reported_user_name ||
                          "Unknown"}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <strong>
                          👤 Reported User:
                        </strong>{" "}
                        {report.reported_user_name ||
                          "Unknown"}
                      </div>

                      <div
                        style={{
                          marginTop: "6px",
                        }}
                      >
                        <strong>
                          User ID:
                        </strong>{" "}
                        {report.reported_user_id}
                      </div>

                      {report.reported_user_email && (
                        <div
                          style={{
                            marginTop: "6px",
                          }}
                        >
                          <strong>
                            Email:
                          </strong>{" "}
                          {report.reported_user_email}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Reporter */}

                <p>
                  <strong>
                    🚩 Reported by:
                  </strong>{" "}
                  {report.reporter_name ||
                    "Unknown"}
                </p>

                {report.reporter_email && (
                  <p>
                    <strong>
                      📧 Reporter Email:
                    </strong>{" "}
                    {report.reporter_email}
                  </p>
                )}

                {/* Reason */}

                <p>
                  <strong>
                    ⚠️ Reason:
                  </strong>{" "}
                  {report.reason}
                </p>

                {/* Description */}

                {report.description && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "12px",
                      background: "#FFFDE7",
                      borderRadius: "8px",
                    }}
                  >
                    <strong>
                      Description:
                    </strong>

                    <div
                      style={{
                        marginTop: "6px",
                        color: "#555",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {report.description}
                    </div>
                  </div>
                )}

                {/* Date */}

                {report.created_at && (
                  <div
                    style={{
                      marginTop: "15px",
                      paddingTop: "12px",
                      borderTop:
                        "1px solid #eee",
                      color: "#777",
                      fontSize: "13px",
                    }}
                  >
                    Submitted:{" "}
                    {new Date(
                      report.created_at
                    ).toLocaleString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =====================================================
// STAT CARD
// =====================================================

function StatCard({ title, value, icon }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        padding: "20px",
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          fontSize: "28px",
          marginBottom: "8px",
        }}
      >
        {icon}
      </div>

      <div
        style={{
          color: "#666",
          fontSize: "14px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: "5px",
          fontSize: "28px",
          fontWeight: "bold",
          color: "#1B5E20",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default AdminReports;