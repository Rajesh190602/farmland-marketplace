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
    const token = sessionStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // When sending FormData, allow Axios/browser
    // to automatically set multipart/form-data boundary.
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
    if (error.response?.status === 401) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user_id");
      sessionStorage.removeItem("full_name");
      sessionStorage.removeItem("role");

      if (window.location.pathname !== "/") {
        alert(
          "Your session has expired. Please login again."
        );

        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

export default api;