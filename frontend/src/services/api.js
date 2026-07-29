import axios from "axios";

console.log("Using API:", "http://127.0.0.1:8000");

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    console.log("Interceptor Token:", token);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;