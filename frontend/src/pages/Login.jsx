import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState(
    () => localStorage.getItem("email") || ""
  );

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] =
    useState(false);
  const [rememberMe, setRememberMe] =
    useState(() => !!localStorage.getItem("email"));
  const [loading, setLoading] = useState(false);

  const login = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      alert("Please enter your email.");
      return;
    }

    if (!password.trim()) {
      alert("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      const formData = new URLSearchParams();

      formData.append("username", email);
      formData.append("password", password);

      const response = await api.post(
        "/users/login",
        formData,
        {
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
        }
      );

      console.log("Login response:", response.data);

      // =====================================================
      // Store normal marketplace authentication
      // =====================================================

      sessionStorage.setItem(
        "token",
        response.data.access_token
      );

      sessionStorage.setItem(
        "user_id",
        response.data.user_id
      );

      sessionStorage.setItem(
        "full_name",
        response.data.full_name
      );

      sessionStorage.setItem(
        "role",
        response.data.role
      );

      // A successful normal login is no longer a KYC-only session.
      sessionStorage.removeItem("kyc_required");
      sessionStorage.removeItem("account_status");
      sessionStorage.removeItem("user_role");

      // =====================================================
      // STEP 75 - Load admin permission
      // The backend remains the source of truth.
      // We store the permission in sessionStorage only so the
      // frontend can control admin navigation and route UX.
      // =====================================================

      if (response.data.role === "admin") {
        try {
          const meResponse = await api.get("/users/me", {
            headers: {
              Authorization: `Bearer ${response.data.access_token}`,
            },
          });

          sessionStorage.setItem(
            "admin_permission_role",
            meResponse.data.admin_permission_role || "NONE"
          );

          console.log(
            "Admin permission:",
            meResponse.data.admin_permission_role
          );
        } catch (permissionError) {
          console.error(
            "Failed to load admin permission:",
            permissionError
          );

          // Fail closed on the frontend.
          sessionStorage.setItem(
            "admin_permission_role",
            "NONE"
          );
        }
      } else {
        // Normal farmer/buyer accounts must not retain
        // an old admin permission from a previous session.
        sessionStorage.removeItem(
          "admin_permission_role"
        );
      }

      // =====================================================
      // Remember Me
      // Only email is stored permanently.
      // Authentication is NOT stored in localStorage.
      // =====================================================

      if (rememberMe) {
        localStorage.setItem("email", email);
      } else {
        localStorage.removeItem("email");
      }

      alert("Login Successful");

      if (response.data.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/home");
      }
    } catch (error) {
      console.error("Login error:", error);

      const detail = error.response?.data?.detail;

      // =====================================================
      // Buyer KYC gate
      // The password was correct, but the buyer's account is
      // still pending admin KYC approval. Keep a restricted
      // KYC-only token and send the buyer directly to KYC.
      // =====================================================

      if (
        error.response?.status === 403 &&
        detail?.code === "KYC_REQUIRED" &&
        detail?.kyc_token
      ) {
        sessionStorage.setItem(
          "token",
          detail.kyc_token
        );

        sessionStorage.setItem(
          "user_id",
          String(detail.user_id || "")
        );

        sessionStorage.setItem(
          "full_name",
          detail.full_name || ""
        );

        sessionStorage.setItem(
          "role",
          "buyer"
        );

        sessionStorage.setItem(
          "user_role",
          "buyer"
        );

        sessionStorage.setItem(
          "account_status",
          "pending_kyc"
        );

        sessionStorage.setItem(
          "kyc_required",
          "true"
        );

        // Never persist the restricted KYC token.
        localStorage.removeItem("token");
        localStorage.removeItem("user_id");
        localStorage.removeItem("role");
        localStorage.removeItem("user_role");
        localStorage.removeItem("user");

        // Prevent any stale admin permission from remaining.
        sessionStorage.removeItem(
          "admin_permission_role"
        );

        alert(
          "Login successful. KYC verification is required before you can view farmland listings."
        );

        navigate("/kyc", { replace: true });
        return;
      }

      if (error.response) {
        alert(
          typeof detail === "string"
            ? detail
            : detail?.message ||
              "Invalid email or password."
        );
      } else {
        alert("Unable to connect to server.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>🌾 Farmland Marketplace</h2>

        <p>Login to your account</p>

        <form onSubmit={login}>
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
          />

          <div className="password-box">
            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />

            <button
              type="button"
              className="eye-btn"
              onClick={() =>
                setShowPassword(
                  !showPassword
                )
              }
            >
              {showPassword
                ? "🙈"
                : "👁"}
            </button>
          </div>

          <div className="remember-row">
            <label>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() =>
                  setRememberMe(
                    !rememberMe
                  )
                }
              />

              Remember Me
            </label>

            <Link to="/forgot-password">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>
        </form>

        <p className="register-link">
          Don't have an account?
          <Link to="/register">
            {" "}
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
