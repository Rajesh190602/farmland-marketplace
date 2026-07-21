import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      console.log("API URL:", api.defaults.baseURL);
      console.log("Sending Login Request...");

      const response = await api.post(
        "/users/login",
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      console.log("✅ Login Response:", response.data);

      localStorage.setItem("token", response.data.access_token);

      alert("Login Successful");

      navigate("/home");

    } catch (error) {
      console.error("========== LOGIN ERROR ==========");
      console.error("Message:", error.message);
      console.error("Code:", error.code);
      console.error("Response:", error.response);
      console.error("Request:", error.request);
      console.error(error);

      if (error.response) {
        alert(
          `Status: ${error.response.status}\n\n${
            error.response.data.detail ||
            JSON.stringify(error.response.data)
          }`
        );
      } else if (error.request) {
        alert(
          "Network Error!\n\nCheck the browser console (F12 → Console) for the exact error."
        );
      } else {
        alert(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: "400px",
        margin: "80px auto",
        padding: "30px",
        border: "1px solid #ddd",
        borderRadius: "10px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
      }}
    >
      <h2 style={{ textAlign: "center" }}>
        🌾 Farmland Marketplace
      </h2>

      <form onSubmit={login}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "15px",
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "20px",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#2E7D32",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <br />

      <div style={{ textAlign: "center" }}>
        <Link to="/register">
          New User? Register
        </Link>
      </div>
    </div>
  );
}

export default Login;