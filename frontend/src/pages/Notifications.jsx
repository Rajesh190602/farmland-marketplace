import { useEffect, useState } from "react";
import axios from "axios";

const API = "https://farmland-backend-ncnk.onrender.com";

function Notifications() {
  const [notifications, setNotifications] = useState([]);

  const token = localStorage.getItem("token");

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API}/notifications/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNotifications(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load notifications");
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

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