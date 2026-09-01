import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";

import {
  FaUsers,
  FaSeedling,
  FaMapMarkedAlt,
  FaHeart,
  FaPlusCircle,
  FaSearch,
  FaUserCircle,
  FaComments,
  FaBell,
  FaLock,
  FaEdit,
  FaTrash,
  FaFile,
  FaEnvelope,
  FaSignInAlt,
} from "react-icons/fa";

import Navbar from "../components/Navbar";
import api from "../services/api";

function Home() {
  const navigate = useNavigate();

  // =====================================================
  // DASHBOARD STATE
  // =====================================================

  const [stats, setStats] = useState({
    total_users: 0,
    total_lands: 0,
    my_lands: 0,
    favorites: 0,
    chats: 0,
    notifications: 0,
  });

  const [recentActivity, setRecentActivity] = useState([]);

  // =====================================================
  // SCROLL TO TOP
  // =====================================================

  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };


  const userName =
    sessionStorage.getItem("full_name") || "Farmer";

  const userRole = (
    sessionStorage.getItem("role") || ""
  ).trim().toLowerCase();

  const [featuredLands, setFeaturedLands] = useState([]);
  const [recentlyViewedLands, setRecentlyViewedLands] = useState([]);

  // =====================================================
  // FAVORITES
  // =====================================================

  const [favoriteStatus, setFavoriteStatus] = useState({});
  const [favoriteLoading, setFavoriteLoading] = useState({});

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    fetchDashboard();
    fetchRecentlyViewedLands();

    // Farmers must not load other farmers' public lands on Home.
    // Buyers and admins can load featured lands.
    if (userRole !== "farmer") {
      fetchFeaturedLands();
    }
  }, []);

  // =====================================================
  // FETCH FEATURED LANDS
  // =====================================================

  const fetchFeaturedLands = async () => {
    try {
      const response = await api.get("/lands");

      const lands = response.data.slice(0, 3);

      setFeaturedLands(lands);

      // Only buyers need favorite status
      if (userRole === "buyer") {
        checkFavoriteStatus(lands);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // =====================================================
  // FETCH RECENTLY VIEWED LANDS
  // =====================================================

  const fetchRecentlyViewedLands = async () => {
    try {
      const response = await api.get("/lands/recently-viewed");
      setRecentlyViewedLands(response.data || []);
    } catch (error) {
      console.log("Failed to load recently viewed lands:", error);
      setRecentlyViewedLands([]);
    }
  };

  // =====================================================
  // CHECK FAVORITE STATUS
  // =====================================================

  const checkFavoriteStatus = async (lands) => {
    try {
      const status = {};

      await Promise.all(
        lands.map(async (land) => {
          try {
            const response = await api.get(
              `/favorites/check/${land.id}`
            );

            status[land.id] =
              response.data.is_favorite;
          } catch (error) {
            console.log(
              `Failed to check favorite for land ${land.id}`,
              error
            );

            status[land.id] = false;
          }
        })
      );

      setFavoriteStatus(status);
    } catch (error) {
      console.log(error);
    }
  };

  // =====================================================
  // TOGGLE FAVORITE
  // =====================================================

  const toggleFavorite = async (landId) => {
    if (userRole !== "buyer") {
      alert(
        "Only buyers can add lands to favorites."
      );
      return;
    }

    if (favoriteLoading[landId]) {
      return;
    }

    try {
      setFavoriteLoading((prev) => ({
        ...prev,
        [landId]: true,
      }));

      const isFavorite =
        favoriteStatus[landId] === true;

      if (isFavorite) {
        await api.delete(
          `/favorites/${landId}`
        );

        setFavoriteStatus((prev) => ({
          ...prev,
          [landId]: false,
        }));

        fetchDashboard();
      } else {
        await api.post(
          `/favorites/${landId}`
        );

        setFavoriteStatus((prev) => ({
          ...prev,
          [landId]: true,
        }));

        fetchDashboard();
      }
    } catch (error) {
      console.error(error);

      const message =
        error.response?.data?.detail ||
        "Failed to update favorite.";

      alert(message);
    } finally {
      setFavoriteLoading((prev) => ({
        ...prev,
        [landId]: false,
      }));
    }
  };

  // =====================================================
  // DASHBOARD
  // =====================================================

  const fetchDashboard = async () => {
    try {
      // Keep the existing dashboard data for users, lands,
      // favorites and recent activity.
      const response = await api.get(
        "/dashboard"
      );

      // Home badges show NEW/UNREAD items.
      // Notifications already have a dedicated unread-count
      // endpoint. Chats now return unread_count per conversation.
      const [
        notificationCountResponse,
        conversationsResponse,
      ] = await Promise.all([
        api.get("/notifications/unread-count"),
        api.get("/chat/my-conversations"),
      ]);

      const conversations =
        conversationsResponse.data || [];

      // Count unread CONVERSATIONS, not total messages.
      // Example: 3 unread messages in one chat = Chats 1.
      const unreadChats = conversations.filter(
        (conversation) =>
          Number(conversation.unread_count || 0) > 0
      ).length;

      setStats({
        total_users:
          response.data.total_users || 0,

        total_lands:
          response.data.total_lands || 0,

        my_lands:
          response.data.my_lands || 0,

        favorites:
          response.data.favorites || 0,

        chats: unreadChats,

        notifications:
          Number(
            notificationCountResponse.data.unread_count
          ) || 0,
      });

      // -----------------------------------------------
      // Recent Activity
      // -----------------------------------------------

      setRecentActivity(
        response.data.recent_activity || []
      );
    } catch (error) {
      console.log(error);
    }
  };

  // =====================================================
  // DASHBOARD CARD NAVIGATION
  // =====================================================

  const handleDashboardCardClick = (card) => {
    switch (card) {
      case "total_users":
        // Only admin can access Manage Users
        if (userRole === "admin") {
          navigate("/admin/users");
        }
        break;

      case "total_lands":
        if (userRole === "farmer") {
          navigate("/my-lands");
        } else {
          navigate("/all-lands");
        }
        break;

      case "my_lands":
        navigate("/my-lands");
        break;

      case "favorites":
        navigate("/favorites");
        break;

      case "chats":
        navigate("/my-chats");
        break;

      case "notifications":
        navigate("/notifications");
        break;

      default:
        break;
    }
  };

  // =====================================================
  // DASHBOARD CARD STYLE
  // =====================================================

  const dashboardCardStyle = (clickable) => ({
    background: "rgba(255,255,255,.97)",
    borderRadius: "18px",
    padding: "24px 20px",
    boxShadow:
      "0 5px 18px rgba(31,72,35,.09)",
    textAlign: "center",
    flex: "1",
    minWidth: "180px",
    cursor: clickable ? "pointer" : "default",
    transition:
      "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
    border: "1px solid #E3ECE4",
    width: "100%",
    boxSizing: "border-box",
  });

  const handleCardMouseEnter = (event, clickable) => {
    if (!clickable) return;

    event.currentTarget.style.transform =
      "translateY(-4px)";

    event.currentTarget.style.boxShadow =
      "0 14px 28px rgba(31,72,35,0.16)";
    event.currentTarget.style.borderColor =
      "#B8D8BD";
  };

  const handleCardMouseLeave = (event, clickable) => {
    if (!clickable) return;

    event.currentTarget.style.transform =
      "translateY(0)";

    event.currentTarget.style.boxShadow =
      "0 5px 18px rgba(31,72,35,0.09)";
    event.currentTarget.style.borderColor =
      "#E3ECE4";
  };

  // =====================================================
  // ACTIVITY ICON
  // =====================================================

  const getActivityIcon = (action) => {
    switch (action) {
      case "LOGIN":
        return <FaSignInAlt />;

      case "PROFILE_UPDATED":
        return <FaEdit />;

      case "PASSWORD_CHANGED":
        return <FaLock />;

      case "LAND_FAVORITED":
        return <FaHeart />;

      case "LAND_UNFAVORITED":
        return <FaHeart />;

      case "CHAT_MESSAGE_SENT":
        return <FaComments />;

      case "CHAT_FILE_SENT":
        return <FaFile />;

      case "CREATE_LAND":
        return <FaSeedling />;

      case "UPDATE_LAND":
        return <FaEdit />;

      case "DELETE_LAND":
        return <FaTrash />;

      default:
        return <FaEnvelope />;
    }
  };

  // =====================================================
  // ACTIVITY COLOR
  // =====================================================

  const getActivityColor = (action) => {
    switch (action) {
      case "LOGIN":
        return "#1565C0";

      case "PROFILE_UPDATED":
        return "#6A1B9A";

      case "PASSWORD_CHANGED":
        return "#C62828";

      case "LAND_FAVORITED":
        return "#D81B60";

      case "LAND_UNFAVORITED":
        return "#757575";

      case "CHAT_MESSAGE_SENT":
        return "#1976D2";

      case "CHAT_FILE_SENT":
        return "#EF6C00";

      case "CREATE_LAND":
        return "#2E7D32";

      case "UPDATE_LAND":
        return "#EF6C00";

      case "DELETE_LAND":
        return "#C62828";

      default:
        return "#616161";
    }
  };

  // =====================================================
  // ACTIVITY NAVIGATION
  // =====================================================

  const openActivity = (activity) => {
    if (
      !activity.target_type ||
      !activity.target_id
    ) {
      return;
    }

    if (
      activity.target_type.toLowerCase() ===
      "land"
    ) {
      navigate(
        `/land/${activity.target_id}`
      );

      return;
    }

    if (
      activity.target_type.toLowerCase() ===
      "conversation"
    ) {
      navigate(
        `/chat/${activity.target_id}`
      );

      return;
    }

    if (
      activity.target_type.toLowerCase() ===
      "user"
    ) {
      navigate("/profile");
    }
  };

  // =====================================================
  // QUICK ACTION BUTTON STYLE
  // =====================================================

  const quickButton = (color) => ({
    background: color,
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "13px 18px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "700",
    width: "100%",
    maxWidth: "280px",
    minHeight: "48px",
    boxShadow: "0 6px 14px rgba(0,0,0,.10)",
    transition: "transform .2s ease, box-shadow .2s ease",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  });

  // =====================================================
  // UI
  // =====================================================

  return (
    <>
      <Navbar />

      <style>{`
        .home-page{min-height:100vh;background:radial-gradient(circle at 8% 0%,rgba(76,175,80,.09),transparent 28%),radial-gradient(circle at 92% 10%,rgba(33,150,243,.06),transparent 25%),#f4f7f4}
        .home-container{max-width:1400px;margin:0 auto}
        .home-hero{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:30px;min-height:220px;padding:clamp(28px,5vw,48px);border-radius:28px;background:linear-gradient(120deg,#174d1c 0%,#2e7d32 55%,#4caf50 100%);box-shadow:0 18px 45px rgba(30,91,35,.20);margin-bottom:38px}
        .home-hero::after{content:"";position:absolute;width:260px;height:260px;border:1px solid rgba(255,255,255,.14);border-radius:50%;right:-70px;top:-90px;box-shadow:0 0 0 35px rgba(255,255,255,.035),0 0 0 70px rgba(255,255,255,.025)}
        .home-hero-content{position:relative;z-index:1;max-width:780px}
        .home-eyebrow{display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:999px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.20);font-size:12px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;margin-bottom:14px}
        .home-hero h1{letter-spacing:-1px}.home-hero h2{font-size:clamp(20px,3vw,28px);margin:12px 0 8px!important}.home-hero p{max-width:680px;opacity:.92;line-height:1.6;margin-bottom:0}
        .home-hero-art{position:relative;z-index:1;width:130px;height:130px;flex:0 0 130px;border-radius:34px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);box-shadow:inset 0 1px 0 rgba(255,255,255,.15);font-size:62px}
        .home-section-title{display:flex;align-items:end;justify-content:space-between;gap:16px;margin:42px 0 18px}.home-section-title h2{margin:0!important;color:#174d1c!important;font-weight:850!important;letter-spacing:-.4px}.home-section-title span{color:#6b786d;font-size:13px}
        .home-dashboard-card{position:relative;overflow:hidden;text-align:left!important}.home-dashboard-card::before{content:"";position:absolute;left:0;top:0;width:5px;height:100%;background:var(--card-accent,#2e7d32);opacity:.9}
        .home-dashboard-card h3{margin:14px 0 4px!important;color:#26352a;font-size:15px;font-weight:750}.home-dashboard-card h1{margin:0!important;color:#142219;font-size:clamp(30px,4vw,38px);line-height:1.1}
        .home-stat-icon{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:#f2f7f2}
        .home-quick-actions{align-items:stretch!important}.home-quick-actions button{box-shadow:0 8px 18px rgba(31,55,35,.12)!important;transition:transform .2s ease,box-shadow .2s ease}.home-quick-actions button:hover{transform:translateY(-2px);box-shadow:0 12px 24px rgba(31,55,35,.17)!important}
        .home-land-section{margin-top:44px!important}.home-land-card{display:flex;flex-direction:column;height:100%;background:#fff!important;border:1px solid #dfe9e1!important;box-shadow:0 10px 28px rgba(31,72,35,.10)!important;transition:transform .25s ease,box-shadow .25s ease}.home-land-card:hover{transform:translateY(-4px);box-shadow:0 18px 34px rgba(31,72,35,.15)!important}
        .home-land-image-wrap{background:#e9f0ea}.home-land-details{flex:1;display:flex;flex-direction:column}.home-land-details p{margin:7px 0;color:#536057;font-size:14px}.home-land-details strong{color:#34463a}.home-view-button{margin-top:auto!important;min-height:46px;font-size:15px;border-radius:11px!important}
        .home-activity{margin-top:44px!important;background:rgba(255,255,255,.98)!important;border:1px solid #dfe9e1!important;box-shadow:0 10px 28px rgba(31,72,35,.08)!important}.home-activity-row{background:#f7faf7!important;border-color:#e2ebe3!important;transition:transform .2s ease,background .2s ease}.home-activity-row:hover{transform:translateX(3px);background:#f1f7f1!important}
        @media(max-width:700px){.home-hero{min-height:auto;padding:25px;border-radius:22px}.home-hero-art{display:none}.home-section-title{align-items:flex-start;flex-direction:column;gap:4px}.home-dashboard-card{padding:20px 18px!important}.home-land-grid{grid-template-columns:1fr!important}}
        @media(max-width:480px){.home-hero h1{font-size:28px!important}.home-hero h2{font-size:20px!important}.home-quick-actions{display:grid!important;grid-template-columns:1fr!important}.home-quick-actions button{max-width:none!important}}
      `}</style>

        <style>{`
          @media (max-width: 700px) {
            .home-dashboard-card-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
            .home-quick-actions {
              display: grid !important;
              grid-template-columns: 1fr 1fr;
            }
            .home-quick-actions button {
              max-width: none !important;
            }
          }
          @media (max-width: 480px) {
            .home-dashboard-card-grid {
              grid-template-columns: 1fr !important;
            }
            .home-quick-actions {
              grid-template-columns: 1fr;
            }
          }

          .home-page {
            width: 100%;
            overflow-x: hidden;
            box-sizing: border-box;
          }

          .home-container {
            width: 100%;
            max-width: 1180px;
            margin-left: auto;
            margin-right: auto;
            box-sizing: border-box;
          }

          .home-dashboard-card,
          .home-land-card {
            min-width: 0;
          }

          .home-hero-content {
            min-width: 0;
          }

          .home-scroll-top {
            position: fixed !important;
            right: 24px !important;
            bottom: 24px !important;
            left: auto !important;
            top: auto !important;
            width: 48px !important;
            height: 48px !important;
            min-width: 48px !important;
            min-height: 48px !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 50% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: #2E7D32 !important;
            color: #fff !important;
            box-shadow: 0 8px 22px rgba(0,0,0,.22) !important;
            cursor: pointer !important;
            z-index: 2147483647 !important;
            font-size: 22px !important;
            font-weight: 800 !important;
            line-height: 1 !important;
            transform: none !important;
          }

          .home-scroll-top:hover {
            transform: translateY(-3px);
          }

          @media (max-width: 900px) {
            .home-container {
              max-width: 100%;
            }
          }

          @media (max-width: 700px) {
            .home-page {
              padding-left: 12px !important;
              padding-right: 12px !important;
            }

            .home-hero {
              min-height: auto;
              padding: 24px !important;
            }

            .home-hero-art {
              display: none;
            }

            .home-dashboard-card-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }

            .home-land-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }

            .home-scroll-top {
              right: 16px !important;
              bottom: 16px !important;
              width: 46px !important;
              height: 46px !important;
              min-width: 46px !important;
              min-height: 46px !important;
            }
          }

          @media (max-width: 480px) {
            .home-dashboard-card-grid,
            .home-land-grid {
              grid-template-columns: 1fr !important;
            }

            .home-quick-actions {
              display: grid !important;
              grid-template-columns: 1fr !important;
            }

            .home-quick-actions button {
              max-width: none !important;
            }

            .home-scroll-top {
              right: 14px !important;
              bottom: 14px !important;
            }
          }
        `}</style>

      <div
        className="home-page"
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg,#F7FAF7 0%,#F5F7FA 55%,#EEF4EF 100%)",
          padding: "clamp(16px,3vw,32px)",
          boxSizing: "border-box",
        }}
      >

        <div className="home-container">

        {/* =================================================
            WELCOME
        ================================================= */}

        <div className="home-hero">
          <div className="home-hero-content">
            <div className="home-eyebrow">🌾 Farmland Marketplace</div>
            <h1 style={{margin:0,fontSize:"clamp(30px,5vw,44px)"}}>Welcome Back, {userName}! 👋</h1>
            <h2>Your farmland dashboard</h2>
            <p>Manage your farmland, connect with buyers, and grow your farming business from one place.</p>
          </div>
          <div className="home-hero-art" aria-hidden="true">🌱</div>
        </div>

        {/* =================================================
            STATISTICS
        ================================================= */}

        <div className="home-section-title">
          <div><h2>Dashboard Overview</h2><span>Your account at a glance</span></div>
        </div>

        <div
          className="home-dashboard-card-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(200px,1fr))",
            gap: "18px",
          }}
        >

          {/* TOTAL USERS */}

          <div
            role={
              userRole === "admin"
                ? "button"
                : undefined
            }
            tabIndex={
              userRole === "admin"
                ? 0
                : undefined
            }
            onClick={() =>
              handleDashboardCardClick(
                "total_users"
              )
            }
            onKeyDown={(event) => {
              if (
                userRole === "admin" &&
                (event.key === "Enter" ||
                  event.key === " ")
              ) {
                event.preventDefault();
                handleDashboardCardClick(
                  "total_users"
                );
              }
            }}
            onMouseEnter={(event) =>
              handleCardMouseEnter(
                event,
                userRole === "admin"
              )
            }
            onMouseLeave={(event) =>
              handleCardMouseLeave(
                event,
                userRole === "admin"
              )
            }
            className="home-dashboard-card"
            style={{...dashboardCardStyle(userRole === "admin"),"--card-accent":"#1565C0"}}
            title={
              userRole === "admin"
                ? "Manage Users"
                : "Total users"
            }
          >
            <div className="home-stat-icon"><FaUsers size={26} color="#1565C0" /></div>

            <h3>Total Users</h3>

            <h1>{stats.total_users}</h1>

            {userRole === "admin" && (
              <div
                style={{
                  color: "#1565C0",
                  fontWeight: "bold",
                  fontSize: "13px",
                  marginTop: "8px",
                }}
              >
                Manage Users →
              </div>
            )}
          </div>

          {/* TOTAL LANDS */}

          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              handleDashboardCardClick(
                "total_lands"
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();
                handleDashboardCardClick(
                  "total_lands"
                );
              }
            }}
            onMouseEnter={(event) =>
              handleCardMouseEnter(event, true)
            }
            onMouseLeave={(event) =>
              handleCardMouseLeave(event, true)
            }
            className="home-dashboard-card"
            style={{...dashboardCardStyle(true),"--card-accent":"#2E7D32"}}
            title="Browse Lands"
          >
            <div className="home-stat-icon"><FaSeedling size={26} color="#2E7D32" /></div>

            <h3>Total Lands</h3>

            <h1>{stats.total_lands}</h1>

            <div
              style={{
                color: "#2E7D32",
                fontWeight: "bold",
                fontSize: "13px",
                marginTop: "8px",
              }}
            >
              Browse Lands →
            </div>
          </div>

          {/* MY LANDS */}

          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              handleDashboardCardClick(
                "my_lands"
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();
                handleDashboardCardClick(
                  "my_lands"
                );
              }
            }}
            onMouseEnter={(event) =>
              handleCardMouseEnter(event, true)
            }
            onMouseLeave={(event) =>
              handleCardMouseLeave(event, true)
            }
            className="home-dashboard-card"
            style={{...dashboardCardStyle(true),"--card-accent":"#EF6C00"}}
            title="Open My Lands"
          >
            <div className="home-stat-icon"><FaMapMarkedAlt size={26} color="#EF6C00" /></div>

            <h3>My Lands</h3>

            <h1>{stats.my_lands}</h1>

            <div
              style={{
                color: "#EF6C00",
                fontWeight: "bold",
                fontSize: "13px",
                marginTop: "8px",
              }}
            >
              Open My Lands →
            </div>
          </div>

          {/* FAVORITES */}

          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              handleDashboardCardClick(
                "favorites"
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();
                handleDashboardCardClick(
                  "favorites"
                );
              }
            }}
            onMouseEnter={(event) =>
              handleCardMouseEnter(event, true)
            }
            onMouseLeave={(event) =>
              handleCardMouseLeave(event, true)
            }
            className="home-dashboard-card"
            style={{...dashboardCardStyle(true),"--card-accent":"#D81B60"}}
            title="Open Favorites"
          >
            <div className="home-stat-icon"><FaHeart size={26} color="#D81B60" /></div>

            <h3>Favorites</h3>

            <h1>{stats.favorites}</h1>

            <div
              style={{
                color: "#D81B60",
                fontWeight: "bold",
                fontSize: "13px",
                marginTop: "8px",
              }}
            >
              Open Favorites →
            </div>
          </div>

          {/* CHATS */}

          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              handleDashboardCardClick(
                "chats"
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();
                handleDashboardCardClick(
                  "chats"
                );
              }
            }}
            onMouseEnter={(event) =>
              handleCardMouseEnter(event, true)
            }
            onMouseLeave={(event) =>
              handleCardMouseLeave(event, true)
            }
            className="home-dashboard-card"
            style={{...dashboardCardStyle(true),"--card-accent":"#6A1B9A"}}
            title="Open Chats"
          >
            <div className="home-stat-icon"><FaComments size={26} color="#6A1B9A" /></div>

            <h3>Chats</h3>

            <h1>{stats.chats}</h1>

            <div
              style={{
                color: "#6A1B9A",
                fontWeight: "bold",
                fontSize: "13px",
                marginTop: "8px",
              }}
            >
              Open Chats →
            </div>
          </div>

          {/* NOTIFICATIONS */}

          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              handleDashboardCardClick(
                "notifications"
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();
                handleDashboardCardClick(
                  "notifications"
                );
              }
            }}
            onMouseEnter={(event) =>
              handleCardMouseEnter(event, true)
            }
            onMouseLeave={(event) =>
              handleCardMouseLeave(event, true)
            }
            className="home-dashboard-card"
            style={{...dashboardCardStyle(true),"--card-accent":"#F9A825"}}
            title="Open Notifications"
          >
            <div className="home-stat-icon"><FaBell size={26} color="#F9A825" /></div>

            <h3>Notifications</h3>

            <h1>{stats.notifications}</h1>

            <div
              style={{
                color: "#F9A825",
                fontWeight: "bold",
                fontSize: "13px",
                marginTop: "8px",
              }}
            >
              Open Notifications →
            </div>
          </div>
        </div>

        {/* =================================================
            QUICK ACTIONS
        ================================================= */}

        <div className="home-section-title">
          <div><h2>Quick Actions</h2><span>Common tasks and shortcuts</span></div>
        </div>

        <div
          className="home-quick-actions"
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "20px",
            marginTop: "20px",
          }}
        >
          <button
            style={quickButton("#2E7D32")}
            onClick={() =>
              navigate("/add-land")
            }
          >
            <FaPlusCircle /> Add Land
          </button>

          <button
            style={quickButton("#1565C0")}
            onClick={() =>
              navigate("/my-lands")
            }
          >
            <FaMapMarkedAlt /> My Lands
          </button>

          <button
            disabled={userRole === "farmer"}
            style={{
              ...quickButton("#EF6C00"),
              opacity:
                userRole === "farmer" ? 0.5 : 1,
              cursor:
                userRole === "farmer"
                  ? "not-allowed"
                  : "pointer",
            }}
            onClick={() => {
              if (userRole !== "farmer") {
                navigate("/all-lands");
              }
            }}
          >
            <FaSearch /> Browse Lands
          </button>

          <button
            style={quickButton("#6A1B9A")}
            onClick={() =>
              navigate("/profile")
            }
          >
            <FaUserCircle /> My Profile
          </button>
        </div>

        {/* =================================================
            FEATURED LANDS
        ================================================= */}

        <div className="home-land-section">
          <div className="home-section-title">
            <div><h2>⭐ Featured Lands</h2><span>Explore available farmland</span></div>
          </div>

          <div
            className="home-land-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(300px,1fr))",
              gap: "22px",
            }}
          >
            {featuredLands.map((land) => {
              const isFavorite =
                favoriteStatus[land.id] ===
                true;

              const isLoading =
                favoriteLoading[land.id] ===
                true;

              return (
                <div
                  key={land.id}
                  className="home-land-card"
                  style={{
                    background: "#fff",
                    borderRadius: "18px",
                    overflow: "hidden",
                    boxShadow:
                      "0 8px 24px rgba(31,72,35,.11)",
                    border: "1px solid #E2EBE3",
                    transition: ".3s",
                    position: "relative",
                  }}
                >

                  {/* LAND IMAGE */}

                  <div
                    className="home-land-image-wrap"
                    style={{
                      position: "relative",
                    }}
                  >
                    <img
                      src={
                        land.image_url ||
                        "https://via.placeholder.com/400x250"
                      }
                      alt={land.title}
                      style={{
                        width: "100%",
                        height: "clamp(190px,22vw,230px)",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />

                    {/* FAVORITE BUTTON */}

                    {userRole === "buyer" && (
                      <button
                        onClick={() =>
                          toggleFavorite(
                            land.id
                          )
                        }
                        disabled={isLoading}
                        title={
                          isFavorite
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                        style={{
                          position:
                            "absolute",
                          top: "12px",
                          right: "12px",

                          width: "45px",
                          height: "45px",

                          borderRadius:
                            "50%",
                          border: "none",

                          background:
                            "rgba(255,255,255,0.95)",

                          display: "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",

                          cursor: isLoading
                            ? "not-allowed"
                            : "pointer",

                          boxShadow:
                            "0 3px 10px rgba(0,0,0,.25)",

                          opacity: isLoading
                            ? 0.6
                            : 1,
                        }}
                      >
                        <FaHeart
                          size={22}
                          color={
                            isFavorite
                              ? "#E91E63"
                              : "#777"
                          }
                        />
                      </button>
                    )}
                  </div>

                  {/* LAND DETAILS */}

                  <div
                    className="home-land-details"
                    style={{
                      padding: "20px 20px 22px",
                    }}
                  >
                    <h3
                      style={{
                        marginBottom:
                          "10px",
                        color: "#1B5E20",
                        fontSize: "20px",
                        lineHeight: "1.3",
                      }}
                    >
                      {land.title}
                    </h3>

                    <p>
                      <strong>📍</strong>{" "}
                      {land.village},{" "}
                      {land.district}
                    </p>

                    <p>
                      <strong>🌱 Soil:</strong>{" "}
                      {land.soil_type}
                    </p>

                    <p>
                      <strong>📐 Area:</strong>{" "}
                      {land.area} Acres
                    </p>

                    <p
                      style={{
                        color: "#E65100",
                        fontWeight: "800",
                        fontSize: "21px",
                        marginTop: "12px",
                        marginBottom: "8px",
                      }}
                    >
                      ₹{land.price}
                    </p>

                    <button
                      disabled={userRole === "farmer"}
                      onClick={() => {
                        if (userRole !== "farmer") {
                          navigate(
                            `/land/${land.id}`
                          );
                        }
                      }}
                      className="home-view-button"
                      style={{
                        marginTop: "15px",
                        width: "100%",
                        background:
                          "#2E7D32",
                        color: "#fff",
                        border: "none",
                        padding: "12px",
                        borderRadius:
                          "10px",
                        cursor:
                          userRole === "farmer"
                            ? "not-allowed"
                            : "pointer",
                        fontWeight:
                          "bold",
                        opacity:
                          userRole === "farmer"
                            ? 0.5
                            : 1,
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* =================================================
            RECENTLY VIEWED LANDS
        ================================================= */}

        {recentlyViewedLands.length > 0 && (
          <div className="home-land-section">
            <div className="home-section-title">
              <div>
                <h2>🕘 Recently Viewed Lands</h2>
                <span>Lands you viewed recently</span>
              </div>
            </div>

            <div
              className="home-land-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(300px,1fr))",
                gap: "22px",
              }}
            >
              {recentlyViewedLands.map((land) => (
                <div
                  key={land.id}
                  className="home-land-card"
                  style={{
                    background: "#fff",
                    borderRadius: "18px",
                    overflow: "hidden",
                    boxShadow:
                      "0 8px 24px rgba(31,72,35,.11)",
                    border: "1px solid #E2EBE3",
                    transition: ".3s",
                    position: "relative",
                  }}
                >
                  <div
                    className="home-land-image-wrap"
                    style={{
                      position: "relative",
                    }}
                  >
                    <img
                      src={
                        land.image_url ||
                        "https://via.placeholder.com/400x250"
                      }
                      alt={land.title}
                      style={{
                        width: "100%",
                        height: "clamp(190px,22vw,230px)",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>

                  <div
                    className="home-land-details"
                    style={{
                      padding: "20px 20px 22px",
                    }}
                  >
                    <h3
                      style={{
                        marginBottom: "10px",
                        color: "#1B5E20",
                        fontSize: "20px",
                        lineHeight: "1.3",
                      }}
                    >
                      {land.title}
                    </h3>

                    <p>
                      <strong>📍</strong>{" "}
                      {land.village}, {land.district}
                    </p>

                    <p>
                      <strong>🌱 Soil:</strong>{" "}
                      {land.soil_type || "Not specified"}
                    </p>

                    <p>
                      <strong>📐 Area:</strong>{" "}
                      {land.area} Acres
                    </p>

                    <p
                      style={{
                        color: "#E65100",
                        fontWeight: "800",
                        fontSize: "21px",
                        marginTop: "12px",
                        marginBottom: "8px",
                      }}
                    >
                      ₹{land.price}
                    </p>

                    <p
                      style={{
                        color: "#777",
                        fontSize: "12px",
                        marginTop: "4px",
                      }}
                    >
                      Viewed{" "}
                      {land.viewed_at
                        ? new Date(land.viewed_at).toLocaleString()
                        : ""}
                    </p>

                    <button
                      className="home-view-button"
                      onClick={() => navigate(`/land/${land.id}`)}
                      style={{
                        marginTop: "15px",
                        width: "100%",
                        background: "#2E7D32",
                        color: "#fff",
                        border: "none",
                        padding: "12px",
                        borderRadius: "10px",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================
            RECENT ACTIVITY
        ================================================= */}

        <div
          className="home-activity"
          style={{
            marginTop: "60px",
            background: "rgba(255,255,255,.97)",
            borderRadius: "20px",
            padding: "clamp(20px,3vw,30px)",
            boxShadow:
              "0 8px 24px rgba(31,72,35,.09)",
            border: "1px solid #E3ECE4",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "15px",
              flexWrap: "wrap",
              marginBottom: "25px",
            }}
          >
            <h2
              style={{
                color: "#1B5E20",
                margin: 0,
                fontWeight: "800",
              }}
            >
              🌱 Recent Activity
            </h2>

            <button
              onClick={() =>
                navigate("/notifications")
              }
              style={{
                background: "#1976D2",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "10px 16px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              View Notifications
            </button>
          </div>

          {recentActivity.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "30px",
                color: "#777",
              }}
            >
              <FaBell
                size={40}
                color="#aaa"
              />

              <p>
                No recent activity found.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: "12px",
              }}
            >
              {recentActivity.map(
                (activity) => {
                  const clickable =
                    Boolean(
                      activity.target_type &&
                      activity.target_id
                    );

                  const activityColor =
                    getActivityColor(
                      activity.action
                    );

                  return (
                    <div
                      key={activity.id}
                      className="home-activity-row"
                      onClick={() =>
                        clickable &&
                        openActivity(
                          activity
                        )
                      }
                      style={{
                        display: "flex",
                        alignItems:
                          "center",
                        gap: "15px",
                        padding: "15px",
                        borderRadius:
                          "12px",
                        background:
                          "#F8F9FA",
                        border:
                          "1px solid #E5E5E5",
                        cursor: clickable
                          ? "pointer"
                          : "default",
                        transition:
                          "0.2s",
                      }}
                      title={
                        clickable
                          ? "Click to open"
                          : ""
                      }
                    >
                      {/* ICON */}

                      <div
                        style={{
                          minWidth: "45px",
                          width: "45px",
                          height: "45px",
                          borderRadius:
                            "50%",
                          background:
                            activityColor,
                          color: "#fff",
                          display: "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                        }}
                      >
                        {getActivityIcon(
                          activity.action
                        )}
                      </div>

                      {/* DETAILS */}

                      <div
                        style={{
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            fontWeight:
                              "bold",
                            color:
                              "#333",
                            marginBottom:
                              "5px",
                          }}
                        >
                          {activity.action
                            .replaceAll(
                              "_",
                              " "
                            )}
                        </div>

                        <div
                          style={{
                            color:
                              "#555",
                            fontSize:
                              "14px",
                          }}
                        >
                          {
                            activity.description
                          }
                        </div>

                        <small
                          style={{
                            color:
                              "#888",
                            display:
                              "block",
                            marginTop:
                              "5px",
                          }}
                        >
                          {activity.created_at
                            ? new Date(
                                activity.created_at
                              ).toLocaleString()
                            : ""}
                        </small>
                      </div>

                      {/* TARGET */}

                      {clickable && (
                        <div
                          style={{
                            color:
                              "#1976D2",
                            fontWeight:
                              "bold",
                            fontSize:
                              "13px",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          Open →
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}

          {recentActivity.length > 0 && (
            <div
              style={{
                textAlign: "center",
                marginTop: "20px",
                color: "#777",
                fontSize: "13px",
              }}
            >
              Showing your latest{" "}
              {recentActivity.length}{" "}
              activities
            </div>
          )}
        </div>

        </div>

        {showScrollTop &&
          createPortal(
            <button
              type="button"
              className="home-scroll-top"
              onClick={scrollToTop}
              aria-label="Scroll to top"
              title="Scroll to top"
            >
              ↑
            </button>,
            document.body
          )}
      </div>
    </>
  );
}

export default Home;
