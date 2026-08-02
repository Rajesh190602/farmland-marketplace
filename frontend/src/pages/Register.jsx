import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FaUser,
  FaPhone,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import api from "../services/api";

function Register() {
  const navigate = useNavigate();

  // ===============================
  // Form State
  // ===============================

  const [formData, setFormData] = useState({
    full_name: "",
    mobile: "",
    email: "",
    password: "",
  });

  // ===============================
  // OTP State
  // ===============================

  const [otp, setOtp] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

  const otpRefs = useRef([]);

  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  // ===============================
  // Loading State
  // ===============================

  const [loading, setLoading] = useState(false);

  // ===============================
  // Password Visibility
  // ===============================

  const [showPassword, setShowPassword] = useState(false);

  // ===============================
  // Countdown Timer
  // ===============================

  const [timer, setTimer] = useState(60);

  // ===============================
  // Handle Form Inputs
  // ===============================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
    // ===============================
  // Countdown Timer
  // ===============================

  useEffect(() => {
    let interval;

    if (otpSent && !otpVerified && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [otpSent, otpVerified, timer]);

  // ===============================
  // OTP Input Change
  // ===============================

  const handleOTPChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const updatedOTP = [...otp];
    updatedOTP[index] = value;

    setOtp(updatedOTP);

    if (value !== "" && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // ===============================
  // Backspace Support
  // ===============================

  const handleOTPKeyDown = (e, index) => {
    if (
      e.key === "Backspace" &&
      otp[index] === "" &&
      index > 0
    ) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // ===============================
  // Paste Complete OTP
  // ===============================

  const handlePaste = (e) => {
    e.preventDefault();

    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (pastedData.length === 6) {
      const digits = pastedData.split("");
      setOtp(digits);

      otpRefs.current[5]?.focus();
    }
  };

  // ===============================
  // Send OTP
  // ===============================

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
      setOtpVerified(false);

      setOtp(["", "", "", "", "", ""]);

      setTimer(60);

    } catch (error) {
      alert(error.response?.data?.detail || "Unable to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // Verify OTP
  // ===============================

  const verifyOTP = async () => {
    if (otp.join("").length !== 6) {
      alert("Please enter all 6 digits.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/users/verify-otp", {
        email: formData.email,
        otp: otp.join(""),
      });

      alert(response.data.message);

      setOtpVerified(true);

    } catch (error) {
      alert(error.response?.data?.detail || "OTP Verification Failed");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // Register User
  // ===============================

  const register = async (e) => {
    e.preventDefault();

    if (!otpVerified) {
      alert("Please verify your email first.");
      return;
    }

    if (formData.mobile.length !== 10) {
      alert("Please enter a valid mobile number.");
      return;
    }

    if (formData.password.length < 8) {
      alert("Password must contain at least 8 characters.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/users/register", formData);

      alert("Registration Successful!");

      navigate("/");

    } catch (error) {
      alert(error.response?.data?.detail || "Registration Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
        <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background:
          "linear-gradient(135deg, #E8F5E9 0%, #F1F8E9 100%)",
        padding: "20px",
      }}
    >
      <div style={cardStyle}>

        {/* Heading */}

        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1
            style={{
              color: "#2E7D32",
              marginBottom: "8px",
            }}
          >
            🌾 Farmland Marketplace
          </h1>

          <p
            style={{
              color: "#666",
              fontSize: "16px",
            }}
          >
            Create your Farmer Account
          </p>
        </div>

        <form onSubmit={register}>

          {/* ===========================
              Full Name
          ============================ */}

          <div style={inputWrapper}>

            <FaUser style={iconStyle} />

            <input
              type="text"
              name="full_name"
              placeholder="Full Name"
              value={formData.full_name}
              onChange={handleChange}
              required
              style={modernInput}
            />

          </div>

          {/* ===========================
              Mobile Number
          ============================ */}

          <div style={inputWrapper}>

            <FaPhone style={iconStyle} />

            <input
              type="tel"
              name="mobile"
              placeholder="10-digit Mobile Number"
              value={formData.mobile}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");

                if (value.length <= 10) {
                  setFormData((prev) => ({
                    ...prev,
                    mobile: value,
                  }));
                }
              }}
              required
              style={modernInput}
            />

          </div>

          {/* ===========================
              Email
          ============================ */}

          <div style={inputWrapper}>

            <FaEnvelope style={iconStyle} />

            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              disabled={otpSent}
              required
              style={{
                ...modernInput,
                backgroundColor: otpSent
                  ? "#F5F5F5"
                  : "#FFFFFF",
              }}
            />

          </div>
                    {/* ===========================
              Send OTP Button
          ============================ */}

          <button
            type="button"
            onClick={sendOTP}
            disabled={loading}
            style={blueButton}
          >
            {loading
              ? "Sending OTP..."
              : otpSent
              ? "Resend OTP"
              : "Send OTP"}
          </button>

          {/* ===========================
              Countdown Timer
          ============================ */}

          {otpSent && !otpVerified && (
            <div
              style={{
                textAlign: "center",
                marginBottom: "18px",
                color: "#555",
                fontSize: "16px",
              }}
            >
              <p style={{ marginBottom: "8px" }}>
                OTP sent to
              </p>

              <strong style={{ color: "#2E7D32" }}>
                {formData.email}
              </strong>

              <div
                style={{
                  marginTop: "12px",
                  fontWeight: "bold",
                  color: "#FB8C00",
                  fontSize: "18px",
                }}
              >
                {timer > 0 ? (
                  <>
                    Resend in{" "}
                    {String(Math.floor(timer / 60)).padStart(2, "0")}
                    :
                    {String(timer % 60).padStart(2, "0")}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={sendOTP}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#1976D2",
                      cursor: "pointer",
                      fontWeight: "bold",
                      fontSize: "16px",
                    }}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ===========================
              OTP Verification Section
          ============================ */}

          {otpSent && !otpVerified && (
            <>
              <label
                style={{
                  display: "block",
                  marginBottom: "10px",
                  fontWeight: "bold",
                  color: "#2E7D32",
                  textAlign: "center",
                }}
              >
                Enter 6-digit OTP
              </label>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginBottom: "25px",
                }}
              >
                              {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) =>
                      handleOTPChange(e.target.value, index)
                    }
                    onKeyDown={(e) =>
                      handleOTPKeyDown(e, index)
                    }
                    onPaste={handlePaste}
                    style={otpBox}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={verifyOTP}
                disabled={loading}
                style={orangeButton}
              >
                {loading
                  ? "Verifying..."
                  : "Verify OTP"}
              </button>
            </>
          )}

          {/* ===========================
              Email Verified
          ============================ */}

          {otpVerified && (
            <div style={successBox}>

              <div
                style={{
                  fontSize: "50px",
                  marginBottom: "10px",
                }}
              >
                ✅
              </div>

              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                }}
              >
                Email Verified Successfully
              </div>

              <div
                style={{
                  marginTop: "8px",
                  color: "#2E7D32",
                }}
              >
                You can now create your account.
              </div>

            </div>
          )}
                    {/* ===========================
              Password
          ============================ */}

          <div style={inputWrapper}>

            <FaLock style={iconStyle} />

            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password (Minimum 8 characters)"
              value={formData.password}
              onChange={handleChange}
              required
              style={modernInput}
            />

            <span
              style={eyeStyle}
              onClick={() =>
                setShowPassword(!showPassword)
              }
            >
              {showPassword ? (
                <FaEyeSlash />
              ) : (
                <FaEye />
              )}
            </span>

          </div>

          {/* ===========================
              Register Button
          ============================ */}

          <button
            type="submit"
            disabled={!otpVerified || loading}
            style={{
              ...greenButton,
              opacity:
                otpVerified && !loading ? 1 : 0.6,
              cursor:
                otpVerified && !loading
                  ? "pointer"
                  : "not-allowed",
            }}
          >
            {loading
              ? "Creating Account..."
              : "Create Account"}
          </button>

        </form>

        {/* ===========================
            Login Link
        ============================ */}

        <div
          style={{
            textAlign: "center",
            marginTop: "25px",
            color: "#555",
          }}
        >
          Already have an account?

          <Link
            to="/"
            style={{
              marginLeft: "6px",
              color: "#2E7D32",
              fontWeight: "bold",
              textDecoration: "none",
            }}
          >
            Login
          </Link>
        </div>

      </div>
    </div>
  );
}
  // =====================================
// Styles
// =====================================

const cardStyle = {
  width: "100%",
  maxWidth: "520px",
  background: "#ffffff",
  borderRadius: "18px",
  padding: "35px",
   padding: window.innerWidth < 480 ? "20px" : "35px",
  boxShadow: "0 15px 40px rgba(0,0,0,0.15)",
};

const inputWrapper = {
  display: "flex",
  alignItems: "center",
  minWidth: 0,
  background: "#fff",
  border: "1px solid #dcdcdc",
  borderRadius: "10px",
  padding: "0 15px",
  marginBottom: "18px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};

const modernInput = {
  flex: 1,
  padding: "15px 12px",
  border: "none",
  outline: "none",
  fontSize: "16px",
  background: "transparent",
};

const iconStyle = {
  color: "#2E7D32",
  fontSize: "18px",
};

const eyeStyle = {
  cursor: "pointer",
  color: "#666",
  fontSize: "18px",
};

const otpBox = {
  width: "44px",
  height: "500px",
  borderRadius: "10px",
  border: "2px solid #ddd",
  outline: "none",
  textAlign: "center",
  fontSize: "20px",
  fontWeight: "bold",
  transition: "0.3s",
  background: "#fff",
};

const successBox = {
  background: "#E8F5E9",
  border: "1px solid #A5D6A7",
  color: "#2E7D32",
  borderRadius: "12px",
  padding: "20px",
  marginBottom: "20px",
  textAlign: "center",
};

const blueButton = {
  width: "100%",
  padding: "14px",
  background: "#1976D2",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  marginBottom: "20px",
};

const orangeButton = {
  width: "100%",
  padding: "14px",
  background: "#FB8C00",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  marginBottom: "20px",
};

const greenButton = {
  width: "100%",
  padding: "15px",
  background: "#2E7D32",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  fontSize: "17px",
  fontWeight: "bold",
  transition: "0.3s",
  boxShadow: "0 5px 15px rgba(46,125,50,0.3)",
};
export default Register;


