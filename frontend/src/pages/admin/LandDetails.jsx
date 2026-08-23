import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import Navbar from "../../components/Navbar";
import LandMap from "../../components/LandMap";
function  LandDetails(){
  const navigate = useNavigate();

  const [lands, setLands] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [actionLoading, setActionLoading] = useState(null);

  const limit = 10;

  // =========================================================
  // LOAD LANDS
  // =========================================================

  const fetchLands = async () => {
    try {
      setLoading(true);

      const response = await api.get("/admin/lands", {
        params: {
          search: search.trim(),
          status,
          page,
          limit,
        },
      });

      console.log(
        "Admin Lands Response:",
        response.data
      );

      setLands(
        Array.isArray(response.data.lands)
          ? response.data.lands
          : []
      );

      setTotal(
        typeof response.data.total === "number"
          ? response.data.total
          : 0
      );
    } catch (error) {
      console.error(
        "Failed to load admin lands:",
        error
      );

      if (error.response?.status === 401) {
        return;
      }

      alert(
        error.response?.data?.detail ||
          "Failed to load lands."
      );

      setLands([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLands();
  }, [page, status]);

  // =========================================================
  // SEARCH
  // =========================================================

  const handleSearch = (event) => {
    event.preventDefault();

    setPage(1);

    fetchLands();
  };

  // =========================================================
  // VIEW LAND
  // =========================================================

  const viewLand = (landId) => {
    navigate(`/admin/lands/${landId}`);
  };

  // =========================================================
  // EDIT LAND
  // =========================================================

  const editLand = (landId) => {
    navigate(`/admin/edit-land/${landId}`);
  };

  // =========================================================
  // APPROVE
  // =========================================================

  const approveLand = async (landId) => {
    const confirmed = window.confirm(
      "Are you sure you want to approve this land?\n\n" +
        "The land will become visible to buyers."
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(landId);

      await api.put(
        `/admin/lands/${landId}/approve`
      );

      alert(
        "Land approved successfully."
      );

      await fetchLands();
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
      setActionLoading(null);
    }
  };

  // =========================================================
  // REQUEST CHANGES
  // =========================================================

  const requestChanges = async (landId) => {
    const reason = window.prompt(
      "Enter the reason for requesting changes:"
    );

    if (reason === null) {
      return;
    }

    const trimmedReason =
      reason.trim();

    if (!trimmedReason) {
      alert(
        "Reason is required."
      );
      return;
    }

    try {
      setActionLoading(landId);

      await api.put(
        `/admin/lands/${landId}/request-changes`,
        {
          reason: trimmedReason,
        }
      );

      alert(
        "Changes requested successfully."
      );

      await fetchLands();
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
      setActionLoading(null);
    }
  };

  // =========================================================
  // REJECT
  // =========================================================

  const rejectLand = async (landId) => {
    const reason = window.prompt(
      "Enter the reason for rejecting this land:"
    );

    if (reason === null) {
      return;
    }

    const trimmedReason =
      reason.trim();

    if (!trimmedReason) {
      alert(
        "Reason is required."
      );
      return;
    }

    try {
      setActionLoading(landId);

      await api.put(
        `/admin/lands/${landId}/reject`,
        {
          reason: trimmedReason,
        }
      );

      alert(
        "Land rejected successfully."
      );

      await fetchLands();
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
      setActionLoading(null);
    }
  };

  // =========================================================
  // DELETE
  // =========================================================

  const deleteLand = async (landId) => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this land?\n\n" +
        "This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(landId);

      await api.delete(
        `/admin/lands/${landId}`
      );

      alert(
        "Land deleted successfully."
      );

      await fetchLands();
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
      setActionLoading(null);
    }
  };

  // =========================================================
  // STATUS STYLE
  // =========================================================

  const getStatusStyle = (landStatus) => {
    switch (
      landStatus?.toLowerCase()
    ) {
      case "approved":
        return {
          background: "#E8F5E9",
          color: "#2E7D32",
        };

      case "rejected":
        return {
          background: "#FFEBEE",
          color: "#C62828",
        };

      case "changes_requested":
        return {
          background: "#FFF3E0",
          color: "#EF6C00",
        };

      case "pending":
      default:
        return {
          background: "#FFF8E1",
          color: "#F57F17",
        };
    }
  };

  // =========================================================
  // PAGINATION
  // =========================================================

  const totalPages = Math.max(
    1,
    Math.ceil(total / limit)
  );

  const goToPreviousPage = () => {
    if (page > 1) {
      setPage(
        (previous) => previous - 1
      );
    }
  };

  const goToNextPage = () => {
    if (page < totalPages) {
      setPage(
        (previous) => previous + 1
      );
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

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
          Loading Lands...
        </div>
      </>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <>
      <Navbar />

      <div
        style={{
          minHeight: "100vh",
          background: "#f4f4f4",
          padding: "30px",
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
          }}
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <div
            style={{
              background:
                "linear-gradient(135deg,#2E7D32,#66BB6A)",
              color: "#fff",
              padding: "25px",
              borderRadius: "15px",
              marginBottom: "25px",
            }}
          >
            <h1
              style={{
                margin: 0,
              }}
            >
              🌾 Manage Lands
            </h1>

            <p
              style={{
                marginBottom: 0,
              }}
            >
              View, edit, approve, reject and
              manage farmland listings.
            </p>
          </div>

          {/* =================================================
              SEARCH AND FILTER
          ================================================= */}

          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "12px",
              marginBottom: "20px",
              boxShadow:
                "0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            <form
              onSubmit={handleSearch}
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <input
                type="text"
                placeholder="Search lands..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                style={{
                  flex: 1,
                  minWidth: "250px",
                  padding: "12px",
                  border:
                    "1px solid #ccc",
                  borderRadius: "8px",
                  fontSize: "15px",
                  boxSizing:
                    "border-box",
                }}
              />

              <select
                value={status}
                onChange={(event) => {
                  setPage(1);
                  setStatus(
                    event.target.value
                  );
                }}
                style={{
                  padding: "12px",
                  border:
                    "1px solid #ccc",
                  borderRadius: "8px",
                  minWidth: "180px",
                  background: "#fff",
                }}
              >
                <option value="">
                  All Status
                </option>

                <option value="pending">
                  Pending
                </option>

                <option value="approved">
                  Approved
                </option>

                <option value="changes_requested">
                  Changes Requested
                </option>

                <option value="rejected">
                  Rejected
                </option>
              </select>

              <button
                type="submit"
                style={{
                  background: "#1976D2",
                  color: "#fff",
                  border: "none",
                  padding:
                    "12px 25px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Search
              </button>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatus("");
                  setPage(1);
                }}
                style={{
                  background: "#757575",
                  color: "#fff",
                  border: "none",
                  padding:
                    "12px 25px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Reset
              </button>
            </form>
          </div>

          {/* =================================================
              SUMMARY
          ================================================= */}

          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "12px",
              marginBottom: "20px",
              boxShadow:
                "0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            <strong>
              Total Lands: {total}
            </strong>

            <span
              style={{
                marginLeft: "20px",
                color: "#666",
              }}
            >
              Page {page} of{" "}
              {totalPages}
            </span>
          </div>

          {/* =================================================
              NO LANDS
          ================================================= */}

          {lands.length === 0 ? (
            <div
              style={{
                background: "#fff",
                padding: "60px 20px",
                borderRadius: "12px",
                textAlign: "center",
                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <h2>
                No Lands Found
              </h2>

              <p
                style={{
                  color: "#777",
                }}
              >
                No lands match the
                selected filters.
              </p>
            </div>
          ) : (
            /* =================================================
               TABLE
            ================================================= */

            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                overflowX: "auto",
                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse:
                    "collapse",
                  minWidth:
                    "1500px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background:
                        "#E8F5E9",
                    }}
                  >
                    <th style={thStyle}>
                      ID
                    </th>

                    <th style={thStyle}>
                      Image
                    </th>

                    <th style={thStyle}>
                      Owner
                    </th>

                    <th style={thStyle}>
                      Email
                    </th>

                    <th style={thStyle}>
                      Title
                    </th>

                    <th style={thStyle}>
                      Village
                    </th>

                    <th style={thStyle}>
                      District
                    </th>

                    <th style={thStyle}>
                      Area
                    </th>

                    <th style={thStyle}>
                      Price
                    </th>

                    <th style={thStyle}>
                      Status
                    </th>

                    <th style={thStyle}>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {lands.map(
                    (land) => {
                      const isLoading =
                        actionLoading ===
                        land.id;

                      const currentStatus =
                        land.status?.toLowerCase();

                      return (
                        <tr
                          key={
                            land.id
                          }
                        >
                          {/* ID */}

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {
                              land.id
                            }
                          </td>

                          {/* IMAGE */}

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {land.image_url ? (
                              <img
                                src={
                                  land.image_url
                                }
                                alt={
                                  land.title ||
                                  "Land"
                                }
                                width="80"
                                height="60"
                                style={{
                                  objectFit:
                                    "cover",
                                  borderRadius:
                                    "6px",
                                }}
                              />
                            ) : (
                              <span
                                style={{
                                  color:
                                    "#777",
                                }}
                              >
                                No Image
                              </span>
                            )}
                          </td>

                          {/* OWNER */}

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {
                              land.owner_name ||
                              "Unknown"
                            }
                          </td>

                          {/* EMAIL */}

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {
                              land.owner_email ||
                              "N/A"
                            }
                          </td>

                          {/* TITLE */}

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {
                              land.title ||
                              "N/A"
                            }
                          </td>

                          {/* VILLAGE */}

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {
                              land.village ||
                              "N/A"
                            }
                          </td>

                          {/* DISTRICT */}

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {
                              land.district ||
                              "N/A"
                            }
                          </td>

                          {/* AREA */}

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {land.area ||
                              0}{" "}
                            Acres
                          </td>

                          {/* PRICE */}

                          <td
                            style={
                              tdStyle
                            }
                          >
                            ₹{" "}
                            {land.price ||
                              0}
                          </td>

                          {/* STATUS */}

                          <td
                            style={
                              tdStyle
                            }
                          >
                            <span
                              style={{
                                ...getStatusStyle(
                                  land.status
                                ),
                                display:
                                  "inline-block",
                                padding:
                                  "7px 12px",
                                borderRadius:
                                  "20px",
                                fontWeight:
                                  "bold",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {currentStatus ===
                              "changes_requested"
                                ? "Changes Requested"
                                : land.status ||
                                  "Unknown"}
                            </span>
                          </td>

                          {/* ACTIONS */}

                          <td
                            style={{
                              ...tdStyle,
                              minWidth:
                                "320px",
                            }}
                          >
                            {/* VIEW */}

                            <button
                              onClick={() =>
                                viewLand(
                                  land.id
                                )
                              }
                              disabled={
                                isLoading
                              }
                              style={{
                                ...actionButton,
                                background:
                                  "#455A64",
                              }}
                            >
                              👁 View
                            </button>

                            {/* EDIT */}

                            <button
                              onClick={() =>
                                editLand(
                                  land.id
                                )
                              }
                              disabled={
                                isLoading
                              }
                              style={{
                                ...actionButton,
                                background:
                                  "#1976D2",
                              }}
                            >
                              ✏️ Edit
                            </button>

                            {/* APPROVE */}

                            {(currentStatus ===
                              "pending" ||
                              currentStatus ===
                                "changes_requested") && (
                              <button
                                onClick={() =>
                                  approveLand(
                                    land.id
                                  )
                                }
                                disabled={
                                  isLoading
                                }
                                style={{
                                  ...actionButton,
                                  background:
                                    "#2E7D32",
                                }}
                              >
                                {isLoading
                                  ? "..."
                                  : "✓ Approve"}
                              </button>
                            )}

                            {/* REQUEST CHANGES */}

                            {currentStatus ===
                              "pending" && (
                              <button
                                onClick={() =>
                                  requestChanges(
                                    land.id
                                  )
                                }
                                disabled={
                                  isLoading
                                }
                                style={{
                                  ...actionButton,
                                  background:
                                    "#EF6C00",
                                }}
                              >
                                ⚠ Changes
                              </button>
                            )}

                            {/* REJECT */}

                            {(currentStatus ===
                              "pending" ||
                              currentStatus ===
                                "changes_requested") && (
                              <button
                                onClick={() =>
                                  rejectLand(
                                    land.id
                                  )
                                }
                                disabled={
                                  isLoading
                                }
                                style={{
                                  ...actionButton,
                                  background:
                                    "#D32F2F",
                                }}
                              >
                                ✕ Reject
                              </button>
                            )}

                            {/* DELETE */}

                            <button
                              onClick={() =>
                                deleteLand(
                                  land.id
                                )
                              }
                              disabled={
                                isLoading
                              }
                              style={{
                                ...actionButton,
                                background:
                                  "#B71C1C",
                              }}
                            >
                              🗑 Delete
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* =================================================
              PAGINATION
          ================================================= */}

          {total > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent:
                  "center",
                alignItems:
                  "center",
                gap: "20px",
                marginTop: "25px",
                padding: "20px",
                background:
                  "#fff",
                borderRadius:
                  "12px",
              }}
            >
              <button
                onClick={
                  goToPreviousPage
                }
                disabled={page === 1}
                style={{
                  ...paginationButton,
                  background:
                    page === 1
                      ? "#ddd"
                      : "#1976D2",
                  color:
                    page === 1
                      ? "#777"
                      : "#fff",
                  cursor:
                    page === 1
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                ← Previous
              </button>

              <strong>
                Page {page} of{" "}
                {totalPages}
              </strong>

              <button
                onClick={
                  goToNextPage
                }
                disabled={
                  page >=
                  totalPages
                }
                style={{
                  ...paginationButton,
                  background:
                    page >=
                    totalPages
                      ? "#ddd"
                      : "#1976D2",
                  color:
                    page >=
                    totalPages
                      ? "#777"
                      : "#fff",
                  cursor:
                    page >=
                    totalPages
                      ? "not-allowed"
                      : "pointer",
                }}
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

// =========================================================
// STYLES
// =========================================================

const thStyle = {
  padding: "14px",
  textAlign: "left",
  borderBottom:
    "1px solid #ddd",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "12px",
  borderBottom:
    "1px solid #eee",
  verticalAlign:
    "middle",
};

const actionButton = {
  color: "#fff",
  border: "none",
  padding: "8px 11px",
  marginRight: "6px",
  marginBottom: "6px",
  borderRadius: "5px",
  cursor: "pointer",
  fontWeight: "bold",
};

const paginationButton = {
  border: "none",
  padding: "10px 18px",
  borderRadius: "7px",
  fontWeight: "bold",
};

export default LandDetails();