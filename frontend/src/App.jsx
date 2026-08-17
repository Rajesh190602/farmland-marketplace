import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ActivityLogs from "./pages/admin/ActivityLogs";
import Home from "./pages/Home";
import AddLand from "./pages/AddLand";
import MyLands from "./pages/MyLands";
import EditLand from "./pages/EditLand";
import AllLands from "./pages/AllLands";
import SearchLands from "./pages/SearchLands";
import LandDetails from "./pages/LandDetails";
import ChatPage from "./pages/ChatPage";
import MyChats from "./pages/MyChats";
import Profile from "./pages/profile";
import ChangePassword from "./pages/ChangePassword";
import MyFavorites from "./pages/MyFavorites";
import Notifications from "./pages/Notifications";

import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLands from "./pages/admin/AdminLands";
import Users from "./pages/admin/Users";
import UserDetails from "./pages/admin/UserDetails";
import EditUser from "./pages/admin/EditUser";
import PendingLands from "./pages/admin/PendingLands";
import AdminEditLand from "./pages/admin/EditLand";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import FarmerRoute from "./components/FarmerRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* =====================================================
            Public Routes
        ===================================================== */}

        <Route
          path="/"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />


        {/* =====================================================
            Farmer / Protected Routes
        ===================================================== */}

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
          path="/add-land"
          element={
            <FarmerRoute>
              <AddLand />
            </FarmerRoute>
          }
        />

        <Route
          path="/my-lands"
          element={
            <FarmerRoute>
              <MyLands />
            </FarmerRoute>
          }
        />

        <Route
          path="/edit-land/:id"
          element={
            <ProtectedRoute>
              <EditLand />
            </ProtectedRoute>
          }
        />

        <Route
          path="/all-lands"
          element={
            <ProtectedRoute>
              <AllLands />
            </ProtectedRoute>
          }
        />

        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <SearchLands />
            </ProtectedRoute>
          }
        />

        <Route
          path="/land/:id"
          element={
            <ProtectedRoute>
              <LandDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat/:conversationId"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-chats"
          element={
            <ProtectedRoute>
              <MyChats />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />

        <Route
          path="/favorites"
          element={
            <ProtectedRoute>
              <MyFavorites />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />


        {/* =====================================================
            Admin Routes
        ===================================================== */}

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >

          {/* /admin */}
          <Route
            index
            element={<AdminDashboard />}
          />

          {/* /admin/users */}
          <Route
            path="users"
            element={<Users />}
          />

          {/* /admin/users/:id */}
          <Route
            path="users/:id"
            element={<UserDetails />}
          />

          {/* /admin/users/edit/:id */}
          <Route
            path="users/edit/:id"
            element={<EditUser />}
          />

          {/* /admin/lands */}
          <Route
            path="lands"
            element={<AdminLands />}
          />

          {/* /admin/pending-lands */}
          <Route
            path="pending-lands"
            element={<PendingLands />}
          />

          {/* /admin/edit-land/:id */}
          <Route
            path="edit-land/:id"
            element={<AdminEditLand />}
          />
          <Route        
            path="activity-logs"
            element={<ActivityLogs />}
          />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;