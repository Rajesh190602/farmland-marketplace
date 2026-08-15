import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import api from "../../services/api";

function AdminLands() {
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
  // Load Lands
  // =========================================================

  const fetchLands = async () => {
    try {
      setLoading(true);

      const response = await api.get("/admin/lands", {
        params: {
          search,
          status,
          page,
          limit,
        },
      });

      setLands(response.data.lands || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error("Failed to load admin lands:", error);

      if (error.response?.status === 401) {
        return;
      }

      alert(
        error.response?.data?.detail ||
          "Failed to load lands."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLands();
  }, [page, status]);

  // =========================================================
  // Search
  // =========================================================

  const handleSearch = (e) => {
    e.preventDefault();

    setPage(1);
    fetchLands();
  };

  // =========================================================
  // Approve
  // =========================================================

  const approveLand = async (landId) => {
    if (
      !window.confirm(
        "Are you sure you want to approve this land?"
      )
    ) {
      return;
    }

    try {
      setActionLoading(landId);

      await api.put(
        `/admin/lands/${landId}/approve`
      );

      alert("Land approved successfully.");

      await fetchLands();
    } catch (error) {
      console.error("Approve error:", error);

      alert(
        error.response?.data?.detail ||
          "Failed to approve land."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =========================================================
  // Request Changes
  // =========================================================

  const requestChanges = async (landId) => {
    const reason = window.prompt(
      "Enter the reason for requesting changes:"
    );

    if (!reason || !reason.trim()) {
      return;
    }

    try {
      setActionLoading(landId);

      await api.put(
        `/admin/lands/${landId}/request-changes`,
        {
          reason: reason.trim(),
        }
      );

      alert("Changes requested successfully.");

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
  // Reject
  // =========================================================

  const rejectLand = async (landId) => {
    const reason = window.prompt(
      "Enter the reason for rejecting this land:"
    );

    if (!reason || !reason.trim()) {
      return;
    }

    try {
      setActionLoading(landId);

      await api.put(
        `/admin/lands/${landId}/reject`,
        {
          reason: reason.trim(),
        }
      );

      alert("Land rejected successfully.");

      await fetchLands();
    } catch (error) {
      console.error("Reject error:", error);

      alert(
        error.response?.data?.detail ||
          "Failed to reject land."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =========================================================
  // Delete
  // =========================================================

  const deleteLand = async (landId) => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this land?"
      )
    ) {
      return;
    }

    try {
      setActionLoading(landId);

      await api.delete(
        `/admin/lands/${landId}`
      );

      alert("Land deleted successfully.");

      await fetchLands();
    } catch (error) {
      console.error("Delete error:", error);

      alert(
        error.response?.data?.detail ||
          "Failed to delete land."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =========================================================
  // Status Badge
  // =========================================================

  const getStatusStyle = (landStatus) => {
    if (landStatus === "approved") {
      return {
        background: "#E8F5E9",
        color: "#2E7D32",
      };
    }

    if (landStatus === "rejected") {
      return {
        background: "#FFEBEE",
        color: "#C62828",
      };
    }

    if (landStatus === "changes_requested") {
      return {
        background: "#FFF3E0",
        color: "#EF6C00",
      };
    }

    return {
      background: "#FFF8E1",
      color: "#F57F17",
    };
  };

  // =========================================================
  // Pagination
  // =========================================================

  const totalPages = Math.ceil(total / limit);

  const goToPreviousPage = () => {
    if (page > 1) {
      setPage((previous) => previous - 1);
    }
  };

  const goToNextPage = () => {
    if (page < totalPages) {
      setPage((previous) => previous + 1);
    }
  };

  // =========================================================
  // Loading
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
  // Page
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

          {/* Search & Filter */}

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
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search land, village, mandal, district..."
                style={{
                  flex: 1,
                  minWidth: "250px",
                  padding: "10px",
                  border: "1px solid #ccc",
                  borderRadius: "5px",
                }}
              />

              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: "10px",
                  border: "1px solid #ccc",
                  borderRadius: "5px",
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
                  padding: "10px 20px",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Search
              </button>
            </form>
          </div>

          {/* Lands */}

          {lands.length === 0 ? (
            <div
              style={{
                background: "white",
                padding: "40px",
                textAlign: "center",
                borderRadius: "10px",
              }}
            >
              <h2>No lands found.</h2>
            </div>
          ) : (
            lands.map((land) => {
              const images = land.images || [];

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
                  {/* Land Header */}

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "flex-start",
                      gap: "15px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          marginTop: 0,
                          color: "#333",
                        }}
                      >
                        {land.title}
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
                        {land.owner_name}
                      </p>

                      <p>
                        <strong>
                          Mobile:
                        </strong>{" "}
                        {land.owner_mobile}
                      </p>

                      <p>
                        <strong>
                          Email:
                        </strong>{" "}
                        {land.owner_email}
                      </p>
                    </div>

                    <span
                      style={{
                        ...getStatusStyle(
                          land.status
                        ),
                        padding:
                          "8px 14px",
                        borderRadius: "20px",
                        fontWeight: "bold",
                        textTransform:
                          "capitalize",
                      }}
                    >
                      {land.status.replace(
                        "_",
                        " "
                      )}
                    </span>
                  </div>

                  {/* Gallery */}

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

                    {images.length > 0 ? (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(180px, 1fr))",
                          gap: "12px",
                        }}
                      >
                        {images.map(
                          (image) => (
                            <div
                              key={image.id}
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
                                  image.image_url
                                }
                                alt={`${land.title} land`}
                                style={{
                                  width: "100%",
                                  height:
                                    "180px",
                                  objectFit:
                                    "cover",
                                  display:
                                    "block",
                                }}
                              />
                            </div>
                          )
                        )}
                      </div>
                    ) : land.image_url ? (
                      <img
                        src={land.image_url}
                        alt={land.title}
                        style={{
                          width: "250px",
                          height: "180px",
                          objectFit: "cover",
                          borderRadius: "10px",
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
                        No images uploaded.
                      </p>
                    )}
                  </div>

                  {/* Land Details */}

                  <div
                    style={{
                      marginTop: "20px",
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "10px",
                    }}
                  >
                    <p>
                      <strong>
                        Description:
                      </strong>{" "}
                      {land.description}
                    </p>

                    <p>
                      <strong>
                        Price:
                      </strong>{" "}
                      ₹{land.price}
                    </p>

                    <p>
                      <strong>
                        Area:
                      </strong>{" "}
                      {land.area} Acres
                    </p>

                    <p>
                      <strong>
                        Village:
                      </strong>{" "}
                      {land.village}
                    </p>

                    <p>
                      <strong>
                        Mandal:
                      </strong>{" "}
                      {land.mandal}
                    </p>

                    <p>
                      <strong>
                        District:
                      </strong>{" "}
                      {land.district}
                    </p>

                    <p>
                      <strong>
                        State:
                      </strong>{" "}
                      {land.state}
                    </p>

                    <p>
                      <strong>
                        Pincode:
                      </strong>{" "}
                      {land.pincode}
                    </p>

                    <p>
                      <strong>
                        Survey Number:
                      </strong>{" "}
                      {land.survey_number}
                    </p>

                    <p>
                      <strong>
                        Soil Type:
                      </strong>{" "}
                      {land.soil_type}
                    </p>

                    <p>
                      <strong>
                        Water Source:
                      </strong>{" "}
                      {land.water_source}
                    </p>

                    <p>
                      <strong>
                        Crop Type:
                      </strong>{" "}
                      {land.crop_type}
                    </p>
                  </div>

                  {/* Actions */}

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginTop: "20px",
                      flexWrap: "wrap",
                    }}
                  >
                    {land.status !==
                      "approved" && (
                      <button
                        onClick={() =>
                          approveLand(
                            land.id
                          )
                        }
                        disabled={
                          actionLoading ===
                          land.id
                        }
                        style={{
                          background:
                            "#2E7D32",
                          color: "white",
                          border: "none",
                          padding:
                            "10px 18px",
                          borderRadius:
                            "5px",
                          cursor:
                            "pointer",
                        }}
                      >
                        Approve
                      </button>
                    )}

                    {land.status !==
                      "changes_requested" && (
                      <button
                        onClick={() =>
                          requestChanges(
                            land.id
                          )
                        }
                        disabled={
                          actionLoading ===
                          land.id
                        }
                        style={{
                          background:
                            "#EF6C00",
                          color: "white",
                          border: "none",
                          padding:
                            "10px 18px",
                          borderRadius:
                            "5px",
                          cursor:
                            "pointer",
                        }}
                      >
                        Request Changes
                      </button>
                    )}

                    {land.status !==
                      "rejected" && (
                      <button
                        onClick={() =>
                          rejectLand(
                            land.id
                          )
                        }
                        disabled={
                          actionLoading ===
                          land.id
                        }
                        style={{
                          background:
                            "#C62828",
                          color: "white",
                          border: "none",
                          padding:
                            "10px 18px",
                          borderRadius:
                            "5px",
                          cursor:
                            "pointer",
                        }}
                      >
                        Reject
                      </button>
                    )}

                    <button
                      onClick={() =>
                        deleteLand(
                          land.id
                        )
                      }
                      disabled={
                        actionLoading ===
                        land.id
                      }
                      style={{
                        background:
                          "#555",
                        color: "white",
                        border: "none",
                        padding:
                          "10px 18px",
                        borderRadius:
                          "5px",
                        cursor:
                          "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>

                  {land.rejection_reason && (
                    <div
                      style={{
                        marginTop: "15px",
                        padding: "12px",
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

          {/* Pagination */}

          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent:
                  "center",
                alignItems: "center",
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
                  padding: "10px 18px",
                  border: "none",
                  borderRadius: "5px",
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
                  page === totalPages
                }
                style={{
                  padding: "10px 18px",
                  border: "none",
                  borderRadius: "5px",
                  cursor:
                    page === totalPages
                      ? "not-allowed"
                      : "pointer",
                  background:
                    page === totalPages
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
    </>
  );
}

export default AdminLands;