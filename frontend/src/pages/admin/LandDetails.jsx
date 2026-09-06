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

  // =========================================================
  // STEP 60 - ADMIN LISTING DETAILS
  // =========================================================
  const [selectedLand, setSelectedLand] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

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

  const viewLand = async (landId) => {
    try {
      setDetailsLoading(true);
      const response = await api.get(`/admin/lands/${landId}`);
      setSelectedLand(response.data);
    } catch (error) {
      console.error("Failed to load land details:", error);
      alert(
        error.response?.data?.detail ||
          "Failed to load land details."
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeLandDetails = () => {
    setSelectedLand(null);
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

          {/* =================================================
              STEP 60 - ADMIN LISTING DETAILS
          ================================================= */}
          {detailsLoading && (
            <div style={modalOverlayStyle}>
              <div style={detailsModalStyle}>
                <div style={detailsLoadingStyle}>
                  Loading listing details...
                </div>
              </div>
            </div>
          )}

          {selectedLand && !detailsLoading && (
            <div
              style={modalOverlayStyle}
              onClick={closeLandDetails}
            >
              <div
                style={detailsModalStyle}
                onClick={(event) => event.stopPropagation()}
              >
                <div style={detailsHeaderStyle}>
                  <div>
                    <h2 style={{ margin: 0, color: "#2E7D32" }}>
                      🌾 Listing Details
                    </h2>
                    <p style={{ margin: "6px 0 0", color: "#666" }}>
                      Listing ID: #{selectedLand.id}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeLandDetails}
                    style={detailsCloseButtonStyle}
                  >
                    ✕
                  </button>
                </div>

                <div style={detailsBodyStyle}>
                  <div style={detailsImageSectionStyle}>
                    {selectedLand.image_url ? (
                      <img
                        src={selectedLand.image_url}
                        alt={selectedLand.title || "Land"}
                        style={detailsMainImageStyle}
                      />
                    ) : (
                      <div style={detailsNoImageStyle}>
                        No Image
                      </div>
                    )}

                    {Array.isArray(selectedLand.images) &&
                      selectedLand.images.length > 0 && (
                        <div style={detailsGalleryStyle}>
                          {selectedLand.images.map((image) => (
                            <img
                              key={image.id}
                              src={image.image_url}
                              alt={selectedLand.title || "Land"}
                              style={detailsThumbnailStyle}
                            />
                          ))}
                        </div>
                      )}
                  </div>

                  <div style={detailsSectionStyle}>
                    <h3 style={detailsSectionTitleStyle}>
                      Listing Information
                    </h3>
                    <div style={detailsGridStyle}>
                      <DetailItem label="Title" value={selectedLand.title} />
                      <DetailItem
                        label="Price"
                        value={
                          selectedLand.price !== null &&
                          selectedLand.price !== undefined
                            ? `₹${Number(selectedLand.price).toLocaleString("en-IN")}`
                            : "N/A"
                        }
                      />
                      <DetailItem
                        label="Area"
                        value={
                          selectedLand.area !== null &&
                          selectedLand.area !== undefined
                            ? `${selectedLand.area} Acres`
                            : "N/A"
                        }
                      />
                      <DetailItem label="Crop Type" value={selectedLand.crop_type} />
                      <DetailItem label="Soil Type" value={selectedLand.soil_type} />
                      <DetailItem label="Water Source" value={selectedLand.water_source} />
                      <DetailItem label="Survey Number" value={selectedLand.survey_number} />
                      <DetailItem label="Status" value={selectedLand.status} />
                      <DetailItem
                        label="Published"
                        value={selectedLand.is_published ? "Yes" : "No"}
                      />
                    </div>

                    <div style={detailsDescriptionStyle}>
                      <strong>Description</strong>
                      <p style={{ marginBottom: 0 }}>
                        {selectedLand.description || "No description provided."}
                      </p>
                    </div>
                  </div>

                  <div style={detailsSectionStyle}>
                    <h3 style={detailsSectionTitleStyle}>
                      📍 Location
                    </h3>
                    <div style={detailsGridStyle}>
                      <DetailItem label="Village" value={selectedLand.village} />
                      <DetailItem label="Mandal" value={selectedLand.mandal} />
                      <DetailItem label="District" value={selectedLand.district} />
                      <DetailItem label="State" value={selectedLand.state} />
                      <DetailItem label="Pincode" value={selectedLand.pincode} />
                      <DetailItem label="Latitude" value={selectedLand.latitude} />
                      <DetailItem label="Longitude" value={selectedLand.longitude} />
                    </div>
                  </div>

                  <div style={detailsSectionStyle}>
                    <h3 style={detailsSectionTitleStyle}>
                      👤 Land Owner
                    </h3>
                    <div style={detailsGridStyle}>
                      <DetailItem label="Owner ID" value={selectedLand.owner_id} />
                      <DetailItem label="Name" value={selectedLand.owner_name} />
                      <DetailItem label="Email" value={selectedLand.owner_email} />
                      <DetailItem label="Mobile" value={selectedLand.owner_mobile} />
                    </div>
                  </div>

                  {selectedLand.rejection_reason && (
                    <div style={detailsWarningStyle}>
                      <strong>Admin Feedback / Rejection Reason</strong>
                      <p style={{ marginBottom: 0 }}>
                        {selectedLand.rejection_reason}
                      </p>
                    </div>
                  )}
                </div>

                <div style={detailsFooterStyle}>
                  <button
                    type="button"
                    onClick={() => {
                      closeLandDetails();
                      editLand(selectedLand.id);
                    }}
                    style={{
                      ...actionButton,
                      background: "#1976D2",
                    }}
                  >
                    ✏️ Edit Listing
                  </button>

                  <button
                    type="button"
                    onClick={closeLandDetails}
                    style={{
                      ...actionButton,
                      background: "#616161",
                    }}
                  >
                    Close
                  </button>
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
// STEP 60 - DETAIL HELPERS
// =========================================================

const DetailItem = ({ label, value }) => (
  <div style={detailItemStyle}>
    <span style={detailLabelStyle}>{label}</span>
    <strong style={detailValueStyle}>
      {value !== null && value !== undefined && String(value).trim()
        ? String(value)
        : "N/A"}
    </strong>
  </div>
);

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

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  boxSizing: "border-box",
};

const detailsModalStyle = {
  width: "100%",
  maxWidth: "1100px",
  maxHeight: "92vh",
  background: "#fff",
  borderRadius: "16px",
  overflow: "hidden",
  boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
  display: "flex",
  flexDirection: "column",
};

const detailsHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "20px 24px",
  borderBottom: "1px solid #eee",
  flexShrink: 0,
};

const detailsCloseButtonStyle = {
  border: "none",
  background: "#f1f1f1",
  width: "38px",
  height: "38px",
  borderRadius: "50%",
  cursor: "pointer",
  fontSize: "18px",
};

const detailsBodyStyle = {
  overflowY: "auto",
  padding: "24px",
};

const detailsLoadingStyle = {
  padding: "50px",
  textAlign: "center",
  color: "#2E7D32",
  fontSize: "18px",
  fontWeight: "bold",
};

const detailsImageSectionStyle = {
  marginBottom: "25px",
};

const detailsMainImageStyle = {
  width: "100%",
  maxHeight: "380px",
  objectFit: "cover",
  borderRadius: "12px",
  display: "block",
};

const detailsNoImageStyle = {
  height: "250px",
  background: "#f5f5f5",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#777",
  fontWeight: "bold",
};

const detailsGalleryStyle = {
  display: "flex",
  gap: "10px",
  overflowX: "auto",
  marginTop: "12px",
  paddingBottom: "4px",
};

const detailsThumbnailStyle = {
  width: "90px",
  height: "70px",
  objectFit: "cover",
  borderRadius: "8px",
  border: "1px solid #ddd",
  flexShrink: 0,
};

const detailsSectionStyle = {
  background: "#fafafa",
  border: "1px solid #eee",
  borderRadius: "12px",
  padding: "18px",
  marginBottom: "18px",
};

const detailsSectionTitleStyle = {
  margin: "0 0 15px",
  color: "#2E7D32",
};

const detailsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
  gap: "12px",
};

const detailItemStyle = {
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: "8px",
  padding: "12px",
  display: "flex",
  flexDirection: "column",
  gap: "5px",
};

const detailLabelStyle = {
  fontSize: "12px",
  color: "#777",
  fontWeight: "bold",
  textTransform: "uppercase",
};

const detailValueStyle = {
  color: "#333",
  wordBreak: "break-word",
};

const detailsDescriptionStyle = {
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: "8px",
  padding: "14px",
  marginTop: "12px",
  lineHeight: 1.6,
};

const detailsWarningStyle = {
  background: "#FFF3E0",
  border: "1px solid #FFCC80",
  borderRadius: "10px",
  padding: "15px",
  color: "#8D4E00",
};

const detailsFooterStyle = {
  padding: "16px 24px",
  borderTop: "1px solid #eee",
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  flexWrap: "wrap",
  flexShrink: 0,
};

export default LandDetails;
