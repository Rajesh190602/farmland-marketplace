import axios from "axios";

const api = axios.create({
  baseURL: "https://farmland-backend-ncnk.onrender.com",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // IMPORTANT:
    // When sending FormData, do NOT force application/json.
    // The browser/Axios will automatically set:
    // multipart/form-data; boundary=...
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle common response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If token is invalid or expired
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      if (window.location.pathname !== "/login") {
        alert("Your session has expired. Please login again.");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;