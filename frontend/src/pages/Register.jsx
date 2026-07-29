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

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const sendOTP = async () => {
    if (!formData.email.trim()) {
      alert("Please enter your email.");
      return;
    }

    try {
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

  const verifyOTP = async () => {
    if (!otp.trim()) {
      alert("Please enter OTP");
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

  const register = async (e) => {
    e.preventDefault();

    if (!otpVerified) {
      alert("Please verify your email first.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/users/register", formData);

      alert("Registration Successful!");
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
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
        🌾 Farmer Registration
      </h2>

      <form onSubmit={register}>
        <input
          type="text"
          name="full_name"
          placeholder="Full Name"
          value={formData.full_name}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "12px",
            boxSizing: "border-box",
          }}
          required
        />

        <input
          type="text"
          name="mobile"
          placeholder="Mobile Number"
          value={formData.mobile}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "12px",
            boxSizing: "border-box",
          }}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "12px",
            boxSizing: "border-box",
          }}
          required
        />
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
          {loading ? "Sending..." : "Send OTP"}
        </button>

        {otpSent && (
          <>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
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
              Verify OTP
            </button>
          </>
        )}

        {otpVerified && (
          <p
            style={{
              color: "green",
              textAlign: "center",
              marginBottom: "12px",
              fontWeight: "bold",
            }}
          >
            ✅ Email Verified Successfully
          </p>
        )}

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "20px",
            boxSizing: "border-box",
          }}
          required
        />

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
          Register
        </button>
      </form>

      <p style={{ marginTop: "20px", textAlign: "center" }}>
        Already have an account?{" "}
        <Link to="/">Login</Link>
      </p>
    </div>
  );
}

export default Register;