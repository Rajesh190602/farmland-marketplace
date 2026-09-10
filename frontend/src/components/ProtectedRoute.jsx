import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children }) {
  const location = useLocation();

  const token = sessionStorage.getItem("token");
  const kycRequired =
    sessionStorage.getItem("kyc_required") === "true";

  // No authentication at all.
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // A buyer's temporary KYC token is allowed to access ONLY /kyc.
  // It must never be treated as a normal marketplace login.
  if (kycRequired && location.pathname !== "/kyc") {
    return <Navigate to="/kyc" replace />;
  }

  return children;
}

export default ProtectedRoute;
