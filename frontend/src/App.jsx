import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import { lazy, Suspense } from "react";

// =====================================================
// Public Pages
// =====================================================

const Login = lazy(() =>
  import("./pages/Login")
);

const Register = lazy(() =>
  import("./pages/Register")
);

const ForgotPassword = lazy(() =>
  import("./pages/ForgotPassword")
);

// =====================================================
// Farmer / Protected Pages
// =====================================================

const Home = lazy(() =>
  import("./pages/Home")
);

const AddLand = lazy(() =>
  import("./pages/AddLand")
);

const MyLands = lazy(() =>
  import("./pages/MyLands")
);

const EditLand = lazy(() =>
  import("./pages/EditLand")
);

const AllLands = lazy(() =>
  import("./pages/AllLands")
);

const SearchLands = lazy(() =>
  import("./pages/SearchLands")
);

const LandDetails = lazy(() =>
  import("./pages/LandDetails")
);

const ChatPage = lazy(() =>
  import("./pages/ChatPage")
);

const MyChats = lazy(() =>
  import("./pages/MyChats")
);

const Profile = lazy(() =>
  import("./pages/profile")
);

const ChangePassword = lazy(() =>
  import("./pages/ChangePassword")
);

const MyFavorites = lazy(() =>
  import("./pages/MyFavorites")
);

const Notifications = lazy(() =>
  import("./pages/Notifications")
);

// =====================================================
// PHASE 1 - Marketplace
// =====================================================

const MarketplaceActivity = lazy(() =>
  import("./pages/MarketplaceActivity")
);

// =====================================================
// Admin Pages
// =====================================================

const AdminLayout = lazy(() =>
  import("./components/AdminLayout")
);

const AdminDashboard = lazy(() =>
  import("./pages/admin/AdminDashboard")
);

const AdminLands = lazy(() =>
  import("./pages/admin/AdminLands")
);

const Users = lazy(() =>
  import("./pages/admin/Users")
);

const UserDetails = lazy(() =>
  import("./pages/admin/UserDetails")
);

const EditUser = lazy(() =>
  import("./pages/admin/EditUser")
);

const PendingLands = lazy(() =>
  import("./pages/admin/PendingLands")
);

const AdminEditLand = lazy(() =>
  import("./pages/admin/EditLand")
);

const AdminLandDetails = lazy(() =>
  import("./pages/admin/LandDetails")
);

const ActivityLogs = lazy(() =>
  import("./pages/admin/ActivityLogs")
);

// =====================================================
// PHASE 2 - TRUST & SAFETY
// =====================================================

const AdminReports = lazy(() =>
  import("./pages/admin/AdminReports")
);

// =====================================================
// Route Guards
// =====================================================

import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import FarmerRoute from "./components/FarmerRoute";

// =====================================================
// Loading Component
// =====================================================

function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F5F7FA",
        color: "#2E7D32",
        fontSize: "22px",
        fontWeight: "bold",
      }}
    >
      Loading...
    </div>
  );
}

// =====================================================
// Application
// =====================================================

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
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
            path="/lands/:id"
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
              PHASE 1 - MARKETPLACE ACTIVITY
          ===================================================== */}

          <Route
            path="/marketplace-activity"
            element={
              <ProtectedRoute>
                <MarketplaceActivity />
              </ProtectedRoute>
            }
          />

          {/* =====================================================
              ADMIN ROUTES
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

            {/* /admin/lands/:id */}
            <Route
              path="lands/:id"
              element={<AdminLandDetails />}
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

            {/* /admin/activity-logs */}
            <Route
              path="activity-logs"
              element={<ActivityLogs />}
            />

            {/* =================================================
                PHASE 2 #10 - ADMIN REPORTS
            ================================================= */}

            <Route
              path="reports"
              element={<AdminReports />}
            />

          </Route>

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;