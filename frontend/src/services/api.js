import axios from "axios";

console.log("Using API:", "https://farmland-backend-ncnk.onrender.com");

const api = axios.create({
  baseURL: "https://farmland-backend-ncnk.onrender.com",
});

export default api;