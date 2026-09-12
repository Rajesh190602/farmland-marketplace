import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  // ==========================
  // Send / Resend OTP
  // ==========================
  const sendOTP = async () => {
    if (!email.trim()) {
      alert("Please enter your email.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/users/forgot-password", {
        email: email.trim(),
      });

      alert(response.data.message);

      setOtpSent(true);
      setOtpVerified(false);
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      alert(error.response?.data?.detail || "Unable to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // Verify OTP
  // ==========================
  const verifyOTP = async () => {
    if (otp.length !== 6) {
      alert("Please enter the 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/users/verify-forgot-otp", {
        email: email.trim(),
        otp,
      });

      alert(response.data.message);

      // Successful verification reveals the password reset section.
      setOtpVerified(true);
    } catch (error) {
      alert(
        error.response?.data?.detail || "OTP Verification Failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // Reset Password
  // ==========================
  const resetPassword = async (e) => {
    e.preventDefault();

    if (!otpVerified) {
      alert("Please verify OTP first.");
      return;
    }

    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/users/reset-password", {
        email: email.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      alert(response.data.message);
      navigate("/");
    } catch (error) {
      alert(
        error.response?.data?.detail || "Password reset failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "450px",
        margin: "40px auto",
        padding: "25px",
        background: "#fff",
        borderRadius: "10px",
        boxShadow: "0 0 10px rgba(0,0,0,0.15)",
      }}
    >
      <h2
        style={{
          textAlign: "center",
          color: "#2E7D32",
          marginBottom: "20px",
        }}
      >
        🔑 Forgot Password
      </h2>

      <form onSubmit={resetPassword}>
        {/* ==========================
            Email
        =========================== */}
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          disabled={otpSent}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "12px",
            boxSizing: "border-box",
            backgroundColor: otpSent ? "#f5f5f5" : "#fff",
          }}
        />

        {/* ==========================
            Send / Resend OTP
        =========================== */}
        {!otpVerified && (
          <button
            type="button"
            onClick={sendOTP}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: "#1976D2",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: loading ? "not-allowed" : "pointer",
              marginBottom: "15px",
            }}
          >
            {loading
              ? "Sending..."
              : otpSent
              ? "Resend OTP"
              : "Send OTP"}
          </button>
        )}

        {/* ==========================
            OTP Verification Section
        =========================== */}
        {otpSent && !otpVerified && (
          <>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter 6-digit OTP"
              value={otp}
              maxLength={6}
              onChange={(e) =>
                setOtp(
                  e.target.value.replace(/\D/g, "").slice(0, 6)
                )
              }
              required
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "12px",
                boxSizing: "border-box",
              }}
            />

            <button
              type="button"
              onClick={verifyOTP}
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "#FB8C00",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                cursor: loading ? "not-allowed" : "pointer",
                marginBottom: "20px",
              }}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </>
        )}

        {/* ==========================
            Password Reset Section
        =========================== */}
        {otpSent && otpVerified && (
          <>
            <div
              style={{
                padding: "12px",
                marginBottom: "15px",
                backgroundColor: "#E8F5E9",
                color: "#2E7D32",
                borderRadius: "5px",
                textAlign: "center",
                fontWeight: "bold",
              }}
            >
              ✅ OTP Verified Successfully
            </div>

            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "12px",
                boxSizing: "border-box",
              }}
            />

            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              required
              minLength={8}
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "20px",
                boxSizing: "border-box",
              }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "#2E7D32",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Updating..." : "Reset Password"}
            </button>
          </>
        )}
      </form>

      <p
        style={{
          marginTop: "20px",
          textAlign: "center",
        }}
      >
        Remember your password? <Link to="/">Login</Link>
      </p>
    </div>
  );
}

export default ForgotPassword;
