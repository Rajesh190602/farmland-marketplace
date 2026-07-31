import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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

      localStorage.setItem(
        "token",
        response.data.access_token
      );

      if (rememberMe) {
        localStorage.setItem("email", email);
      } else {
        localStorage.removeItem("email");
      }

      alert("Login Successful");

      navigate("/home");
    } catch (error) {
      if (error.response) {
        alert(
          error.response.data.detail ||
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
    <div
      style={{
        maxWidth: "430px",
        margin: "50px auto",
        padding: "30px",
        background: "#fff",
        borderRadius: "10px",
        boxShadow: "0 0 10px rgba(0,0,0,0.15)",
      }}
    >
      <h2
        style={{
          textAlign: "center",
          color: "#2E7D32",
          marginBottom: "5px",
        }}
      >
        🌾 Farmland Marketplace
      </h2>

      <p
        style={{
          textAlign: "center",
          color: "#666",
          marginBottom: "25px",
        }}
      >
        Login to your account
      </p>

      <form onSubmit={login}>
        {/* Email */}

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          required
          style={inputStyle}
        />

        {/* Password */}

        <div style={{ position: "relative" }}>
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
            style={{
              ...inputStyle,
              marginBottom: "5px",
            }}
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword(!showPassword)
            }
            style={{
              position: "absolute",
              right: "10px",
              top: "10px",
              border: "none",
              background: "none",
              cursor: "pointer",
            }}
          >
            {showPassword ? "🙈" : "👁"}
          </button>
        </div>

        {/* Remember Me */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <label>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={() =>
                setRememberMe(
                  !rememberMe
                )
              }
            />{" "}
            Remember Me
          </label>

          <Link
            to="/forgot-password"
            style={{
              color: "#1976D2",
              textDecoration: "none",
            }}
          >
            Forgot Password?
          </Link>
        </div>

        {/* Login Button */}

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
            cursor: "pointer",
          }}
        >
          {loading
            ? "Logging in..."
            : "Login"}
        </button>
      </form>

      <p
        style={{
          marginTop: "20px",
          textAlign: "center",
        }}
      >
        Don't have an account?{" "}
        <Link to="/register">
          Register
        </Link>
      </p>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginBottom: "15px",
  boxSizing: "border-box",
};

export default Login;