import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUsers,
  FaSearch,
  FaSyncAlt,
  FaEye,
  FaUserShield,
  FaUserTie,
  FaShoppingCart,
  FaChevronLeft,
  FaChevronRight,
  FaTrash,
  FaBan,
  FaCheckCircle,
} from "react-icons/fa";
import api from "../../services/api";

function Users() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [suspendingId, setSuspendingId] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const LIMIT = 10;

  // =========================================================
  // FETCH USERS
  // =========================================================

  const fetchUsers = async () => {
    try {
      if (users.length === 0) {
        setLoading(true);
      } else {
        setSearchLoading(true);
      }

      const response = await api.get("/admin/users", {
        params: {
          search: search.trim(),
          role,
          status,
          page,
          limit: LIMIT,
        },
      });

      console.log(
        "Users API Response:",
        response.data
      );

      if (Array.isArray(response.data.users)) {
        setUsers(response.data.users);
      } else {
        setUsers([]);
      }

      setTotal(
        typeof response.data.total === "number"
          ? response.data.total
          : 0
      );
    } catch (error) {
      console.error(
        "Failed to load users:",
        error
      );

      setUsers([]);
      setTotal(0);

      alert(
        error.response?.data?.detail ||
          "Failed to load users"
      );
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };

  // =========================================================
  // FETCH WHEN SEARCH / ROLE / PAGE CHANGES
  // =========================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 400);

    return () => clearTimeout(timer);
  }, [page, search, role, status]);

  // =========================================================
  // TOTAL PAGES
  // =========================================================

  const totalPages = Math.max(
    1,
    Math.ceil(total / LIMIT)
  );

  // =========================================================
  // ROLE COLOR
  // =========================================================

  const getRoleColor = (userRole) => {
    switch (userRole?.toLowerCase()) {
      case "admin":
        return "#D81B60";

      case "farmer":
        return "#2E7D32";

      case "buyer":
        return "#1565C0";

      default:
        return "#757575";
    }
  };

  // =========================================================
  // ROLE ICON
  // =========================================================

  const getRoleIcon = (userRole) => {
    switch (userRole?.toLowerCase()) {
      case "admin":
        return <FaUserShield />;

      case "farmer":
        return <FaUserTie />;

      case "buyer":
        return <FaShoppingCart />;

      default:
        return <FaUsers />;
    }
  };

  // =========================================================
  // SEARCH
  // =========================================================

  const handleSearchChange = (event) => {
    setPage(1);
    setSearch(event.target.value);
  };

  // =========================================================
  // ROLE FILTER
  // =========================================================

  const handleRoleChange = (event) => {
    setPage(1);
    setRole(event.target.value);
  };

  // =========================================================
  // ACCOUNT STATUS FILTER
  // =========================================================

  const handleStatusChange = (event) => {
    setPage(1);
    setStatus(event.target.value);
  };

  // =========================================================
  // PAGINATION
  // =========================================================

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(
        (currentPage) =>
          currentPage - 1
      );
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(
        (currentPage) =>
          currentPage + 1
      );
    }
  };

  // =========================================================
  // REFRESH
  // =========================================================

  const handleRefresh = () => {
    fetchUsers();
  };

  // =========================================================
  // SUSPEND / UNSUSPEND USER
  // =========================================================

  const handleSuspendUser = async (user) => {
    // Admin protection
    if (
      user.role?.toLowerCase() ===
      "admin"
    ) {
      alert(
        "Admin accounts cannot be suspended."
      );
      return;
    }

    const currentlySuspended =
      Boolean(user.is_suspended);

    const action =
      currentlySuspended
        ? "restore"
        : "suspend";

    const confirmed = window.confirm(
      currentlySuspended
        ? `Are you sure you want to restore "${user.full_name}"?\n\n` +
            "This user will be able to use the application again."
        : `Are you sure you want to suspend "${user.full_name}"?\n\n` +
            "This user will no longer be able to access protected application features."
    );

    if (!confirmed) {
      return;
    }

    try {
      setSuspendingId(user.id);

      const response = await api.put(
        `/admin/users/${user.id}/${action}`
      );

      console.log(
        "Suspend/Unsuspend response:",
        response.data
      );

      // Update the current user immediately
      setUsers(
        (previousUsers) =>
          previousUsers.map(
            (currentUser) =>
              currentUser.id === user.id
                ? {
                    ...currentUser,
                    is_suspended:
                      response.data
                        ?.is_suspended ??
                      !currentlySuspended,
                  }
                : currentUser
          )
      );

      alert(
        response.data?.message ||
          (currentlySuspended
            ? "User unsuspended successfully."
            : "User suspended successfully.")
      );
    } catch (error) {
      console.error(
        "Suspend/Unsuspend User Error:",
        error
      );

      alert(
        error.response?.data?.detail ||
          (currentlySuspended
            ? "Failed to unsuspend user."
            : "Failed to suspend user.")
      );
    } finally {
      setSuspendingId(null);
    }
  };

  // =========================================================
  // DELETE USER
  // =========================================================

  const handleDeleteUser = async (user) => {
    // Frontend protection
    if (
      user.role?.toLowerCase() ===
      "admin"
    ) {
      alert(
        "Admin accounts cannot be deleted."
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${user.full_name}"?\n\n` +
        "This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(user.id);

      await api.delete(
        `/admin/users/${user.id}`
      );

      // Remove deleted user from current page
      setUsers(
        (previousUsers) =>
          previousUsers.filter(
            (currentUser) =>
              currentUser.id !==
              user.id
          )
      );

      // Update total
      setTotal(
        (previousTotal) =>
          Math.max(
            0,
            previousTotal - 1
          )
      );

      alert(
        "User deleted successfully."
      );
    } catch (error) {
      console.error(
        "Delete User Error:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to delete user."
      );
    } finally {
      setDeletingId(null);
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
        Loading Users...
      </div>
    );
  }

  // =========================================================
  // UI
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
            "linear-gradient(135deg,#1565C0,#42A5F5)",
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
          👥 User Management
        </h1>

        <p
          style={{
            marginTop: "10px",
            marginBottom: 0,
            fontSize: "16px",
          }}
        >
          Manage all registered users.
        </p>
      </div>

      {/* =====================================================
          SEARCH + FILTERS
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
          {/* Search */}

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

            {searchLoading && (
              <span
                style={{
                  marginLeft: "10px",
                  fontSize: "12px",
                  color: "#1976D2",
                  whiteSpace:
                    "nowrap",
                }}
              >
                Searching...
              </span>
            )}

            <input
              type="text"
              placeholder="Search by name, email or mobile..."
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
                fontSize: "16px",
              }}
            />
          </div>

          {/* Role Filter */}

          <select
            value={role}
            onChange={
              handleRoleChange
            }
            style={{
              padding: "13px",
              borderRadius: "10px",
              border: "1px solid #ccc",
              background: "#fff",
              fontSize: "15px",
              minWidth: "170px",
              cursor: "pointer",
            }}
          >
            <option value="">
              All Roles
            </option>

            <option value="admin">
              Admin
            </option>

            <option value="farmer">
              Farmer
            </option>

            <option value="buyer">
              Buyer
            </option>
          </select>

          {/* Account Status Filter */}

          <select
            value={status}
            onChange={handleStatusChange}
            style={{
              padding: "13px",
              borderRadius: "10px",
              border: "1px solid #ccc",
              background: "#fff",
              fontSize: "15px",
              minWidth: "170px",
              cursor: "pointer",
            }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>

          {/* Refresh */}

          <button
            onClick={handleRefresh}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              background: "#2E7D32",
              color: "#fff",
              border: "none",
              padding: "13px 20px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "15px",
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
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          marginBottom: "25px",
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "15px",
            flex: 1,
            minWidth: "220px",
            boxShadow:
              "0 5px 15px rgba(0,0,0,0.08)",
          }}
        >
          <FaUsers
            size={35}
            color="#1565C0"
          />

          <h3
            style={{
              marginBottom: "5px",
            }}
          >
            Total Users
          </h3>

          <h2
            style={{
              margin: 0,
              color: "#1565C0",
            }}
          >
            {total}
          </h2>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "15px",
            flex: 1,
            minWidth: "220px",
            boxShadow:
              "0 5px 15px rgba(0,0,0,0.08)",
          }}
        >
          <FaUsers
            size={35}
            color="#2E7D32"
          />

          <h3
            style={{
              marginBottom: "5px",
            }}
          >
            Showing
          </h3>

          <h2
            style={{
              margin: 0,
              color: "#2E7D32",
            }}
          >
            {users.length}
          </h2>
        </div>
      </div>

      {/* =====================================================
          USER LIST
      ====================================================== */}

      {users.length === 0 ? (
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
          <FaUsers
            size={50}
            color="#999"
          />

          <h2>
            No Users Found
          </h2>

          <p
            style={{
              color: "#777",
            }}
          >
            Try changing your search
            or role filter.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(320px,1fr))",
            gap: "20px",
          }}
        >
          {users.map((user) => {
            const isSuspended =
              Boolean(
                user.is_suspended
              );

            const isAdmin =
              user.role?.toLowerCase() ===
              "admin";

            const isSuspensionLoading =
              suspendingId ===
              user.id;

            const isDeleteLoading =
              deletingId ===
              user.id;

            return (
              <div
                key={user.id}
                style={{
                  background: "#fff",
                  borderRadius: "18px",
                  padding: "22px",
                  boxShadow:
                    "0 6px 18px rgba(0,0,0,0.10)",
                  border: isSuspended
                    ? "2px solid #EF6C00"
                    : "2px solid transparent",
                }}
              >
                {/* =================================================
                    USER NAME
                ================================================== */}

                <h2
                  style={{
                    marginTop: 0,
                    marginBottom: "15px",
                    color: "#222",
                  }}
                >
                  {user.full_name ||
                    "Unknown User"}
                </h2>

                {/* Email */}

                <p>
                  <strong>
                    Email:
                  </strong>{" "}
                  {user.email ||
                    "N/A"}
                </p>

                {/* Mobile */}

                <p>
                  <strong>
                    Mobile:
                  </strong>{" "}
                  {user.mobile ||
                    "N/A"}
                </p>

                {/* User ID */}

                <p>
                  <strong>
                    User ID:
                  </strong>{" "}
                  {user.id}
                </p>

                {/* =================================================
                    ROLE
                ================================================== */}

                <div
                  style={{
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    gap: "8px",
                    background:
                      getRoleColor(
                        user.role
                      ),
                    color: "#fff",
                    padding:
                      "8px 14px",
                    borderRadius:
                      "30px",
                    fontWeight:
                      "bold",
                    textTransform:
                      "capitalize",
                  }}
                >
                  {getRoleIcon(
                    user.role
                  )}

                  {user.role ||
                    "Unknown"}
                </div>

                {/* =================================================
                    ACCOUNT STATUS
                ================================================== */}

                <div
                  style={{
                    marginTop: "15px",
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    gap: "8px",
                    background:
                      isSuspended
                        ? "#FFF3E0"
                        : "#E8F5E9",
                    color:
                      isSuspended
                        ? "#EF6C00"
                        : "#2E7D32",
                    padding:
                      "8px 14px",
                    borderRadius:
                      "30px",
                    fontWeight:
                      "bold",
                  }}
                >
                  {isSuspended ? (
                    <FaBan />
                  ) : (
                    <FaCheckCircle />
                  )}

                  {isSuspended
                    ? "Suspended"
                    : "Active"}
                </div>

                {/* =================================================
                    VIEW DETAILS
                ================================================== */}

                <button
                  onClick={() =>
                    navigate(
                      `/admin/users/${user.id}`
                    )
                  }
                  disabled={
                    isSuspensionLoading ||
                    isDeleteLoading
                  }
                  style={{
                    marginTop: "20px",
                    width: "100%",
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    gap: "8px",
                    background:
                      "#1976D2",
                    color: "#fff",
                    border: "none",
                    padding: "12px",
                    borderRadius:
                      "10px",
                    cursor:
                      "pointer",
                    fontWeight:
                      "bold",
                    fontSize: "15px",
                  }}
                >
                  <FaEye />
                  View Details
                </button>

                {/* =================================================
                    SUSPEND / UNSUSPEND
                ================================================== */}

                {!isAdmin && (
                  <button
                    onClick={() =>
                      handleSuspendUser(
                        user
                      )
                    }
                    disabled={
                      isSuspensionLoading ||
                      isDeleteLoading
                    }
                    style={{
                      marginTop:
                        "10px",
                      width: "100%",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      gap: "8px",
                      background:
                        isSuspensionLoading
                          ? "#999"
                          : isSuspended
                          ? "#2E7D32"
                          : "#EF6C00",
                      color: "#fff",
                      border: "none",
                      padding:
                        "12px",
                      borderRadius:
                        "10px",
                      cursor:
                        isSuspensionLoading ||
                        isDeleteLoading
                          ? "not-allowed"
                          : "pointer",
                      fontWeight:
                        "bold",
                      fontSize:
                        "15px",
                    }}
                  >
                    {isSuspensionLoading ? (
                      <>
                        {isSuspended
                          ? "Unsuspending..."
                          : "Suspending..."}
                      </>
                    ) : (
                      <>
                        {isSuspended ? (
                          <FaCheckCircle />
                        ) : (
                          <FaBan />
                        )}

                        {isSuspended
                          ? "Restore User"
                          : "Suspend User"}
                      </>
                    )}
                  </button>
                )}

                {/* =================================================
                    DELETE USER
                ================================================== */}

                {!isAdmin && (
                  <button
                    onClick={() =>
                      handleDeleteUser(
                        user
                      )
                    }
                    disabled={
                      isDeleteLoading ||
                      isSuspensionLoading
                    }
                    style={{
                      marginTop:
                        "10px",
                      width: "100%",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      gap: "8px",
                      background:
                        isDeleteLoading
                          ? "#999"
                          : "#D32F2F",
                      color: "#fff",
                      border: "none",
                      padding:
                        "12px",
                      borderRadius:
                        "10px",
                      cursor:
                        isDeleteLoading ||
                        isSuspensionLoading
                          ? "not-allowed"
                          : "pointer",
                      fontWeight:
                        "bold",
                      fontSize:
                        "15px",
                    }}
                  >
                    <FaTrash />

                    {isDeleteLoading
                      ? "Deleting..."
                      : "Delete User"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================
          PAGINATION
      ====================================================== */}

      {total > 0 && (
        <div
          style={{
            marginTop: "35px",
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
          {/* Previous */}

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

export default Users;