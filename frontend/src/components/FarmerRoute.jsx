import { Navigate } from "react-router-dom";

function FarmerRoute({ children }) {
  const token = sessionStorage.getItem("token");
  const role = sessionStorage.getItem("role");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (role !== "farmer") {
    return <Navigate to="/home" replace />;
  }

  return children;
}

export default FarmerRoute;