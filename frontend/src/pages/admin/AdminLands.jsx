import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

function AdminLands() {
  const navigate = useNavigate();

  const [lands, setLands] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [actionLoading, setActionLoading] =
    useState(null);

  const limit = 10;

  // =========================================================
  // LOAD LANDS
  // =========================================================

  const fetchLands = async () => {
    try {
      setLoading(true);

      const response = await api.get(
        "/admin/lands",
        {
          params: {
            search: search.trim(),
            status,
            page,
            limit,
          },
        }
      );

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
  // APPROVE LAND
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
      alert("Reason is required.");
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
  // REJECT LAND
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
      alert("Reason is required.");
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
  // DELETE LAND
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
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (

      <div
        style={{
          minHeight: "100vh",
          background: "#f4f4f4",
          padding: "30px",
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
              marginBottom: "20px",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <h1
              style={{
                color: "#2E7D32",
                margin: 0,
              }}
            >
              🌾 Manage Lands
            </h1>

            <button
              onClick={() =>
                navigate("/admin/dashboard")
              }
              style={{
                background: "#1565C0",
                color: "white",
                border: "none",
                padding: "10px 18px",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              ← Admin Dashboard
            </button>
          </div>

          {/* =================================================
              SEARCH & FILTER
          ================================================= */}

          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "10px",
              marginBottom: "20px",
              boxShadow:
                "0 2px 8px rgba(0,0,0,0.1)",
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
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search land, village, mandal, district..."
                style={{
                  flex: 1,
                  minWidth: "250px",
                  padding: "10px",
                  border:
                    "1px solid #ccc",
                  borderRadius: "5px",
                  boxSizing:
                    "border-box",
                }}
              />

              <select
                value={status}
                onChange={(event) => {
                  setStatus(
                    event.target.value
                  );
                  setPage(1);
                }}
                style={{
                  padding: "10px",
                  border:
                    "1px solid #ccc",
                  borderRadius: "5px",
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

                <option value="rejected">
                  Rejected
                </option>

                <option value="changes_requested">
                  Changes Requested
                </option>
              </select>

              <button
                type="submit"
                style={{
                  background: "#2E7D32",
                  color: "white",
                  border: "none",
                  padding:
                    "10px 20px",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Search
              </button>
            </form>
          </div>

          {/* =================================================
              LANDS
          ================================================= */}

          {lands.length === 0 ? (
            <div
              style={{
                background: "white",
                padding: "40px",
                textAlign: "center",
                borderRadius: "10px",
              }}
            >
              <h2>
                No lands found.
              </h2>

              <p
                style={{
                  color: "#777",
                }}
              >
                Try changing the
                search or status
                filter.
              </p>
            </div>
          ) : (
            lands.map((land) => {
              const images =
                Array.isArray(
                  land.images
                )
                  ? land.images
                  : [];

              const isLoading =
                actionLoading ===
                land.id;

              return (
                <div
                  key={land.id}
                  style={{
                    background: "white",
                    borderRadius: "10px",
                    padding: "25px",
                    marginBottom: "25px",
                    boxShadow:
                      "0 2px 10px rgba(0,0,0,0.12)",
                  }}
                >
                  {/* =================================================
                      LAND HEADER
                  ================================================= */}

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "flex-start",
                      gap: "15px",
                      flexWrap:
                        "wrap",
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          marginTop: 0,
                          color: "#333",
                        }}
                      >
                        {land.title ||
                          "Untitled Land"}
                      </h2>

                      <p>
                        <strong>
                          Land ID:
                        </strong>{" "}
                        {land.id}
                      </p>

                      <p>
                        <strong>
                          Farmer:
                        </strong>{" "}
                        {land.owner_name ||
                          "N/A"}
                      </p>

                      <p>
                        <strong>
                          Mobile:
                        </strong>{" "}
                        {land.owner_mobile ||
                          "N/A"}
                      </p>

                      <p>
                        <strong>
                          Email:
                        </strong>{" "}
                        {land.owner_email ||
                          "N/A"}
                      </p>
                    </div>

                    <span
                      style={{
                        ...getStatusStyle(
                          land.status
                        ),
                        padding:
                          "8px 14px",
                        borderRadius:
                          "20px",
                        fontWeight:
                          "bold",
                        textTransform:
                          "capitalize",
                      }}
                    >
                      {(
                        land.status ||
                        "unknown"
                      ).replace(
                        "_",
                        " "
                      )}
                    </span>
                  </div>

                  {/* =================================================
                      GALLERY
                  ================================================= */}

                  <div
                    style={{
                      marginTop: "20px",
                    }}
                  >
                    <h3
                      style={{
                        color: "#2E7D32",
                      }}
                    >
                      📷 Land Images (
                      {images.length})
                    </h3>

                    {images.length >
                    0 ? (
                      <div
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(180px, 1fr))",
                          gap: "12px",
                        }}
                      >
                        {images.map(
                          (
                            image,
                            index
                          ) => {
                            const imageUrl =
                              typeof image ===
                              "string"
                                ? image
                                : image?.image_url ||
                                  image?.url;

                            if (
                              !imageUrl
                            ) {
                              return null;
                            }

                            return (
                              <div
                                key={
                                  image.id ||
                                  index
                                }
                                style={{
                                  borderRadius:
                                    "10px",
                                  overflow:
                                    "hidden",
                                  border:
                                    "1px solid #ddd",
                                  background:
                                    "#f5f5f5",
                                }}
                              >
                                <img
                                  src={
                                    imageUrl
                                  }
                                  alt={`${land.title || "Land"} land`}
                                  style={{
                                    width:
                                      "100%",
                                    height:
                                      "180px",
                                    objectFit:
                                      "cover",
                                    display:
                                      "block",
                                  }}
                                />
                              </div>
                            );
                          }
                        )}
                      </div>
                    ) : land.image_url ? (
                      <img
                        src={
                          land.image_url
                        }
                        alt={
                          land.title ||
                          "Land"
                        }
                        style={{
                          width:
                            "250px",
                          height:
                            "180px",
                          objectFit:
                            "cover",
                          borderRadius:
                            "10px",
                        }}
                      />
                    ) : (
                      <p
                        style={{
                          color: "#777",
                          fontStyle:
                            "italic",
                        }}
                      >
                        No images
                        uploaded.
                      </p>
                    )}
                  </div>

                  {/* =================================================
                      LAND DETAILS
                  ================================================= */}

                  <div
                    style={{
                      marginTop: "20px",
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "10px",
                    }}
                  >
                    <Detail
                      label="Description"
                      value={
                        land.description
                      }
                    />

                    <Detail
                      label="Price"
                      value={
                        land.price !==
                        null
                          ? `₹${land.price}`
                          : "N/A"
                      }
                    />

                    <Detail
                      label="Area"
                      value={
                        land.area !==
                        null
                          ? `${land.area} Acres`
                          : "N/A"
                      }
                    />

                    <Detail
                      label="Village"
                      value={
                        land.village
                      }
                    />

                    <Detail
                      label="Mandal"
                      value={
                        land.mandal
                      }
                    />

                    <Detail
                      label="District"
                      value={
                        land.district
                      }
                    />

                    <Detail
                      label="State"
                      value={
                        land.state
                      }
                    />

                    <Detail
                      label="Pincode"
                      value={
                        land.pincode
                      }
                    />

                    <Detail
                      label="Survey Number"
                      value={
                        land.survey_number
                      }
                    />

                    <Detail
                      label="Soil Type"
                      value={
                        land.soil_type
                      }
                    />

                    <Detail
                      label="Water Source"
                      value={
                        land.water_source
                      }
                    />

                    <Detail
                      label="Crop Type"
                      value={
                        land.crop_type
                      }
                    />
                  </div>

                  {/* =================================================
                      ACTIONS
                  ================================================= */}

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginTop: "20px",
                      flexWrap:
                        "wrap",
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
                        background:
                          "#1565C0",
                        color:
                          "white",
                        border:
                          "none",
                        padding:
                          "10px 18px",
                        borderRadius:
                          "5px",
                        cursor:
                          isLoading
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      👁 View
                    </button>

                    {/* APPROVE */}

                    {land.status !==
                      "approved" && (
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
                          background:
                            "#2E7D32",
                          color:
                            "white",
                          border:
                            "none",
                          padding:
                            "10px 18px",
                          borderRadius:
                            "5px",
                          cursor:
                            isLoading
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        {isLoading
                          ? "Processing..."
                          : "Approve"}
                      </button>
                    )}

                    {/* REQUEST CHANGES */}

                    {land.status !==
                      "changes_requested" && (
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
                          background:
                            "#EF6C00",
                          color:
                            "white",
                          border:
                            "none",
                          padding:
                            "10px 18px",
                          borderRadius:
                            "5px",
                          cursor:
                            isLoading
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        Request
                        Changes
                      </button>
                    )}

                    {/* REJECT */}

                    {land.status !==
                      "rejected" && (
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
                          background:
                            "#C62828",
                          color:
                            "white",
                          border:
                            "none",
                          padding:
                            "10px 18px",
                          borderRadius:
                            "5px",
                          cursor:
                            isLoading
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        Reject
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
                        background:
                          "#555",
                        color:
                          "white",
                        border:
                          "none",
                        padding:
                          "10px 18px",
                        borderRadius:
                          "5px",
                        cursor:
                          isLoading
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>

                  {/* =================================================
                      REVIEW REASON
                  ================================================= */}

                  {land.rejection_reason && (
                    <div
                      style={{
                        marginTop:
                          "15px",
                        padding:
                          "12px",
                        background:
                          "#FFF3E0",
                        borderRadius:
                          "6px",
                      }}
                    >
                      <strong>
                        Review Reason:
                      </strong>{" "}
                      {
                        land.rejection_reason
                      }
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* =================================================
              PAGINATION
          ================================================= */}

          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent:
                  "center",
                alignItems:
                  "center",
                gap: "15px",
                marginTop: "25px",
              }}
            >
              <button
                onClick={
                  goToPreviousPage
                }
                disabled={page === 1}
                style={{
                  padding:
                    "10px 18px",
                  border: "none",
                  borderRadius:
                    "5px",
                  cursor:
                    page === 1
                      ? "not-allowed"
                      : "pointer",
                  background:
                    page === 1
                      ? "#ccc"
                      : "#1565C0",
                  color: "white",
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
                  page ===
                  totalPages
                }
                style={{
                  padding:
                    "10px 18px",
                  border: "none",
                  borderRadius:
                    "5px",
                  cursor:
                    page ===
                    totalPages
                      ? "not-allowed"
                      : "pointer",
                  background:
                    page ===
                    totalPages
                      ? "#ccc"
                      : "#1565C0",
                  color: "white",
                }}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    
  );
}

// =========================================================
// DETAIL COMPONENT
// =========================================================

function Detail({
  label,
  value,
}) {
  return (
    <p
      style={{
        margin: 0,
        padding: "10px",
        background: "#F8F9FA",
        borderRadius: "6px",
      }}
    >
      <strong>
        {label}:
      </strong>{" "}
      {value || "N/A"}
    </p>
  );
}

export default AdminLands;