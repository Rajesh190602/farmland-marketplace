import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

  const userName =
    sessionStorage.getItem("full_name") || "Farmer";

  const userRole =
    sessionStorage.getItem("role") || "";

  const [featuredLands, setFeaturedLands] = useState([]);

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
    fetchFeaturedLands();
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
      const response = await api.get(
        "/dashboard"
      );

      setStats({
        total_users:
          response.data.total_users || 0,

        total_lands:
          response.data.total_lands || 0,

        my_lands:
          response.data.my_lands || 0,

        favorites:
          response.data.favorites || 0,

        chats:
          response.data.chats || 0,

        notifications:
          response.data.notifications || 0,
      });

      // Recent Activity
      setRecentActivity(
        response.data.recent_activity || []
      );
    } catch (error) {
      console.log(error);
    }
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
  // STYLES
  // =====================================================

  const cardStyle = {
    background: "#fff",
    borderRadius: "15px",
    padding: "25px",
    boxShadow:
      "0 6px 18px rgba(0,0,0,0.12)",
    textAlign: "center",
    flex: "1",
    minWidth: "180px",
  };

  const dashboardCardStyle = {
    ...cardStyle,
    border: "none",
    width: "100%",
    fontFamily: "inherit",
    boxSizing: "border-box",
    transition:
      "transform 0.2s ease, box-shadow 0.2s ease",
  };

  const quickButton = (color) => ({
    background: color,
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "15px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    width: "100%",
    maxWidth: "280px",
  });

  // =====================================================
  // UI
  // =====================================================

  return (
    <>
      {/* IMPORTANT:
          Navbar and hamburger menu are unchanged.
      */}
      <Navbar />

      <div
        style={{
          minHeight: "100vh",
          background: "#F5F7FA",
          padding: "25px",
        }}
      >
        {/* =================================================
            WELCOME
        ================================================= */}

        <div
          style={{
            background:
              "linear-gradient(135deg,#2E7D32,#43A047)",
            color: "#fff",
            borderRadius: "20px",
            padding: "24px",
            marginBottom: "35px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize:
                "clamp(28px, 5vw, 38px)",
            }}
          >
            🌾 Farmland Marketplace
          </h1>

          <h2
            style={{
              marginTop: "15px",
            }}
          >
            Welcome Back, {userName}! 👋
          </h2>

          <p
            style={{
              fontSize:
                "clamp(15px, 2.5vw, 18px)",
              marginTop: "10px",
            }}
          >
            Manage your farmland, connect with
            buyers, and grow your farming business.
          </p>
        </div>

        {/* =================================================
            STATISTICS
        ================================================= */}

        <h2
          style={{
            marginBottom: "20px",
            color: "#2E7D32",
          }}
        >
          Dashboard Overview
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(220px,1fr))",
            gap: "20px",
          }}
        >
          {/* TOTAL USERS */}
          <button
            type="button"
            disabled={userRole !== "admin"}
            onClick={() => {
              if (userRole === "admin") {
                navigate("/admin/users");
              }
            }}
            style={{
              ...dashboardCardStyle,
              cursor:
                userRole === "admin"
                  ? "pointer"
                  : "default",
              opacity:
                userRole === "admin"
                  ? 1
                  : 0.75,
            }}
          >
            <FaUsers
              size={42}
              color="#1565C0"
            />

            <h3>Total Users</h3>

            <h1>{stats.total_users}</h1>

            {userRole === "admin" && (
              <div
                style={{
                  marginTop: "10px",
                  color: "#1565C0",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                Manage Users →
              </div>
            )}
          </button>

          {/* TOTAL LANDS */}
          <button
            type="button"
            onClick={() => {
              if (userRole === "farmer") {
                navigate("/my-lands");
              } else {
                navigate("/all-lands");
              }
            }}
            style={{
              ...dashboardCardStyle,
              cursor: "pointer",
            }}
          >
            <FaSeedling
              size={42}
              color="#2E7D32"
            />

            <h3>Total Lands</h3>

            <h1>{stats.total_lands}</h1>

            <div
              style={{
                marginTop: "10px",
                color: "#2E7D32",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              {userRole === "farmer"
                ? "View My Lands →"
                : "Browse Lands →"}
            </div>
          </button>

          {/* MY LANDS */}
          <button
            type="button"
            onClick={() =>
              navigate("/my-lands")
            }
            style={{
              ...dashboardCardStyle,
              cursor: "pointer",
            }}
          >
            <FaMapMarkedAlt
              size={42}
              color="#EF6C00"
            />

            <h3>My Lands</h3>

            <h1>{stats.my_lands}</h1>

            <div
              style={{
                marginTop: "10px",
                color: "#EF6C00",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              View My Lands →
            </div>
          </button>

          {/* FAVORITES */}
          <button
            type="button"
            onClick={() =>
              navigate("/favorites")
            }
            style={{
              ...dashboardCardStyle,
              cursor: "pointer",
            }}
          >
            <FaHeart
              size={42}
              color="#D81B60"
            />

            <h3>Favorites</h3>

            <h1>{stats.favorites}</h1>

            <div
              style={{
                marginTop: "10px",
                color: "#D81B60",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              View Favorites →
            </div>
          </button>

          {/* CHATS */}
          <button
            type="button"
            onClick={() =>
              navigate("/my-chats")
            }
            style={{
              ...dashboardCardStyle,
              cursor: "pointer",
            }}
          >
            <FaComments
              size={42}
              color="#6A1B9A"
            />

            <h3>Chats</h3>

            <h1>{stats.chats}</h1>

            <div
              style={{
                marginTop: "10px",
                color: "#6A1B9A",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              Open Chats →
            </div>
          </button>

          {/* NOTIFICATIONS */}
          <button
            type="button"
            onClick={() =>
              navigate("/notifications")
            }
            style={{
              ...dashboardCardStyle,
              cursor: "pointer",
            }}
          >
            <FaBell
              size={42}
              color="#F9A825"
            />

            <h3>Notifications</h3>

            <h1>{stats.notifications}</h1>

            <div
              style={{
                marginTop: "10px",
                color: "#F9A825",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              View Notifications →
            </div>
          </button>
        </div>

        {/* =================================================
            QUICK ACTIONS
        ================================================= */}

        <h2
          style={{
            marginTop: "50px",
            color: "#2E7D32",
          }}
        >
          Quick Actions
        </h2>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "20px",
            marginTop: "25px",
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
            style={{
              ...quickButton("#EF6C00"),
              opacity: userRole === "farmer" ? 0.5 : 1,
              cursor:
                userRole === "farmer"
                  ? "not-allowed"
                  : "pointer",
            }}
            disabled={userRole === "farmer"}
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

        <div
          style={{
            marginTop: "60px",
          }}
        >
          <h2
            style={{
              color: "#2E7D32",
              marginBottom: "25px",
              textAlign: "center",
            }}
          >
            ⭐ Featured Lands
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(300px,1fr))",
              gap: "25px",
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
                  style={{
                    background: "#fff",
                    borderRadius: "18px",
                    overflow: "hidden",
                    boxShadow:
                      "0 8px 20px rgba(0,0,0,.12)",
                    transition: ".3s",
                    position: "relative",
                  }}
                >
                  {/* LAND IMAGE */}

                  <div
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
                        height: "220px",
                        objectFit: "cover",
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
                    style={{
                      padding: "20px",
                    }}
                  >
                    <h3
                      style={{
                        marginBottom:
                          "10px",
                        color: "#2E7D32",
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
                        fontWeight: "bold",
                        fontSize: "20px",
                      }}
                    >
                      ₹{land.price}
                    </p>

                    <button
                      disabled={userRole === "farmer"}
                      onClick={() => {
                        if (userRole !== "farmer") {
                          navigate(`/land/${land.id}`);
                        }
                      }}
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
            RECENT ACTIVITY
        ================================================= */}

        <div
          style={{
            marginTop: "60px",
            background: "#fff",
            borderRadius: "18px",
            padding: "30px",
            boxShadow:
              "0 6px 18px rgba(0,0,0,0.10)",
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
                color: "#2E7D32",
                margin: 0,
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
                borderRadius: "8px",
                padding: "9px 15px",
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
    </>
  );
}

export default Home;