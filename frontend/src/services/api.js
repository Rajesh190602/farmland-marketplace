import axios from "axios";

console.log("Using API:", "https://farmland-backend-ncnk.onrender.com");

const api = axios.create({
  baseURL: "https://farmland-backend-ncnk.onrender.com",
});

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;