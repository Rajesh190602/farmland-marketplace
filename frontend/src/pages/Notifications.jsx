import { useEffect, useState } from "react";
import api from "../services/api";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const response = await api.get("/notifications/");
      setNotifications(response.data);
    } catch (error) {
      console.error("Notification Error:", error);

      if (error.response) {
        alert(error.response.data.detail);
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

  if (loading) {
    return (
      <div className="container mt-4">
        <h2>🔔 Notifications</h2>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2>🔔 Notifications</h2>

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
          >
            <div className="card-body">
              <h5>{notification.title}</h5>

              <p>{notification.message}</p>

              <small className="text-muted">
                {new Date(notification.created_at).toLocaleString()}
              </small>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default Notifications;