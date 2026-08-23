import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;