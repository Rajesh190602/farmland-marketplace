import { useEffect, useState } from "react";
import api from "../services/api";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      const response = await api.get("/notifications/");
      setNotifications(response.data);
    } catch (error) {
      console.error("Notification Error:", error);

      if (error.response) {
        alert(error.response.data.detail || "Failed to load notifications");
      } else {
        alert("Failed to load notifications");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // ==========================
  // Mark Notification As Read
  // ==========================

  const markAsRead = async (notificationId) => {
    try {
      setProcessingId(notificationId);

      await api.put(`/notifications/${notificationId}/read`);

      // Update UI immediately
      setNotifications((previousNotifications) =>
        previousNotifications.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );

      // Tell Navbar to refresh unread count
      window.dispatchEvent(new Event("notificationsUpdated"));
    } catch (error) {
      console.error("Mark Read Error:", error);

      if (error.response) {
        alert(
          error.response.data.detail ||
            "Failed to mark notification as read"
        );
      } else {
        alert("Failed to mark notification as read");
      }
    } finally {
      setProcessingId(null);
    }
  };

  // ==========================
  // Delete Notification
  // ==========================

  const deleteNotification = async (notificationId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this notification?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(notificationId);

      await api.delete(`/notifications/${notificationId}`);

      // Remove from UI immediately
      setNotifications((previousNotifications) =>
        previousNotifications.filter(
          (notification) => notification.id !== notificationId
        )
      );

      // Tell Navbar to refresh unread count
      window.dispatchEvent(new Event("notificationsUpdated"));
    } catch (error) {
      console.error("Delete Notification Error:", error);

      if (error.response) {
        alert(
          error.response.data.detail ||
            "Failed to delete notification"
        );
      } else {
        alert("Failed to delete notification");
      }
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <h2>🔔 Notifications</h2>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div
      className="container mt-4"
      style={{
        maxWidth: "900px",
        paddingBottom: "40px",
      }}
    >
      <h2
        style={{
          color: "#2E7D32",
          marginBottom: "25px",
          fontWeight: "bold",
        }}
      >
        🔔 Notifications
      </h2>

      {notifications.length === 0 ? (
        <div className="alert alert-info">
          No notifications available.
        </div>
      ) : (
        notifications.map((notification) => (
          <div
            key={notification.id}
            className={`card mb-3 ${
              notification.is_read
                ? "border-secondary"
                : "border-primary"
            }`}
            style={{
              backgroundColor: notification.is_read
                ? "#f8f9fa"
                : "#ffffff",
              boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
            }}
          >
            <div className="card-body">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "15px",
                }}
              >
                <div style={{ flex: 1 }}>
                  <h5
                    style={{
                      fontWeight: "bold",
                      color: notification.is_read
                        ? "#555"
                        : "#2E7D32",
                    }}
                  >
                    {notification.title}
                  </h5>

                  <p
                    style={{
                      marginBottom: "10px",
                      color: "#333",
                    }}
                  >
                    {notification.message}
                  </p>

                  <small className="text-muted">
                    {notification.created_at
                      ? new Date(
                          notification.created_at
                        ).toLocaleString()
                      : ""}
                  </small>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    minWidth: "130px",
                  }}
                >
                  {!notification.is_read && (
                    <button
                      onClick={() =>
                        markAsRead(notification.id)
                      }
                      disabled={
                        processingId === notification.id
                      }
                      style={{
                        padding: "8px 10px",
                        background: "#2E7D32",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        cursor:
                          processingId === notification.id
                            ? "not-allowed"
                            : "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      {processingId === notification.id
                        ? "Processing..."
                        : "✓ Mark as Read"}
                    </button>
                  )}

                  <button
                    onClick={() =>
                      deleteNotification(notification.id)
                    }
                    disabled={
                      processingId === notification.id
                    }
                    style={{
                      padding: "8px 10px",
                      background: "#D32F2F",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor:
                        processingId === notification.id
                          ? "not-allowed"
                          : "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default Notifications;