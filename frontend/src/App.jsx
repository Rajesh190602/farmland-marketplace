import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import AddLand from "./pages/AddLand";

import MyLands from "./pages/MyLands";
import EditLand from "./pages/EditLand"; // Farmer Edit Land
import AllLands from "./pages/AllLands";
import LandDetails from "./pages/LandDetails";

import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Users from "./pages/admin/Users";
import Lands from "./pages/admin/Lands";
import AdminEditLand from "./pages/admin/EditLand"; // Admin Edit Land

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<Home />} />

        {/* Farmer Routes */}
        <Route path="/add-land" element={<AddLand />} />
        <Route path="/my-lands" element={<MyLands />} />
        <Route path="/edit-land/:id" element={<EditLand />} />
        <Route path="/all-lands" element={<AllLands />} />
        <Route path="/land/:id" element={<LandDetails />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="lands" element={<Lands />} />
          <Route path="edit-land/:id" element={<AdminEditLand />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;