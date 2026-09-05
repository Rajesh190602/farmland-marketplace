import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FaBell,
  FaCheckDouble,
  FaTrash,
  FaSync,
  FaEnvelopeOpen,
  FaExternalLinkAlt,
} from "react-icons/fa";

import Navbar from "../components/Navbar";
import api from "../services/api";

const getNotificationCategory = (notification, role) => {
  const targetType = String(notification?.target_type || "").toLowerCase();
  const title = String(notification?.title || "").toLowerCase();
  const message = String(notification?.message || "").toLowerCase();
  const text = `${title} ${message}`;

  if (role === "admin") {
    if (text.includes("report")) return "admin_reports";
    if (
      text.includes("user") ||
      text.includes("account") ||
      text.includes("registration")
    ) {
      return "admin_users";
    }
    if (
      text.includes("listing") ||
      text.includes("land") ||
      text.includes("approval") ||
      targetType === "land"
    ) {
      return "admin_listings";
    }
    if (
      text.includes("transaction") ||
      text.includes("sale") ||
      targetType === "transaction" ||
      targetType === "sale"
    ) {
      return "admin_transactions";
    }
    if (
      targetType === "conversation" ||
      targetType === "message" ||
      text.includes("message") ||
      text.includes("conversation")
    ) {
      return "messages";
    }
    if (targetType === "file" || text.includes("file")) return "files";
    return "admin_system";
  }

  if (
    targetType === "conversation" ||
    targetType === "message" ||
    text.includes("new message") ||
    text.includes("conversation")
  ) {
    return "messages";
  }

  if (targetType === "file" || text.includes("new file") || text.includes("sent you a file")) {
    return "files";
  }

  if (targetType === "offer" || text.includes("offer")) return "offers";
  if (targetType === "reservation" || text.includes("reservation")) {
    return "reservations";
  }
  if (
    targetType === "site_visit" ||
    text.includes("site visit") ||
    text.includes("visit request")
  ) {
    return "site_visits";
  }
  if (
    targetType === "sale" ||
    targetType === "transaction" ||
    text.includes("sale completed") ||
    text.includes("land sold") ||
    text.includes("transaction")
  ) {
    return "sales";
  }
  if (targetType === "inquiry" || text.includes("inquiry")) return "inquiries";
  return "land";
};

const notificationCategoryLabels = {
  all: "🔔 All",
  unread: "🔵 Unread",
  land: "🌾 Land",
  inquiries: "📩 Inquiries",
  offers: "💰 Offers",
  reservations: "📌 Reservations",
  site_visits: "🏠 Site Visits",
  sales: "🎉 Sales",
  messages: "💬 Messages",
  files: "📎 Files",
  admin_users: "👥 Users",
  admin_listings: "🌾 Listings",
  admin_reports: "🚩 Reports",
  admin_transactions: "💳 Transactions",
  admin_system: "⚙️ System",
};

const notificationCategoryOrder = [
  "land",
  "inquiries",
  "offers",
  "reservations",
  "site_visits",
  "sales",
  "messages",
  "files",
];

