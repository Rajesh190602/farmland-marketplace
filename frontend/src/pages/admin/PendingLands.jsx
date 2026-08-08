import { useEffect, useState } from "react";
import {
  FaSearch,
  FaSyncAlt,
  FaCheck,
  FaTimes,
  FaEdit,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import api from "../../services/api";

function PendingLands() {
  const [lands, setLands] = useState([]);
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const LIMIT = 10;

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPendingLands();
    }, 400);

    return () => clearTimeout(timer);
  }, [page, search]);

  // Fetch pending lands
  const fetchPendingLands = async () => {
    try {
      // Full-screen loading ONLY during the first page load
      if (initialLoad) {
        setLoading(true);
      } else {
        // For search, pagination and refresh, don't hide the page
        setSearchLoading(true);
      }

      const response = await api.get("/admin/lands/pending", {
        params: {
          search: search.trim(),
          page: page,
          limit: LIMIT,
        },
      });

      console.log(
        "Pending Lands API Response:",
        response.data
      );

      const data = response.data;

      // New backend response:
      // {
      //   total: number,
      //   page: number,
      //   limit: number,
      //   lands: []
      // }

      if (Array.isArray(data.lands)) {
        setLands(data.lands);
      } else {
        setLands([]);
      }

      setTotal(
        typeof data.total === "number"
          ? data.total
          : 0
      );
    } catch (error) {
      console.error(
        "Failed to load pending lands:",
        error
      );

      setLands([]);
      setTotal(0);

      alert(
        error.response?.data?.detail ||
          "Failed to load pending lands"
      );
    } finally {
      setLoading(false);
      setSearchLoading(false);
      setInitialLoad(false);
    }
  };

  // Total pages
  const totalPages = Math.max(
    1,
    Math.ceil(total / LIMIT)
  );

  // Search
  const handleSearchChange = (event) => {
    setSearch(event.target.value);

    // Always return to page 1 when search changes
    setPage(1);
  };

  // Previous page
  const handlePreviousPage = () => {
    if (page > 1) {
      setPage((currentPage) => currentPage - 1);
    }
  };

  // Next page
  const handleNextPage = () => {
    if (page < totalPages) {
      setPage((currentPage) => currentPage + 1);
    }
  };

  // Approve land
  const approveLand = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to approve this land?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await api.put(
        `/admin/lands/${id}/approve`
      );

      alert(
        response.data?.message ||
          "Land approved successfully"
      );

      // Reload pending lands
      await fetchPendingLands();
    } catch (error) {
      console.error(
        "Approval failed:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Approval failed"
      );
    }
  };

  // Request changes
  const requestChanges = async (id) => {
    const reason = window.prompt(
      "Enter reason for requesting changes:"
    );

    if (!reason || !reason.trim()) {
      return;
    }

    try {
      const response = await api.put(
        `/admin/lands/${id}/request-changes`,
        {
          reason: reason.trim(),
        }
      );

      alert(
        response.data?.message ||
          "Changes requested successfully"
      );

      await fetchPendingLands();
    } catch (error) {
      console.error(
        "Request changes failed:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Request changes failed"
      );
    }
  };

  // Reject land
  const rejectLand = async (id) => {
    const reason = window.prompt(
      "Enter reason for rejection:"
    );

    if (!reason || !reason.trim()) {
      return;
    }

    try {
      const response = await api.put(
        `/admin/lands/${id}/reject`,
        {
          reason: reason.trim(),
        }
      );

      alert(
        response.data?.message ||
          "Land rejected successfully"
      );

      await fetchPendingLands();
    } catch (error) {
      console.error(
        "Reject failed:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Reject failed"
      );
    }
  };

  // First page loading
  if (loading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "24px",
          color: "#2E7D32",
          fontWeight: "bold",
        }}
      >
        Loading Pending Lands...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5F7FA",
        padding: "30px",
      }}
    >
      {/* Header */}

      <div
        style={{
          background:
            "linear-gradient(135deg,#FB8C00,#FDD835)",
          color: "#fff",
          padding: "25px",
          borderRadius: "18px",
          marginBottom: "30px",
          boxShadow:
            "0 6px 18px rgba(0,0,0,0.10)",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "30px",
          }}
        >
          🟡 Pending Land Approvals
        </h1>

        <p
          style={{
            marginTop: "10px",
            marginBottom: 0,
          }}
        >
          Review and approve newly submitted lands.
        </p>
      </div>

      {/* Search and Refresh */}

      <div
        style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "15px",
          marginBottom: "25px",
          boxShadow:
            "0 5px 15px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "15px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {/* Search */}

          <div
            style={{
              flex: 1,
              minWidth: "280px",
              display: "flex",
              alignItems: "center",
              background: "#F5F7FA",
              border: "1px solid #ddd",
              borderRadius: "10px",
              padding: "12px",
            }}
          >
            <FaSearch color="#777" />

            <input
              type="text"
              placeholder="Search title, owner, village, mandal, district or survey number..."
              value={search}
              onChange={handleSearchChange}
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                marginLeft: "10px",
                width: "100%",
                fontSize: "15px",
              }}
            />

            {searchLoading && (
              <span
                style={{
                  marginLeft: "10px",
                  fontSize: "12px",
                  color: "#1976D2",
                  whiteSpace: "nowrap",
                }}
              >
                Searching...
              </span>
            )}
          </div>

          {/* Refresh */}

          <button
            onClick={fetchPendingLands}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#2E7D32",
              color: "#fff",
              border: "none",
              padding: "13px 20px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            <FaSyncAlt />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary */}

      <div
        style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "15px",
          marginBottom: "25px",
          boxShadow:
            "0 5px 15px rgba(0,0,0,0.08)",
        }}
      >
        <h3
          style={{
            margin: 0,
          }}
        >
          Pending Lands: {total}
        </h3>

        <p
          style={{
            marginBottom: 0,
            color: "#777",
          }}
        >
          Showing {lands.length} lands on page{" "}
          {page}
        </p>
      </div>

      {/* No results */}

      {lands.length === 0 ? (
        <div
          style={{
            background: "#fff",
            padding: "50px 30px",
            borderRadius: "15px",
            textAlign: "center",
            boxShadow:
              "0 5px 15px rgba(0,0,0,0.08)",
          }}
        >
          <h2>No Pending Lands</h2>

          {search.trim() ? (
            <p
              style={{
                color: "#777",
              }}
            >
              No pending lands found for "
              {search}".
            </p>
          ) : (
            <p
              style={{
                color: "#777",
              }}
            >
              There are currently no lands waiting
              for approval.
            </p>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(340px,1fr))",
            gap: "20px",
          }}
        >
          {lands.map((land) => (
            <div
              key={land.id}
              style={{
                background: "#fff",
                borderRadius: "15px",
                padding: "20px",
                boxShadow:
                  "0 5px 15px rgba(0,0,0,0.10)",
              }}
            >
              {/* Image */}

              {land.image_url &&
              land.image_url !== "string" ? (
                <img
                  src={land.image_url}
                  alt={
                    land.title || "Land"
                  }
                  style={{
                    width: "100%",
                    height: "220px",
                    objectFit: "cover",
                    borderRadius: "10px",
                    marginBottom: "15px",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "220px",
                    background: "#EEEEEE",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "15px",
                    color: "#777",
                  }}
                >
                  No Image
                </div>
              )}

              {/* Land title */}

              <h2>
                {land.title ||
                  "Untitled Land"}
              </h2>

              {/* Description */}

              {land.description && (
                <p>
                  <strong>
                    Description:
                  </strong>{" "}
                  {land.description}
                </p>
              )}

              {/* Owner */}

              <p>
                <strong>
                  Owner:
                </strong>{" "}
                {land.owner_name ||
                  "Unknown"}
              </p>

              <p>
                <strong>
                  Email:
                </strong>{" "}
                {land.owner_email ||
                  "N/A"}
              </p>

              <p>
                <strong>
                  Mobile:
                </strong>{" "}
                {land.owner_mobile ||
                  "N/A"}
              </p>

              {/* Location */}

              <p>
                <strong>
                  Village:
                </strong>{" "}
                {land.village ||
                  "N/A"}
              </p>

              <p>
                <strong>
                  Mandal:
                </strong>{" "}
                {land.mandal ||
                  "N/A"}
              </p>

              <p>
                <strong>
                  District:
                </strong>{" "}
                {land.district ||
                  "N/A"}
              </p>

              <p>
                <strong>
                  State:
                </strong>{" "}
                {land.state ||
                  "N/A"}
              </p>

              <p>
                <strong>
                  Pincode:
                </strong>{" "}
                {land.pincode ||
                  "N/A"}
              </p>

              {/* Land details */}

              <p>
                <strong>
                  Survey Number:
                </strong>{" "}
                {land.survey_number ||
                  "N/A"}
              </p>

              <p>
                <strong>
                  Soil Type:
                </strong>{" "}
                {land.soil_type ||
                  "N/A"}
              </p>

              <p>
                <strong>
                  Water Source:
                </strong>{" "}
                {land.water_source ||
                  "N/A"}
              </p>

              <p>
                <strong>
                  Crop:
                </strong>{" "}
                {land.crop_type ||
                  "N/A"}
              </p>

              <p>
                <strong>
                  Area:
                </strong>{" "}
                {land.area || 0} Acres
              </p>

              <p>
                <strong>
                  Price:
                </strong>{" "}
                ₹ {land.price || 0}
              </p>

              {/* Status */}

              <p>
                <strong>
                  Status:
                </strong>{" "}
                <span
                  style={{
                    display:
                      "inline-block",
                    background:
                      "#FB8C00",
                    color: "#fff",
                    padding:
                      "5px 10px",
                    borderRadius:
                      "20px",
                    textTransform:
                      "capitalize",
                    fontWeight:
                      "bold",
                  }}
                >
                  {land.status ||
                    "pending"}
                </span>
              </p>

              {/* Actions */}

              <div
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: "10px",
                  marginTop: "20px",
                }}
              >
                {/* Approve */}

                <button
                  onClick={() =>
                    approveLand(
                      land.id
                    )
                  }
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    gap: "8px",
                    background:
                      "#2E7D32",
                    color: "#fff",
                    border: "none",
                    padding: "12px",
                    borderRadius:
                      "8px",
                    cursor:
                      "pointer",
                    fontWeight:
                      "bold",
                  }}
                >
                  <FaCheck />
                  Approve
                </button>

                {/* Request changes */}

                <button
                  onClick={() =>
                    requestChanges(
                      land.id
                    )
                  }
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    gap: "8px",
                    background:
                      "#FB8C00",
                    color: "#fff",
                    border: "none",
                    padding: "12px",
                    borderRadius:
                      "8px",
                    cursor:
                      "pointer",
                    fontWeight:
                      "bold",
                  }}
                >
                  <FaEdit />
                  Request Changes
                </button>

                {/* Reject */}

                <button
                  onClick={() =>
                    rejectLand(
                      land.id
                    )
                  }
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    gap: "8px",
                    background:
                      "#D32F2F",
                    color: "#fff",
                    border: "none",
                    padding: "12px",
                    borderRadius:
                      "8px",
                    cursor:
                      "pointer",
                    fontWeight:
                      "bold",
                  }}
                >
                  <FaTimes />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}

      {total > 0 && (
        <div
          style={{
            marginTop: "30px",
            background: "#fff",
            padding: "18px",
            borderRadius: "15px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px",
            flexWrap: "wrap",
            boxShadow:
              "0 5px 15px rgba(0,0,0,0.08)",
          }}
        >
          {/* Previous */}

          <button
            onClick={
              handlePreviousPage
            }
            disabled={page === 1}
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: "8px",
              padding:
                "10px 18px",
              border: "none",
              borderRadius:
                "8px",
              background:
                page === 1
                  ? "#DDD"
                  : "#1976D2",
              color:
                page === 1
                  ? "#777"
                  : "#fff",
              cursor:
                page === 1
                  ? "not-allowed"
                  : "pointer",
              fontWeight:
                "bold",
            }}
          >
            <FaChevronLeft />
            Previous
          </button>

          {/* Page information */}

          <div
            style={{
              fontWeight:
                "bold",
              color: "#333",
              minWidth:
                "130px",
              textAlign:
                "center",
            }}
          >
            Page {page} of{" "}
            {totalPages}
          </div>

          {/* Next */}

          <button
            onClick={
              handleNextPage
            }
            disabled={
              page >=
              totalPages
            }
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: "8px",
              padding:
                "10px 18px",
              border: "none",
              borderRadius:
                "8px",
              background:
                page >=
                totalPages
                  ? "#DDD"
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
              fontWeight:
                "bold",
            }}
          >
            Next
            <FaChevronRight />
          </button>
        </div>
      )}
    </div>
  );
}

export default PendingLands;