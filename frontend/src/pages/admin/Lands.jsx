import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaSearch,
  FaSyncAlt,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import api from "../../services/api";

function Lands() {
  const [lands, setLands] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [district, setDistrict] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  const navigate = useNavigate();

  const LIMIT = 10;

  // =========================================================
  // FETCH LANDS
  // =========================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLands();
    }, 400);

    return () => clearTimeout(timer);
  }, [page, search, status, district]);

  const fetchLands = async () => {
    try {
      if (lands.length === 0) {
        setLoading(true);
      } else {
        setSearchLoading(true);
      }

      const response = await api.get("/admin/lands", {
        params: {
          search: search.trim(),
          status,
          district,
          page,
          limit: LIMIT,
        },
      });

      console.log(
        "Lands API Response:",
        response.data
      );

      if (Array.isArray(response.data.lands)) {
        setLands(response.data.lands);
      } else {
        setLands([]);
      }

      setTotal(
        typeof response.data.total === "number"
          ? response.data.total
          : 0
      );
    } catch (error) {
      console.error(
        "Failed to load lands:",
        error
      );

      setLands([]);
      setTotal(0);

      alert(
        error.response?.data?.detail ||
          "Failed to load lands."
      );
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };

  // =========================================================
  // PAGINATION
  // =========================================================

  const totalPages = Math.max(
    1,
    Math.ceil(total / LIMIT)
  );

  const handleSearchChange = (event) => {
    setPage(1);
    setSearch(event.target.value);
  };

  const handleStatusChange = (event) => {
    setPage(1);
    setStatus(event.target.value);
  };

  const handleDistrictChange = (event) => {
    setPage(1);
    setDistrict(event.target.value);
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(
        (currentPage) => currentPage - 1
      );
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(
        (currentPage) => currentPage + 1
      );
    }
  };

  // =========================================================
  // APPROVE LAND
  // =========================================================

  const approveLand = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to approve this land?\n\n" +
        "The land will become visible to buyers."
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.put(
        `/admin/lands/${id}/approve`
      );

      alert(
        "Land approved successfully."
      );

      fetchLands();
    } catch (error) {
      console.error(
        "Failed to approve land:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to approve land."
      );
    }
  };

  // =========================================================
  // REQUEST CHANGES
  // =========================================================

  const requestChanges = async (id) => {
    const reason = window.prompt(
      "Enter the reason for requesting changes:"
    );

    if (reason === null) {
      return;
    }

    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      alert(
        "Reason is required."
      );
      return;
    }

    try {
      await api.put(
        `/admin/lands/${id}/request-changes`,
        {
          reason: trimmedReason,
        }
      );

      alert(
        "Changes requested successfully."
      );

      fetchLands();
    } catch (error) {
      console.error(
        "Failed to request changes:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to request changes."
      );
    }
  };

  // =========================================================
  // REJECT LAND
  // =========================================================

  const rejectLand = async (id) => {
    const reason = window.prompt(
      "Enter the reason for rejecting this land:"
    );

    if (reason === null) {
      return;
    }

    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      alert(
        "Reason is required."
      );
      return;
    }

    try {
      await api.put(
        `/admin/lands/${id}/reject`,
        {
          reason: trimmedReason,
        }
      );

      alert(
        "Land rejected successfully."
      );

      fetchLands();
    } catch (error) {
      console.error(
        "Failed to reject land:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to reject land."
      );
    }
  };

  // =========================================================
  // DELETE LAND
  // =========================================================

  const deleteLand = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to permanently delete this land?\n\n" +
        "This action cannot be undone."
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await api.delete(
        `/admin/lands/${id}`
      );

      alert(
        "Land deleted successfully."
      );

      fetchLands();
    } catch (error) {
      console.error(
        "Failed to delete land:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to delete land."
      );
    }
  };

  // =========================================================
  // STATUS COLOR
  // =========================================================

  const getStatusColor = (landStatus) => {
    switch (
      landStatus?.toLowerCase()
    ) {
      case "approved":
        return "#2E7D32";

      case "pending":
        return "#F9A825";

      case "rejected":
        return "#D32F2F";

      case "changes_requested":
        return "#EF6C00";

      default:
        return "#757575";
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

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
        background: "#F5F7FA",
        padding: "30px",
      }}
    >
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div
        style={{
          background:
            "linear-gradient(135deg,#2E7D32,#66BB6A)",
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
          🌾 Land Management
        </h1>

        <p
          style={{
            marginTop: "10px",
            marginBottom: 0,
          }}
        >
          Manage all farmland listings.
        </p>
      </div>

      {/* =====================================================
          SEARCH AND FILTERS
      ====================================================== */}

      <div
        style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "15px",
          boxShadow:
            "0 5px 15px rgba(0,0,0,0.08)",
          marginBottom: "25px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "15px",
            alignItems: "center",
          }}
        >
          {/* SEARCH */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#F5F7FA",
              border: "1px solid #ddd",
              borderRadius: "10px",
              padding: "12px",
              flex: 1,
              minWidth: "280px",
            }}
          >
            <FaSearch color="#777" />

            <input
              type="text"
              placeholder="Search title, village, mandal, district, survey number..."
              value={search}
              onChange={
                handleSearchChange
              }
              style={{
                border: "none",
                outline: "none",
                background:
                  "transparent",
                marginLeft: "10px",
                width: "100%",
                fontSize: "15px",
              }}
            />

            {searchLoading && (
              <span
                style={{
                  fontSize: "12px",
                  color: "#1976D2",
                  whiteSpace:
                    "nowrap",
                }}
              >
                Searching...
              </span>
            )}
          </div>

          {/* STATUS */}

          <select
            value={status}
            onChange={
              handleStatusChange
            }
            style={{
              padding: "13px",
              borderRadius: "10px",
              border: "1px solid #ccc",
              background: "#fff",
              fontSize: "15px",
              minWidth: "160px",
              cursor: "pointer",
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

          {/* DISTRICT */}

          <input
            type="text"
            placeholder="District"
            value={district}
            onChange={
              handleDistrictChange
            }
            style={{
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #ccc",
              minWidth: "160px",
              fontSize: "15px",
            }}
          />

          {/* REFRESH */}

          <button
            onClick={fetchLands}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
              gap: "8px",
              background: "#2E7D32",
              color: "#fff",
              border: "none",
              padding:
                "13px 20px",
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

      {/* =====================================================
          SUMMARY
      ====================================================== */}

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
          Total Lands: {total}
        </h3>

        <p
          style={{
            marginBottom: 0,
            color: "#666",
          }}
        >
          Showing {lands.length} lands
          on page {page}
        </p>
      </div>

      {/* =====================================================
          NO RESULTS
      ====================================================== */}

      {lands.length === 0 ? (
        <div
          style={{
            background: "#fff",
            padding:
              "50px 30px",
            borderRadius: "15px",
            textAlign: "center",
            boxShadow:
              "0 5px 15px rgba(0,0,0,0.08)",
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
            Try changing your
            search or filters.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "#fff",
            borderRadius: "15px",
            overflowX: "auto",
            boxShadow:
              "0 5px 15px rgba(0,0,0,0.08)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse:
                "collapse",
              minWidth: "1600px",
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
                  Mobile
                </th>

                <th style={thStyle}>
                  Title
                </th>

                <th style={thStyle}>
                  Village
                </th>

                <th style={thStyle}>
                  Mandal
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
                  Crop
                </th>

                <th style={thStyle}>
                  Status
                </th>

                <th style={thStyle}>
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {lands.map(
                (land) => (
                  <tr key={land.id}>
                    {/* ID */}

                    <td
                      style={
                        tdStyle
                      }
                    >
                      {land.id}
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
                            land.title
                          }
                          width="80"
                          height="60"
                          style={{
                            objectFit:
                              "cover",
                            borderRadius:
                              "5px",
                          }}
                        />
                      ) : (
                        "No Image"
                      )}
                    </td>

                    {/* OWNER */}

                    <td
                      style={
                        tdStyle
                      }
                    >
                      {land.owner_name ||
                        "Unknown"}
                    </td>

                    {/* EMAIL */}

                    <td
                      style={
                        tdStyle
                      }
                    >
                      {land.owner_email ||
                        "N/A"}
                    </td>

                    {/* MOBILE */}

                    <td
                      style={
                        tdStyle
                      }
                    >
                      {land.owner_mobile ||
                        "N/A"}
                    </td>

                    {/* TITLE */}

                    <td
                      style={
                        tdStyle
                      }
                    >
                      {land.title ||
                        "N/A"}
                    </td>

                    {/* VILLAGE */}

                    <td
                      style={
                        tdStyle
                      }
                    >
                      {land.village ||
                        "N/A"}
                    </td>

                    {/* MANDAL */}

                    <td
                      style={
                        tdStyle
                      }
                    >
                      {land.mandal ||
                        "N/A"}
                    </td>

                    {/* DISTRICT */}

                    <td
                      style={
                        tdStyle
                      }
                    >
                      {land.district ||
                        "N/A"}
                    </td>

                    {/* AREA */}

                    <td
                      style={
                        tdStyle
                      }
                    >
                      {land.area || 0}{" "}
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

                    {/* CROP */}

                    <td
                      style={
                        tdStyle
                      }
                    >
                      {land.crop_type ||
                        "N/A"}
                    </td>

                    {/* STATUS */}

                    <td
                      style={
                        tdStyle
                      }
                    >
                      <span
                        style={{
                          display:
                            "inline-block",
                          padding:
                            "6px 10px",
                          borderRadius:
                            "20px",
                          background:
                            getStatusColor(
                              land.status
                            ),
                          color:
                            "#fff",
                          fontWeight:
                            "bold",
                          textTransform:
                            "capitalize",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {land.status ===
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
                          "300px",
                      }}
                    >
                      {/* VIEW */}

                      <button
                        onClick={() =>
                          navigate(
                            `/admin/lands/${land.id}`
                          )
                        }
                        style={{
                          ...actionButton,
                          background:
                            "#455A64",
                        }}
                      >
                        View
                      </button>

                      {/* EDIT */}

                      <button
                        onClick={() =>
                          navigate(
                            `/admin/edit-land/${land.id}`
                          )
                        }
                        style={{
                          ...actionButton,
                          background:
                            "#1976D2",
                        }}
                      >
                        Edit
                      </button>

                      {/* PENDING */}

                      {land.status?.toLowerCase() ===
                        "pending" && (
                        <>
                          <button
                            onClick={() =>
                              approveLand(
                                land.id
                              )
                            }
                            style={{
                              ...actionButton,
                              background:
                                "#2E7D32",
                            }}
                          >
                            Approve
                          </button>

                          <button
                            onClick={() =>
                              requestChanges(
                                land.id
                              )
                            }
                            style={{
                              ...actionButton,
                              background:
                                "#F9A825",
                            }}
                          >
                            Request Changes
                          </button>

                          <button
                            onClick={() =>
                              rejectLand(
                                land.id
                              )
                            }
                            style={{
                              ...actionButton,
                              background:
                                "#D32F2F",
                            }}
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {/* CHANGES REQUESTED */}

                      {land.status?.toLowerCase() ===
                        "changes_requested" && (
                        <>
                          <button
                            onClick={() =>
                              approveLand(
                                land.id
                              )
                            }
                            style={{
                              ...actionButton,
                              background:
                                "#2E7D32",
                            }}
                          >
                            Approve
                          </button>

                          <button
                            onClick={() =>
                              rejectLand(
                                land.id
                              )
                            }
                            style={{
                              ...actionButton,
                              background:
                                "#D32F2F",
                            }}
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {/* DELETE */}

                      <button
                        onClick={() =>
                          deleteLand(
                            land.id
                          )
                        }
                        style={{
                          ...actionButton,
                          background:
                            "#B71C1C",
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* =====================================================
          PAGINATION
      ====================================================== */}

      {total > 0 && (
        <div
          style={{
            marginTop: "30px",
            background: "#fff",
            padding: "18px",
            borderRadius: "15px",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            gap: "20px",
            flexWrap: "wrap",
            boxShadow:
              "0 5px 15px rgba(0,0,0,0.08)",
          }}
        >
          <button
            onClick={
              handlePreviousPage
            }
            disabled={page === 1}
            style={{
              display: "flex",
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
              fontWeight:
                "bold",
            }}
          >
            <FaChevronLeft />
            Previous
          </button>

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

          <button
            onClick={
              handleNextPage
            }
            disabled={
              page >= totalPages
            }
            style={{
              display: "flex",
              alignItems:
                "center",
              gap: "8px",
              padding:
                "10px 18px",
              border: "none",
              borderRadius:
                "8px",
              background:
                page >= totalPages
                  ? "#ddd"
                  : "#1976D2",
              color:
                page >= totalPages
                  ? "#777"
                  : "#fff",
              cursor:
                page >= totalPages
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

// =========================================================
// STYLES
// =========================================================

const thStyle = {
  padding: "12px",
  borderBottom:
    "1px solid #ddd",
  textAlign: "left",
  whiteSpace:
    "nowrap",
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
  padding: "8px 12px",
  marginRight: "6px",
  marginBottom: "6px",
  borderRadius: "5px",
  cursor: "pointer",
  fontWeight: "bold",
};

export default Lands;