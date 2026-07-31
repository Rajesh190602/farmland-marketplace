    import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: "",
    mobile: "",
    email: "",
    password: "",
  });

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  // =========================
  // Handle Input Change
  // =========================
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =========================
  // Send OTP
  // =========================
  const sendOTP = async () => {
    if (!formData.email.trim()) {
      alert("Please enter your email.");
      return;
    }

    try {
      setOtp("");
      setOtpSent(false);
      setOtpVerified(false);

      setLoading(true);

      const response = await api.post("/users/send-otp", {
        email: formData.email,
      });

      alert(response.data.message);
      setOtpSent(true);
    } catch (error) {
      if (error.response) {
        alert(error.response.data.detail);
      } else {
        alert("Unable to send OTP");
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // Verify OTP
  // =========================
  const verifyOTP = async () => {
    if (!otp.trim()) {
      alert("Please enter OTP.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/users/verify-otp", {
        email: formData.email,
        otp,
      });

      alert(response.data.message);
      setOtpVerified(true);
    } catch (error) {
      if (error.response) {
        alert(error.response.data.detail);
      } else {
        alert("OTP Verification Failed");
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // Register
  // =========================
  const register = async (e) => {
    e.preventDefault();

    if (!otpVerified) {
      alert("Please verify your email first.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/users/register", formData);

      alert("Registration Successful! Please login.");

      navigate("/");
    } catch (error) {
      if (error.response) {
        alert(error.response.data.detail);
      } else {
        alert("Registration Failed");
      }
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
          marginBottom: "20px",
          color: "#2E7D32",
        }}
      >
        🌾 Farmer Registration
      </h2>

      <form onSubmit={register}>
        {/* Full Name */}
        <input
          type="text"
          name="full_name"
          placeholder="Full Name"
          value={formData.full_name}
          onChange={handleChange}
          required
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "12px",
            boxSizing: "border-box",
          }}
        />

        {/* Mobile */}
        <input
          type="text"
          name="mobile"
          placeholder="Mobile Number"
          value={formData.mobile}
          onChange={handleChange}
          required
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "12px",
            boxSizing: "border-box",
          }}
        />

        {/* Email */}
        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={handleChange}
          required
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "12px",
            boxSizing: "border-box",
          }}
        />

        {/* Send OTP */}
        <button
          type="button"
          onClick={sendOTP}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#1976D2",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            marginBottom: "12px",
          }}
        >
          {loading
            ? "Sending..."
            : otpSent
            ? "Resend OTP"
            : "Send OTP"}
        </button>

        {/* OTP */}
        {otpSent && !otpVerified && (
          <>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
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
                backgroundColor: "#FF9800",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                marginBottom: "12px",
              }}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </>
        )}

        {/* OTP Success */}
        {otpVerified && (
          <div
            style={{
              background: "#E8F5E9",
              color: "#2E7D32",
              padding: "12px",
              borderRadius: "6px",
              marginBottom: "15px",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            ✅ Email Verified Successfully
          </div>
        )}

        {/* Password */}
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "20px",
            boxSizing: "border-box",
          }}
        />

        {/* Register */}
        <button
          type="submit"
          disabled={!otpVerified || loading}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor:
              otpVerified && !loading ? "#2E7D32" : "#9E9E9E",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor:
              otpVerified && !loading ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>

      <p
        style={{
          marginTop: "20px",
          textAlign: "center",
        }}
      >
        Already have an account? <Link to="/">Login</Link>
      </p>
    </div>
  );
}

export default Register;


    