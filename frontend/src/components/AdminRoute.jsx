import { Navigate } from "react-router-dom";

function AdminRoute({ children }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (!user) {
    return <Navigate to="/home" replace />;
  }

  if (user.role !== "admin") {
    alert("Access Denied. Admin only.");
    return <Navigate to="/home" replace />;
  }

  return children;
}

export default AdminRoute;