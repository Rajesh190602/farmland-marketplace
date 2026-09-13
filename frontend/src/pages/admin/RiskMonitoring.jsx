import { useEffect, useState } from "react";
import api from "../../services/api";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "OPEN", label: "Open" },
  { value: "REVIEWING", label: "Reviewing" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "DISMISSED", label: "Dismissed" },
];

const RISK_LEVEL_OPTIONS = [
  { value: "", label: "All Risk Levels" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

const EVENT_TYPE_OPTIONS = [
  { value: "", label: "All Event Types" },
  { value: "MULTIPLE_REPORTS", label: "Multiple Reports" },
  { value: "RAPID_LISTINGS", label: "Rapid Listings" },
  { value: "RAPID_OFFERS", label: "Rapid Offers" },
  {
    value: "SUSPICIOUS_OFFER_PATTERN",
    label: "Suspicious Offer Pattern",
  },
  {
    value: "REPEATED_KYC_FAILURE",
    label: "Repeated KYC Failure",
  },
  {
    value: "EXCESSIVE_OTP_REQUESTS",
    label: "Excessive OTP Requests",
  },
  {
    value: "FAILED_LOGIN_PATTERN",
    label: "Failed Login Pattern",
  },
  {
    value: "UNAUTHORIZED_ADMIN_ACCESS",
    label: "Unauthorized Admin Access",
  },
];

function RiskMonitoring() {
  const [events, setEvents] = useState([]);

  const [summary, setSummary] = useState({
    status: {
      OPEN: 0,
      REVIEWING: 0,
      RESOLVED: 0,
      DISMISSED: 0,
    },
    risk_level: {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    },
    total: 0,
    open_high_or_critical: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  // Current filter controls.
  const [statusFilter, setStatusFilter] = useState("");
  const [riskLevelFilter, setRiskLevelFilter] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");

  // Filters actually sent to backend.
  const [appliedFilters, setAppliedFilters] = useState({
    status: "",
    risk_level: "",
    event_type: "",
    user_id: "",
  });

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [resolutionNote, setResolutionNote] = useState("");

  // =====================================================
  // LOAD SUMMARY
  // =====================================================

  const loadSummary = async () => {
    const response = await api.get("/admin/risk/summary");

    setSummary({
      status: {
        OPEN: response.data?.status?.OPEN || 0,
        REVIEWING: response.data?.status?.REVIEWING || 0,
        RESOLVED: response.data?.status?.RESOLVED || 0,
        DISMISSED: response.data?.status?.DISMISSED || 0,
      },
      risk_level: {
        LOW: response.data?.risk_level?.LOW || 0,
        MEDIUM: response.data?.risk_level?.MEDIUM || 0,
        HIGH: response.data?.risk_level?.HIGH || 0,
        CRITICAL: response.data?.risk_level?.CRITICAL || 0,
      },
      total: response.data?.total || 0,
      open_high_or_critical:
        response.data?.open_high_or_critical || 0,
    });
  };

  // =====================================================
  // LOAD EVENTS
  // =====================================================

  const loadEvents = async () => {
    const params = {};

    if (appliedFilters.status) {
      params.status = appliedFilters.status;
    }

    if (appliedFilters.risk_level) {
      params.risk_level = appliedFilters.risk_level;
    }

    if (appliedFilters.event_type) {
      params.event_type = appliedFilters.event_type;
    }

    if (appliedFilters.user_id) {
      params.user_id = Number(appliedFilters.user_id);
    }

    const response = await api.get("/admin/risk/events", {
      params,
    });

    setEvents(response.data?.events || []);
  };

  // =====================================================
  // LOAD ALL
  // =====================================================

  const loadAll = async (initial = false) => {
    try {
      if (initial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      await Promise.all([
        loadSummary(),
        loadEvents(),
      ]);
    } catch (error) {
      console.error(
        "Failed to load risk monitoring:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to load risk monitoring data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAll(true);
  }, [appliedFilters]);

  // =====================================================
  // APPLY FILTERS
  // =====================================================

  const applyFilters = () => {
    const trimmedUserId = userIdFilter.trim();

    if (trimmedUserId) {
      const parsedUserId = Number(trimmedUserId);

      if (
        !Number.isInteger(parsedUserId) ||
        parsedUserId <= 0
      ) {
        alert("User ID must be a positive number.");
        return;
      }
    }

    setAppliedFilters({
      status: statusFilter,
      risk_level: riskLevelFilter,
      event_type: eventTypeFilter,
      user_id: trimmedUserId,
    });
  };

  // =====================================================
  // CLEAR FILTERS
  // =====================================================

  const clearFilters = () => {
    setStatusFilter("");
    setRiskLevelFilter("");
    setEventTypeFilter("");
    setUserIdFilter("");

    setAppliedFilters({
      status: "",
      risk_level: "",
      event_type: "",
      user_id: "",
    });
  };

  // =====================================================
  // REVIEW EVENT
  // =====================================================

  const reviewEvent = async (event) => {
    if (!event || event.status !== "OPEN") {
      return;
    }

    const confirmed = window.confirm(
      `Start reviewing risk event #${event.id}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(event.id);

      await api.put(
        `/admin/risk/events/${event.id}/review`
      );

      await loadAll(false);

      alert("Risk event marked as reviewing.");
    } catch (error) {
      console.error(
        "Failed to review risk event:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to review risk event."
      );
    } finally {
      setProcessingId(null);
    }
  };

  // =====================================================
  // OPEN RESOLUTION DIALOG
  // =====================================================

  const openResolutionDialog = (event, action) => {
    if (
      !event ||
      !["OPEN", "REVIEWING"].includes(event.status)
    ) {
      return;
    }

    setSelectedEvent({
      ...event,
      action,
    });

    setResolutionNote("");
  };

  // =====================================================
  // RESOLVE / DISMISS
  // =====================================================

  const submitResolution = async () => {
    if (!selectedEvent) {
      return;
    }

    const note = resolutionNote.trim();

    if (!note) {
      alert(
        "Please enter a resolution note before continuing."
      );
      return;
    }

    const { id, action } = selectedEvent;

    const actionText =
      action === "resolve"
        ? "resolve"
        : "dismiss";

    const confirmed = window.confirm(
      `Are you sure you want to ${actionText} risk event #${id}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(id);

      await api.put(
        `/admin/risk/events/${id}/${action}`,
        null,
        {
          params: {
            resolution_note: note,
          },
        }
      );

      setSelectedEvent(null);
      setResolutionNote("");

      await loadAll(false);

      alert(
        action === "resolve"
          ? "Risk event resolved successfully."
          : "Risk event dismissed successfully."
      );
    } catch (error) {
      console.error(
        `Failed to ${action} risk event:`,
        error
      );

      alert(
        error.response?.data?.detail ||
          `Failed to ${action} risk event.`
      );
    } finally {
      setProcessingId(null);
    }
  };

  // =====================================================
  // STYLES
  // =====================================================

  const getRiskStyle = (level) => {
    switch (level) {
      case "CRITICAL":
        return {
          background: "#FFEBEE",
          color: "#C62828",
        };

      case "HIGH":
        return {
          background: "#FFF3E0",
          color: "#EF6C00",
        };

      case "MEDIUM":
        return {
          background: "#FFFDE7",
          color: "#F57F17",
        };

      case "LOW":
        return {
          background: "#E8F5E9",
          color: "#2E7D32",
        };

      default:
        return {
          background: "#EEEEEE",
          color: "#616161",
        };
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "OPEN":
        return {
          background: "#FFF3E0",
          color: "#EF6C00",
        };

      case "REVIEWING":
        return {
          background: "#E3F2FD",
          color: "#1565C0",
        };

      case "RESOLVED":
        return {
          background: "#E8F5E9",
          color: "#2E7D32",
        };

      case "DISMISSED":
        return {
          background: "#EEEEEE",
          color: "#616161",
        };

      default:
        return {
          background: "#EEEEEE",
          color: "#616161",
        };
    }
  };

  const formatDate = (value) => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };

  const formatEventType = (eventType) => {
    if (!eventType) {
      return "Unknown Event";
    }

    return eventType
      .toLowerCase()
      .split("_")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1)
      )
      .join(" ");
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
        Loading Risk Monitoring...
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
        maxWidth: "1300px",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}

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
            Risk Monitoring
          </h1>

          <p
            style={{
              marginTop: "8px",
              color: "#666",
            }}
          >
            Monitor suspicious marketplace activity and
            review detected risk events.
          </p>
        </div>

        <button
          onClick={() => loadAll(false)}
          disabled={refreshing}
          style={{
            background: refreshing
              ? "#90A4AE"
              : "#1976D2",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "11px 18px",
            cursor: refreshing
              ? "not-allowed"
              : "pointer",
            fontWeight: "bold",
          }}
        >
          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      {/* SUMMARY */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "15px",
          marginBottom: "25px",
        }}
      >
        {[
          {
            title: "Total Events",
            value: summary.total,
            icon: "⚠️",
          },
          {
            title: "Open",
            value: summary.status.OPEN,
            icon: "🔓",
          },
          {
            title: "Reviewing",
            value: summary.status.REVIEWING,
            icon: "🔎",
          },
          {
            title: "High Risk",
            value:
              summary.risk_level.HIGH +
              summary.risk_level.CRITICAL,
            icon: "🔴",
          },
          {
            title: "Critical",
            value: summary.risk_level.CRITICAL,
            icon: "🚨",
          },
        ].map((stat) => (
          <div
            key={stat.title}
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
              {stat.icon}
            </div>

            <div
              style={{
                color: "#666",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              {stat.title}
            </div>

            <div
              style={{
                color: "#1B5E20",
                fontSize: "28px",
                fontWeight: "bold",
                marginTop: "5px",
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* HIGH / CRITICAL ALERT */}

      {summary.open_high_or_critical > 0 && (
        <div
          style={{
            background: "#FFEBEE",
            border: "1px solid #EF9A9A",
            color: "#B71C1C",
            padding: "15px 18px",
            borderRadius: "10px",
            marginBottom: "25px",
            fontWeight: "bold",
          }}
        >
          ⚠️ {summary.open_high_or_critical} open
          high/critical risk event
          {summary.open_high_or_critical !== 1
            ? "s"
            : ""}{" "}
          require attention.
        </div>
      )}

      {/* FILTERS */}

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
            {STATUS_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <strong>Risk:</strong>{" "}
          <select
            value={riskLevelFilter}
            onChange={(e) =>
              setRiskLevelFilter(e.target.value)
            }
            style={{
              padding: "9px 12px",
              marginLeft: "8px",
              borderRadius: "7px",
              border: "1px solid #ccc",
            }}
          >
            {RISK_LEVEL_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <strong>Event:</strong>{" "}
          <select
            value={eventTypeFilter}
            onChange={(e) =>
              setEventTypeFilter(e.target.value)
            }
            style={{
              padding: "9px 12px",
              marginLeft: "8px",
              borderRadius: "7px",
              border: "1px solid #ccc",
              maxWidth: "240px",
            }}
          >
            {EVENT_TYPE_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <strong>User ID:</strong>{" "}
          <input
            type="number"
            min="1"
            placeholder="e.g. 14"
            value={userIdFilter}
            onChange={(e) =>
              setUserIdFilter(e.target.value)
            }
            style={{
              padding: "9px 12px",
              marginLeft: "8px",
              borderRadius: "7px",
              border: "1px solid #ccc",
              width: "110px",
            }}
          />
        </div>

        <button
          onClick={applyFilters}
          style={{
            background: "#1B5E20",
            color: "white",
            border: "none",
            borderRadius: "7px",
            padding: "9px 16px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Apply Filters
        </button>

        <button
          onClick={clearFilters}
          style={{
            background: "#757575",
            color: "white",
            border: "none",
            borderRadius: "7px",
            padding: "9px 15px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Clear
        </button>
      </div>

      {/* COUNT */}

      <div
        style={{
          marginBottom: "15px",
          color: "#555",
          fontWeight: "bold",
        }}
      >
        Showing {events.length} risk event
        {events.length !== 1 ? "s" : ""}
      </div>

      {/* EVENTS */}

      {events.length === 0 ? (
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
            🛡️
          </div>

          <h2>No Risk Events Found</h2>

          <p style={{ color: "#777" }}>
            There are no risk events matching the
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
          {events.map((event) => {
            const isProcessing =
              processingId === event.id;

            return (
              <div
                key={event.id}
                style={{
                  background: "white",
                  borderRadius: "14px",
                  padding: "22px",
                  boxShadow:
                    "0 2px 10px rgba(0,0,0,0.1)",
                  borderLeft:
                    event.risk_level === "CRITICAL"
                      ? "5px solid #C62828"
                      : event.risk_level === "HIGH"
                      ? "5px solid #EF6C00"
                      : event.risk_level === "MEDIUM"
                      ? "5px solid #F9A825"
                      : "5px solid #2E7D32",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                    marginBottom: "15px",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        color: "#333",
                        fontSize: "20px",
                      }}
                    >
                      {formatEventType(
                        event.event_type
                      )}
                    </h2>

                    <div
                      style={{
                        marginTop: "5px",
                        color: "#777",
                        fontSize: "13px",
                      }}
                    >
                      Risk Event #{event.id}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        ...getRiskStyle(
                          event.risk_level
                        ),
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontWeight: "bold",
                        fontSize: "13px",
                      }}
                    >
                      {event.risk_level}
                    </span>

                    <span
                      style={{
                        ...getStatusStyle(
                          event.status
                        ),
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontWeight: "bold",
                        fontSize: "13px",
                      }}
                    >
                      {event.status}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    background: "#F5F5F5",
                    padding: "14px",
                    borderRadius: "8px",
                    marginBottom: "15px",
                  }}
                >
                  <div>
                    <strong>Risk Score:</strong>{" "}
                    {event.risk_score}
                  </div>

                  <div style={{ marginTop: "6px" }}>
                    <strong>User ID:</strong>{" "}
                    {event.user_id ?? "—"}
                  </div>

                  <div style={{ marginTop: "6px" }}>
                    <strong>Target:</strong>{" "}
                    {event.target_type || "—"}
                    {event.target_id
                      ? ` #${event.target_id}`
                      : ""}
                  </div>

                  <div style={{ marginTop: "6px" }}>
                    <strong>Created:</strong>{" "}
                    {formatDate(event.created_at)}
                  </div>
                </div>

                {event.description && (
                  <div
                    style={{
                      marginBottom: "15px",
                      padding: "12px",
                      background: "#FFFDE7",
                      borderRadius: "8px",
                    }}
                  >
                    <strong>Description:</strong>{" "}
                    {event.description}
                  </div>
                )}

                {event.resolution_note && (
                  <div
                    style={{
                      marginBottom: "15px",
                      padding: "12px",
                      background: "#E8F5E9",
                      borderRadius: "8px",
                    }}
                  >
                    <strong>
                      Resolution Note:
                    </strong>{" "}
                    {event.resolution_note}

                    <div
                      style={{
                        marginTop: "6px",
                        fontSize: "13px",
                        color: "#555",
                      }}
                    >
                      Resolved by User #
                      {event.resolved_by ?? "—"}
                      {" • "}
                      {formatDate(event.resolved_at)}
                    </div>
                  </div>
                )}

                {["OPEN", "REVIEWING"].includes(
                  event.status
                ) && (
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    {event.status === "OPEN" && (
                      <button
                        onClick={() =>
                          reviewEvent(event)
                        }
                        disabled={isProcessing}
                        style={{
                          background: "#1976D2",
                          color: "white",
                          border: "none",
                          borderRadius: "7px",
                          padding: "10px 16px",
                          cursor: isProcessing
                            ? "not-allowed"
                            : "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        {isProcessing
                          ? "Processing..."
                          : "Start Review"}
                      </button>
                    )}

                    <button
                      onClick={() =>
                        openResolutionDialog(
                          event,
                          "resolve"
                        )
                      }
                      disabled={isProcessing}
                      style={{
                        background: "#2E7D32",
                        color: "white",
                        border: "none",
                        borderRadius: "7px",
                        padding: "10px 16px",
                        cursor: isProcessing
                          ? "not-allowed"
                          : "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      Resolve
                    </button>

                    <button
                      onClick={() =>
                        openResolutionDialog(
                          event,
                          "dismiss"
                        )
                      }
                      disabled={isProcessing}
                      style={{
                        background: "#757575",
                        color: "white",
                        border: "none",
                        borderRadius: "7px",
                        padding: "10px 16px",
                        cursor: isProcessing
                          ? "not-allowed"
                          : "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* RESOLUTION MODAL */}

      {selectedEvent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "white",
              borderRadius: "14px",
              padding: "25px",
              boxShadow:
                "0 10px 30px rgba(0,0,0,0.25)",
              boxSizing: "border-box",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                color: "#1B5E20",
              }}
            >
              {selectedEvent.action === "resolve"
                ? "Resolve Risk Event"
                : "Dismiss Risk Event"}
            </h2>

            <p style={{ color: "#555" }}>
              Risk Event #{selectedEvent.id}
            </p>

            <textarea
              value={resolutionNote}
              onChange={(e) =>
                setResolutionNote(e.target.value)
              }
              placeholder="Enter the reason for this decision..."
              rows={5}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                resize: "vertical",
                fontFamily: "inherit",
                fontSize: "14px",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "18px",
              }}
            >
              <button
                onClick={() => {
                  setSelectedEvent(null);
                  setResolutionNote("");
                }}
                disabled={
                  processingId === selectedEvent.id
                }
                style={{
                  background: "#EEEEEE",
                  color: "#333",
                  border: "none",
                  borderRadius: "7px",
                  padding: "10px 16px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Cancel
              </button>

              <button
                onClick={submitResolution}
                disabled={
                  processingId === selectedEvent.id
                }
                style={{
                  background:
                    selectedEvent.action === "resolve"
                      ? "#2E7D32"
                      : "#757575",
                  color: "white",
                  border: "none",
                  borderRadius: "7px",
                  padding: "10px 16px",
                  cursor:
                    processingId === selectedEvent.id
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: "bold",
                }}
              >
                {processingId === selectedEvent.id
                  ? "Processing..."
                  : selectedEvent.action === "resolve"
                  ? "Resolve Event"
                  : "Dismiss Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RiskMonitoring;
