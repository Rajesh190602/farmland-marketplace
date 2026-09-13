import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import { lazy, Suspense } from "react";
import RiskMonitoring from "./pages/admin/RiskMonitoring";

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

// Step 68 - Farmer + Buyer KYC / Identity Verification
const KYCVerification = lazy(() =>
  import("./pages/KYCVerification")
);

// =====================================================
// PHASE 1 - Marketplace
// =====================================================

const MarketplaceActivity = lazy(() =>
  import("./pages/MarketplaceActivity")
);

// =====================================================
// PHASE 2 - TRUST & SAFETY
// =====================================================

// Farmer land ownership / Pattadhar Passbook verification
const LandOwnershipVerification = lazy(() =>
  import("./pages/LandOwnershipVerification")
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

const AdminPermissions = lazy(() =>
  import("./pages/admin/AdminPermissions")
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

// Admin land ownership / Pattadhar Passbook verification queue
const LandOwnershipVerificationAdmin = lazy(() =>
  import("./pages/admin/LandOwnershipVerificationAdmin")
);

// Step 68 - Admin KYC / Identity Verification
const KYCVerificationAdmin = lazy(() =>
  import("./pages/admin/KYCVerificationAdmin")
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

          {/* =====================================================
              STEP 69 - LAND OWNERSHIP VERIFICATION
          ===================================================== */}

          <Route
            path="/land-ownership/:landId"
            element={
              <FarmerRoute>
                <LandOwnershipVerification />
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
              STEP 68 - KYC / IDENTITY VERIFICATION
              Available to both Farmer and Buyer
          ===================================================== */}

          <Route
            path="/kyc"
            element={
              <ProtectedRoute>
                <KYCVerification />
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
            {/* Dashboard - Analytics Admin + Super Admin */}
            <Route
              index
              element={
                <AdminRoute requiredPermission="ANALYTICS_ADMIN">
                  <AdminDashboard />
                </AdminRoute>
              }
            />

            {/* Users - Support Admin + Super Admin */}
            <Route
              path="users"
              element={
                <AdminRoute requiredPermission="SUPPORT_ADMIN">
                  <Users />
                </AdminRoute>
              }
            />

            {/* User Details - Support Admin + Super Admin */}
            <Route
              path="users/:id"
              element={
                <AdminRoute requiredPermission="SUPPORT_ADMIN">
                  <UserDetails />
                </AdminRoute>
              }
            />

            {/* Edit User - Moderation Admin + Super Admin */}
            <Route
              path="users/edit/:id"
              element={
                <AdminRoute requiredPermission="MODERATION_ADMIN">
                  <EditUser />
                </AdminRoute>
              }
            />

            {/* Lands - Moderation Admin + Super Admin */}
            <Route
              path="lands"
              element={
                <AdminRoute requiredPermission="MODERATION_ADMIN">
                  <AdminLands />
                </AdminRoute>
              }
            />

            {/* Land Details - Support Admin + Super Admin */}
            <Route
              path="lands/:id"
              element={
                <AdminRoute requiredPermission="SUPPORT_ADMIN">
                  <AdminLandDetails />
                </AdminRoute>
              }
            />

            {/* Pending Lands - Moderation Admin + Super Admin */}
            <Route
              path="pending-lands"
              element={
                <AdminRoute requiredPermission="MODERATION_ADMIN">
                  <PendingLands />
                </AdminRoute>
              }
            />

            {/* Edit Land - Moderation Admin + Super Admin */}
            <Route
              path="edit-land/:id"
              element={
                <AdminRoute requiredPermission="MODERATION_ADMIN">
                  <AdminEditLand />
                </AdminRoute>
              }
            />

            {/* Activity Logs - Support Admin + Super Admin */}
            <Route
              path="activity-logs"
              element={
                <AdminRoute requiredPermission="SUPPORT_ADMIN">
                  <ActivityLogs />
                </AdminRoute>
              }
            />

            {/* =================================================
                PHASE 2 #10 - ADMIN REPORTS
            ================================================= */}

            {/* Reports - Moderation Admin + Super Admin */}
            <Route
              path="reports"
              element={
                <AdminRoute requiredPermission="MODERATION_ADMIN">
                  <AdminReports />
                </AdminRoute>
              }
            />
            {/* Step 76 - Risk Monitoring - Moderation Admin + Super Admin */}
            <Route
              path="risk"
              element={
                <AdminRoute requiredPermission="MODERATION_ADMIN">
                  <RiskMonitoring />
                </AdminRoute>
              }
            />

            {/* =================================================
                STEP 69 - ADMIN LAND OWNERSHIP VERIFICATION
            ================================================= */}

            {/* Pattadhar verification - Verification Admin + Super Admin */}
            <Route
              path="land-ownership"
              element={
                <AdminRoute requiredPermission="VERIFICATION_ADMIN">
                  <LandOwnershipVerificationAdmin />
                </AdminRoute>
              }
            />

            {/* =================================================
                STEP 68 - ADMIN KYC / IDENTITY VERIFICATION
            ================================================= */}

            {/* KYC verification - Verification Admin + Super Admin */}
            <Route
              path="kyc"
              element={
                <AdminRoute requiredPermission="VERIFICATION_ADMIN">
                  <KYCVerificationAdmin />
                </AdminRoute>
              }
            />

            {/* =================================================
                STEP 75 - SUPER ADMIN PERMISSION MANAGEMENT
            ================================================= */}

            {/* Admin Permissions - Super Admin only */}
            <Route
              path="permissions"
              element={
                <AdminRoute requiredPermission="SUPER_ADMIN">
                  <AdminPermissions />
                </AdminRoute>
              }
            />
          </Route>

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
