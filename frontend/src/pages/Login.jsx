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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(
    () => !!localStorage.getItem("email")
  );
  const [loading, setLoading] = useState(false);

  // =====================================================
  // STEP 77D-5 - MFA LOGIN STATE
  // These values intentionally remain only in React state.
  // The MFA challenge token is NOT stored in localStorage
  // or sessionStorage.
  // =====================================================

  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaChallengeToken, setMfaChallengeToken] = useState("");
  const [mfaUser, setMfaUser] = useState(null);

  // =====================================================
  // Complete authentication after normal login OR MFA
  // =====================================================

  const completeLogin = async (loginData) => {
    // =====================================================
    // Store normal marketplace authentication
    // =====================================================

    sessionStorage.setItem(
      "token",
      loginData.access_token
    );

    sessionStorage.setItem(
      "user_id",
      loginData.user_id
    );

    sessionStorage.setItem(
      "full_name",
      loginData.full_name
    );

    sessionStorage.setItem(
      "role",
      loginData.role
    );

    // A successful normal login is no longer a KYC-only session.
    sessionStorage.removeItem("kyc_required");
    sessionStorage.removeItem("account_status");
    sessionStorage.removeItem("user_role");

    // =====================================================
    // STEP 75 - Load admin permission
    // Backend remains the source of truth.
    // =====================================================

    if (loginData.role === "admin") {
      try {
        const meResponse = await api.get("/users/me", {
          headers: {
            Authorization: `Bearer ${loginData.access_token}`,
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

    if (loginData.role === "admin") {
      navigate("/admin");
    } else {
      navigate("/home");
    }
  };

  // =====================================================
  // STEP 77D-5 - Verify MFA Login
  // =====================================================

  const verifyMFA = async (e) => {
    e.preventDefault();

    const cleanCode = mfaCode.trim();

    if (!/^\d{6}$/.test(cleanCode)) {
      alert("Please enter the 6-digit authenticator code.");
      return;
    }

    if (!mfaChallengeToken) {
      alert(
        "Your MFA login session is missing or expired. Please log in again."
      );

      setMfaRequired(false);
      setMfaCode("");
      setMfaChallengeToken("");
      setMfaUser(null);

      return;
    }

    try {
      setLoading(true);

      const response = await api.post(
        "/users/admin/mfa/verify-login",
        {
          challenge_token: mfaChallengeToken,
          code: cleanCode,
        }
      );

      console.log(
        "MFA verification response:",
        response.data
      );

      // =====================================================
      // MFA verification succeeded.
      // Backend now gives us the real access token.
      // =====================================================

      if (!response.data?.access_token) {
        throw new Error(
          "MFA verification succeeded but no access token was returned."
        );
      }

      // Clear temporary MFA state.
      setMfaRequired(false);
      setMfaCode("");
      setMfaChallengeToken("");
      setMfaUser(null);

      // Continue through the same authentication flow
      // used by normal login.
      await completeLogin(response.data);
    } catch (error) {
      console.error("MFA verification error:", error);

      const detail = error.response?.data?.detail;

      if (error.response?.status === 401) {
        alert(
          typeof detail === "string"
            ? detail
            : detail?.message ||
              "Invalid or expired MFA code. Please try again."
        );
      } else if (error.response) {
        alert(
          typeof detail === "string"
            ? detail
            : detail?.message ||
              "Unable to verify MFA code."
        );
      } else {
        alert("Unable to connect to server.");
      }
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // Normal Login
  // =====================================================

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

      console.log(
        "Login response:",
        response.data
      );

      // =====================================================
      // STEP 77D-5
      // MFA-enabled administrator
      //
      // IMPORTANT:
      // Do NOT store a token here because the backend has
      // deliberately not issued the real access token yet.
      // =====================================================

      if (response.data?.mfa_required) {
        setMfaRequired(true);

        setMfaChallengeToken(
          response.data.challenge_token || ""
        );

        setMfaUser({
          user_id: response.data.user_id,
          full_name: response.data.full_name,
          role: response.data.role,
          expires_in: response.data.expires_in,
        });

        setMfaCode("");

        return;
      }

      // =====================================================
      // Normal login
      // =====================================================

      if (!response.data?.access_token) {
        throw new Error(
          "Login succeeded but no access token was returned."
        );
      }

      await completeLogin(response.data);
    } catch (error) {
      console.error("Login error:", error);

      const detail = error.response?.data?.detail;

      // =====================================================
      // Buyer KYC gate
      // The password was correct, but the buyer's account is
      // still pending admin KYC approval.
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

        // Prevent stale admin permission.
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

  // =====================================================
  // MFA SCREEN
  // =====================================================

  if (mfaRequired) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h2>🔐 Admin Verification</h2>

          <p>
            Enter the 6-digit code from your
            authenticator app.
          </p>

          {mfaUser?.full_name && (
            <p>
              Welcome, <strong>{mfaUser.full_name}</strong>
            </p>
          )}

          <form onSubmit={verifyMFA}>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit MFA code"
              value={mfaCode}
              maxLength={6}
              onChange={(e) => {
                const value =
                  e.target.value.replace(/\D/g, "");

                setMfaCode(value);
              }}
              required
              autoFocus
            />

            <button
              type="submit"
              className="login-btn"
              disabled={
                loading ||
                mfaCode.length !== 6
              }
            >
              {loading
                ? "Verifying..."
                : "Verify & Continue"}
            </button>
          </form>

          <p
            style={{
              marginTop: "15px",
              fontSize: "14px",
              color: "#666",
              textAlign: "center",
            }}
          >
            Open your authenticator app and enter
            the current 6-digit code.
          </p>

          {mfaUser?.expires_in && (
            <p
              style={{
                fontSize: "13px",
                color: "#888",
                textAlign: "center",
              }}
            >
              This verification session expires in{" "}
              {Math.floor(
                mfaUser.expires_in / 60
              )}{" "}
              minutes.
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              setMfaRequired(false);
              setMfaCode("");
              setMfaChallengeToken("");
              setMfaUser(null);
            }}
            disabled={loading}
            style={{
              width: "100%",
              marginTop: "10px",
              padding: "10px",
              border: "none",
              background: "transparent",
              cursor: loading
                ? "not-allowed"
                : "pointer",
              color: "#2E7D32",
              fontWeight: "600",
            }}
          >
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  // =====================================================
  // NORMAL LOGIN SCREEN
  // =====================================================

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