function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  const userRole = String(
    sessionStorage.getItem("role") || ""
  ).toLowerCase();

  // =====================================================
  // FETCH NOTIFICATIONS
  // =====================================================

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      const response = await api.get("/notifications/");

      setNotifications(response.data || []);
    } catch (error) {
      console.error("Notification Error:", error);

      alert(
        error.response?.data?.detail ||
          "Failed to load notifications"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // =====================================================
  // MARK SINGLE NOTIFICATION AS READ
  // =====================================================

  const markAsRead = async (notificationId) => {
    try {
      setProcessingId(notificationId);

      await api.put(
        `/notifications/${notificationId}/read`
      );

      setNotifications(
        (previousNotifications) =>
          previousNotifications.map(
            (notification) =>
              notification.id === notificationId
                ? {
                    ...notification,
                    is_read: true,
                  }
                : notification
          )
      );

      window.dispatchEvent(
        new Event("notificationsUpdated")
      );
    } catch (error) {
      console.error(
        "Mark Read Error:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to mark notification as read"
      );
    } finally {
      setProcessingId(null);
    }
  };

  // =====================================================
  // MARK ALL NOTIFICATIONS AS READ
  // =====================================================

  const markAllAsRead = async () => {
    const unreadNotifications =
      notifications.filter(
        (notification) =>
          !notification.is_read
      );

    if (unreadNotifications.length === 0) {
      return;
    }

    try {
      setMarkingAll(true);

      await api.put(
        "/notifications/read-all"
      );

      setNotifications(
        (previousNotifications) =>
          previousNotifications.map(
            (notification) => ({
              ...notification,
              is_read: true,
            })
          )
      );

      window.dispatchEvent(
        new Event("notificationsUpdated")
      );
    } catch (error) {
      console.error(
        "Mark All Read Error:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to mark all notifications as read"
      );
    } finally {
      setMarkingAll(false);
    }
  };

  // =====================================================
  // DELETE NOTIFICATION
  // =====================================================

  const deleteNotification = async (
    notificationId
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this notification?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(notificationId);

      await api.delete(
        `/notifications/${notificationId}`
      );

      setNotifications(
        (previousNotifications) =>
          previousNotifications.filter(
            (notification) =>
              notification.id !== notificationId
          )
      );

      window.dispatchEvent(
        new Event("notificationsUpdated")
      );
    } catch (error) {
      console.error(
        "Delete Notification Error:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to delete notification"
      );
    } finally {
      setProcessingId(null);
    }
  };

  // =====================================================
  // OPEN NOTIFICATION TARGET
  // =====================================================

  const openNotification = async (
    notification
  ) => {
    try {
      // -------------------------------------------------
      // Mark unread notification as read first
      // -------------------------------------------------

      if (!notification.is_read) {
        await markAsRead(notification.id);
      }

      // -------------------------------------------------
      // No navigation target
      // -------------------------------------------------

      if (
        !notification.target_type ||
        !notification.target_id
      ) {
        return;
      }

      // -------------------------------------------------
      // LAND
      // -------------------------------------------------

      const targetType = String(
        notification.target_type
      ).toLowerCase();

      if (targetType === "land") {
        navigate(
          `/lands/${notification.target_id}`
        );

        return;
      }

      // -------------------------------------------------
      // CONVERSATION
      // -------------------------------------------------

      if (
        targetType ===
        "conversation"
      ) {
        navigate(
          `/chat/${notification.target_id}`
        );

        return;
      }

      // -------------------------------------------------
      // MARKETPLACE ACTIVITY
      // -------------------------------------------------

      if (
        targetType === "inquiry" ||
        targetType === "offer" ||
        targetType === "site_visit" ||
        targetType === "reservation" ||
        targetType === "sale" ||
        targetType === "transaction"
      ) {
        navigate(
          "/marketplace-activity"
        );

        return;
      }

      // -------------------------------------------------
      // Unknown target
      // -------------------------------------------------

      console.warn(
        "Unknown notification target:",
        notification.target_type,
        notification.target_id
      );
    } catch (error) {
      console.error(
        "Notification Navigation Error:",
        error
      );
    }
  };

  // =====================================================
  // CHECK WHETHER NOTIFICATION IS NAVIGABLE
  // =====================================================

  const isNavigable = (notification) => {
    return (
      Boolean(notification.target_type) &&
      Boolean(notification.target_id)
    );
  };

  // =====================================================
  // COUNTS + CATEGORY FILTERING
  // =====================================================

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.is_read
    ).length;

  const getCategoryCount = (category) => {
    if (category === "all") return notifications.length;
    if (category === "unread") return unreadCount;

    return notifications.filter(
      (notification) =>
        getNotificationCategory(
          notification,
          userRole
        ) === category
    ).length;
  };

  const visibleCategoryKeys =
    userRole === "admin"
      ? [
          "admin_users",
          "admin_listings",
          "admin_reports",
          "admin_transactions",
          "messages",
          "files",
          "admin_system",
        ]
      : notificationCategoryOrder;

  const categoryKeys = [
    "all",
    "unread",
    ...visibleCategoryKeys.filter(
      (category) =>
        getCategoryCount(category) > 0
    ),
  ];

  const effectiveFilter =
    categoryKeys.includes(activeFilter)
      ? activeFilter
      : "all";

  const filteredNotifications =
    effectiveFilter === "all"
      ? notifications
      : effectiveFilter === "unread"
        ? notifications.filter(
            (notification) =>
              !notification.is_read
          )
        : notifications.filter(
            (notification) =>
              getNotificationCategory(
                notification,
                userRole
              ) === effectiveFilter
          );

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <>
        <Navbar />

        <div
          style={{
            minHeight: "70vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "24px",
            color: "#2E7D32",
            fontWeight: "bold",
          }}
        >
          Loading Notifications...
        </div>
      </>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <>
      <Navbar />

      <div
        style={{
          minHeight: "100vh",
          background: "#F5F7FA",
          padding: "30px 20px",
        }}
      >
        <div
          style={{
            maxWidth: "950px",
            margin: "0 auto",
          }}
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              padding: "25px",
              marginBottom: "25px",
              boxShadow:
                "0 6px 18px rgba(0,0,0,0.10)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "15px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "15px",
              }}
            >
              <FaBell
                size={35}
                color="#2E7D32"
              />

              <div>
                <h1
                  style={{
                    margin: 0,
                    color: "#2E7D32",
                  }}
                >
                  Notifications
                </h1>

                <p
                  style={{
                    margin: "5px 0 0",
                    color: "#666",
                  }}
                >
                  {unreadCount > 0
                    ? `${unreadCount} unread notification${
                        unreadCount > 1
                          ? "s"
                          : ""
                      }`
                    : "All notifications are read"}
                </p>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={fetchNotifications}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "10px 15px",
                  background: "#1976D2",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                <FaSync />
                Refresh
              </button>

              <button
                onClick={markAllAsRead}
                disabled={
                  markingAll ||
                  unreadCount === 0
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "10px 15px",
                  background:
                    unreadCount === 0
                      ? "#aaa"
                      : "#2E7D32",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor:
                    markingAll ||
                    unreadCount === 0
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: "bold",
                }}
              >
                <FaCheckDouble />

                {markingAll
                  ? "Marking..."
                  : "Mark All as Read"}
              </button>
            </div>
          </div>

          {/* =================================================
              NOTIFICATION CATEGORY FILTERS
          ================================================= */}

          <div
            style={{
              background: "#fff",
              borderRadius: "15px",
              padding: "14px",
              marginBottom: "20px",
              boxShadow:
                "0 4px 14px rgba(0,0,0,0.08)",
              overflowX: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "8px",
                minWidth: "max-content",
              }}
            >
              {categoryKeys.map((category) => {
                const count =
                  getCategoryCount(category);
                const selected =
                  activeFilter === category;

                return (
                  <button
                    key={category}
                    onClick={() =>
                      setActiveFilter(category)
                    }
                    style={{
                      border: selected
                        ? "2px solid #2E7D32"
                        : "1px solid #D6DADF",
                      background: selected
                        ? "#E8F5E9"
                        : "#F8F9FA",
                      color: selected
                        ? "#1B5E20"
                        : "#555",
                      borderRadius: "22px",
                      padding: "9px 13px",
                      cursor: "pointer",
                      fontWeight: selected
                        ? "bold"
                        : "600",
                      whiteSpace: "nowrap",
                      fontSize: "13px",
                    }}
                  >
                    {notificationCategoryLabels[
                      category
                    ] || category}
                    <span
                      style={{
                        marginLeft: "6px",
                        fontSize: "12px",
                        opacity: 0.8,
                      }}
                    >
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* =================================================
              FILTERED EMPTY STATE
          ================================================= */}

          {notifications.length > 0 &&
            filteredNotifications.length === 0 && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: "18px",
                  padding: "50px 30px",
                  textAlign: "center",
                  boxShadow:
                    "0 6px 18px rgba(0,0,0,0.10)",
                  marginBottom: "20px",
                }}
              >
                <FaBell
                  size={55}
                  color="#9E9E9E"
                />
                <h2
                  style={{
                    marginTop: "18px",
                    color: "#444",
                  }}
                >
                  No {String(
                    notificationCategoryLabels[
                      activeFilter
                    ] || activeFilter
                  ).replace(
                    /^[^A-Za-z]+/,
                    ""
                  )} Notifications
                </h2>
                <p style={{ color: "#777" }}>
                  There are no notifications in this
                  category right now.
                </p>
                <button
                  onClick={() => setActiveFilter("all")}
                  style={{
                    padding: "9px 15px",
                    background: "#2E7D32",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  View All
                </button>
              </div>
            )}

          {/* =================================================
              EMPTY STATE
          ================================================= */}

          {notifications.length === 0 ? (
            <div
              style={{
                background: "#fff",
                borderRadius: "18px",
                padding: "60px 30px",
                textAlign: "center",
                boxShadow:
                  "0 6px 18px rgba(0,0,0,0.10)",
              }}
            >
              <FaBell
                size={60}
                color="#9E9E9E"
              />

              <h2
                style={{
                  marginTop: "20px",
                  color: "#444",
                }}
              >
                No Notifications
              </h2>

              <p
                style={{
                  color: "#777",
                }}
              >
                You don't have any
                notifications yet.
              </p>
            </div>
          ) : filteredNotifications.length > 0 ? (
            /* =================================================
               NOTIFICATION LIST
            ================================================= */

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "15px",
              }}
            >
              {filteredNotifications.map(
                (notification) => {
                  const isUnread =
                    !notification.is_read;

                  const isProcessing =
                    processingId ===
                    notification.id;

                  const navigable =
                    isNavigable(
                      notification
                    );

                  return (
                    <div
                      key={notification.id}
                      style={{
                        background:
                          isUnread
                            ? "#FFFFFF"
                            : "#F4F5F6",

                        borderRadius: "15px",

                        border: isUnread
                          ? "2px solid #2E7D32"
                          : "1px solid #ddd",

                        boxShadow:
                          isUnread
                            ? "0 5px 15px rgba(46,125,50,0.12)"
                            : "0 3px 10px rgba(0,0,0,0.06)",

                        padding: "20px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: "20px",
                          flexWrap: "wrap",
                        }}
                      >
                        {/* =================================================
                            NOTIFICATION CONTENT
                        ================================================= */}

                        <div
                          onClick={() =>
                            navigable &&
                            openNotification(
                              notification
                            )
                          }
                          style={{
                            flex: 1,
                            minWidth: "250px",
                            cursor: navigable
                              ? "pointer"
                              : "default",
                            borderRadius: "10px",
                            padding: "5px",
                          }}
                          title={
                            navigable
                              ? "Click to open"
                              : undefined
                          }
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems:
                                "center",
                              gap: "10px",
                              flexWrap:
                                "wrap",
                            }}
                          >
                            <FaEnvelopeOpen
                              color={
                                isUnread
                                  ? "#2E7D32"
                                  : "#888"
                              }
                            />

                            <h3
                              style={{
                                margin: 0,
                                color:
                                  isUnread
                                    ? "#2E7D32"
                                    : "#555",
                                fontWeight:
                                  "bold",
                              }}
                            >
                              {
                                notification.title
                              }
                            </h3>

                            {isUnread && (
                              <span
                                style={{
                                  background:
                                    "#D32F2F",
                                  color:
                                    "#fff",
                                  fontSize:
                                    "11px",
                                  padding:
                                    "4px 8px",
                                  borderRadius:
                                    "20px",
                                  fontWeight:
                                    "bold",
                                }}
                              >
                                NEW
                              </span>
                            )}
                          </div>

                          <p
                            style={{
                              margin:
                                "12px 0",
                              color: "#333",
                              lineHeight:
                                "1.5",
                            }}
                          >
                            {
                              notification.message
                            }
                          </p>

                          <small
                            style={{
                              color: "#777",
                            }}
                          >
                            {notification.created_at
                              ? new Date(
                                  notification.created_at
                                ).toLocaleString()
                              : ""}
                          </small>

                          {navigable && (
                            <div
                              style={{
                                marginTop:
                                  "10px",
                                color:
                                  "#1976D2",
                                fontSize:
                                  "13px",
                                fontWeight:
                                  "bold",
                              }}
                            >
                              <FaExternalLinkAlt
                                style={{
                                  marginRight:
                                    "5px",
                                }}
                              />

                              Click to open
                            </div>
                          )}
                        </div>

                        {/* =================================================
                            ACTIONS
                        ================================================= */}

                        <div
                          style={{
                            display: "flex",
                            flexDirection:
                              "column",
                            gap: "8px",
                            minWidth:
                              "145px",
                          }}
                        >
                          {/* OPEN BUTTON */}

                          {navigable && (
                            <button
                              onClick={() =>
                                openNotification(
                                  notification
                                )
                              }
                              disabled={
                                isProcessing
                              }
                              style={{
                                padding:
                                  "9px 12px",
                                background:
                                  "#1976D2",
                                color:
                                  "#fff",
                                border:
                                  "none",
                                borderRadius:
                                  "7px",
                                cursor:
                                  isProcessing
                                    ? "not-allowed"
                                    : "pointer",
                                fontWeight:
                                  "bold",
                              }}
                            >
                              <FaExternalLinkAlt
                                style={{
                                  marginRight:
                                    "5px",
                                }}
                              />
                              Open
                            </button>
                          )}

                          {/* MARK AS READ */}

                          {isUnread && (
                            <button
                              onClick={() =>
                                markAsRead(
                                  notification.id
                                )
                              }
                              disabled={
                                isProcessing
                              }
                              style={{
                                padding:
                                  "9px 12px",
                                background:
                                  "#2E7D32",
                                color:
                                  "#fff",
                                border:
                                  "none",
                                borderRadius:
                                  "7px",
                                cursor:
                                  isProcessing
                                    ? "not-allowed"
                                    : "pointer",
                                fontWeight:
                                  "bold",
                              }}
                            >
                              {isProcessing
                                ? "Processing..."
                                : "✓ Mark as Read"}
                            </button>
                          )}

                          {/* DELETE */}

                          <button
                            onClick={() =>
                              deleteNotification(
                                notification.id
                              )
                            }
                            disabled={
                              isProcessing
                            }
                            style={{
                              padding:
                                "9px 12px",
                              background:
                                "#D32F2F",
                              color: "#fff",
                              border: "none",
                              borderRadius:
                                "7px",
                              cursor:
                                isProcessing
                                  ? "not-allowed"
                                  : "pointer",
                              fontWeight:
                                "bold",
                            }}
                          >
                            <FaTrash
                              style={{
                                marginRight:
                                  "5px",
                              }}
                            />

                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default Notifications;