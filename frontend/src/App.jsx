import { BrowserRouter, Routes, Route } from "react-router-dom";
import SearchLands from "./pages/SearchLands";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import AddLand from "./pages/AddLand";
import ChatPage from "./pages/ChatPage";
import MyLands from "./pages/MyLands";
import EditLand from "./pages/EditLand"; // Farmer Edit Land
import AllLands from "./pages/AllLands";
import LandDetails from "./pages/LandDetails";
import MyChats from "./pages/MyChats";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Users from "./pages/admin/Users";
import Profile from "./pages/profile";
import ChangePassword from "./pages/ChangePassword";
import Lands from "./pages/admin/Lands";
import AdminEditLand from "./pages/admin/EditLand"; // Admin Edit Land
import MyFavorites from "./pages/MyFavorites";
import Notifications from "./pages/Notifications";
import ForgotPassword from "./pages/ForgotPassword";
function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<Home />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Farmer Routes */}
        <Route path="/add-land" element={<AddLand />} />
        <Route path="/my-lands" element={<MyLands />} />
        <Route path="/edit-land/:id" element={<EditLand />} />
        <Route path="/all-lands" element={<AllLands />} />
        <Route path="/search" element={<SearchLands />} />
        <Route path="/land/:id" element={<LandDetails />} />
        <Route
          path="/chat/:conversationId"
          element={<ChatPage />}
        />
        <Route
          path="/my-chats"
          element={<MyChats />}
        />
        <Route
          path="/profile"
          element={<Profile />}
        />
        <Route
         path="/change-password"
         element={<ChangePassword />}
        />
        
        <Route
          path="/favorites"
          element={<MyFavorites />}
        />
        <Route path="/notifications" element={<Notifications />} />
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