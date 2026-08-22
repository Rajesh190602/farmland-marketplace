import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaHeart,
  FaMapMarkerAlt,
  FaRulerCombined,
  FaSeedling,
  FaEye,
  FaTrash,
  FaSync,
} from "react-icons/fa";

import Navbar from "../components/Navbar";
import api from "../services/api";

function MyFavorites() {
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [favorites, setFavorites] = useState([]);

  const navigate = useNavigate();

  // =====================================================
  // LOAD FAVORITES
  // =====================================================

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setLoading(true);

      const response = await api.get("/favorites/");

      setFavorites(response.data || []);

    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.detail ||
        "Failed to load favorites"
      );

    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // REMOVE FAVORITE
  // =====================================================

  const removeFavorite = async (landId) => {
    if (
      !window.confirm(
        "Remove this land from favorites?"
      )
    ) {
      return;
    }

    try {
      setRemovingId(landId);

      await api.delete(
        `/favorites/${landId}`
      );

      // Immediately remove from UI
      setFavorites((previous) =>
        previous.filter(
          (land) => land.land_id !== landId
        )
      );

    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.detail ||
        "Failed to remove favorite"
      );

    } finally {
      setRemovingId(null);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <>
        <Navbar />

        <div
          style={{
            minHeight: "70vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "24px",
            color: "#2E7D32",
            fontWeight: "bold",
          }}
        >
          Loading Favorites...
        </div>
      </>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <>
      <Navbar />

      <div
        style={{
          minHeight: "100vh",
          background: "#F5F7FA",
          padding: "30px 20px",
        }}
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto 30px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "15px",
          }}
        >
          <div>
            <h1
              style={{
                color: "#2E7D32",
                margin: 0,
              }}
            >
              ❤️ My Favorites
            </h1>

            <p
              style={{
                color: "#666",
                marginTop: "8px",
              }}
            >
              Your saved farmland listings
            </p>
          </div>

          <button
            onClick={fetchFavorites}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#1976D2",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "11px 18px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            <FaSync />
            Refresh
          </button>
        </div>

        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {favorites.length === 0 ? (
          <div
            style={{
              maxWidth: "650px",
              margin: "80px auto",
              background: "#fff",
              borderRadius: "18px",
              padding: "50px 30px",
              textAlign: "center",
              boxShadow:
                "0 6px 18px rgba(0,0,0,0.10)",
            }}
          >
            <FaHeart
              size={65}
              color="#D81B60"
            />

            <h2
              style={{
                marginTop: "20px",
                color: "#333",
              }}
            >
              No Favorite Lands Yet
            </h2>

            <p
              style={{
                color: "#777",
                marginTop: "10px",
              }}
            >
              Browse farmland listings and click
              the ❤️ button to save them here.
            </p>

            <button
              onClick={() =>
                navigate("/all-lands")
              }
              style={{
                marginTop: "25px",
                background: "#2E7D32",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "13px 25px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Browse Lands
            </button>
          </div>
        ) : (

          /* =================================================
             FAVORITE CARDS
          ================================================= */

          <div
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "25px",
            }}
          >
            {favorites.map((land) => (
              <div
                key={land.favorite_id}
                style={{
                  background: "#fff",
                  borderRadius: "18px",
                  overflow: "hidden",
                  boxShadow:
                    "0 6px 18px rgba(0,0,0,0.12)",
                }}
              >

                {/* IMAGE */}

                <div
                  style={{
                    position: "relative",
                  }}
                >
                  <img
                    src={
                      land.image_url ||
                      "https://via.placeholder.com/500x300"
                    }
                    alt={land.title}
                    style={{
                      width: "100%",
                      height: "220px",
                      objectFit: "cover",
                    }}
                  />

                  <div
                    style={{
                      position: "absolute",
                      top: "12px",
                      right: "12px",
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      background:
                        "rgba(255,255,255,0.95)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow:
                        "0 3px 10px rgba(0,0,0,0.25)",
                    }}
                  >
                    <FaHeart
                      size={22}
                      color="#E91E63"
                    />
                  </div>
                </div>

                {/* DETAILS */}

                <div
                  style={{
                    padding: "20px",
                  }}
                >
                  <h2
                    style={{
                      marginTop: 0,
                      color: "#2E7D32",
                      marginBottom: "15px",
                    }}
                  >
                    {land.title}
                  </h2>

                  <p
                    style={{
                      color: "#555",
                    }}
                  >
                    <FaMapMarkerAlt
                      color="#E53935"
                    />{" "}
                    {land.village},{" "}
                    {land.district},{" "}
                    {land.state}
                  </p>

                  <p
                    style={{
                      color: "#555",
                    }}
                  >
                    <FaRulerCombined
                      color="#EF6C00"
                    />{" "}
                    {land.area} Acres
                  </p>

                  <p
                    style={{
                      color: "#555",
                    }}
                  >
                    <FaSeedling
                      color="#2E7D32"
                    />{" "}
                    Soil:{" "}
                    {land.soil_type ||
                      "Not specified"}
                  </p>

                  <p
                    style={{
                      color: "#E65100",
                      fontSize: "22px",
                      fontWeight: "bold",
                      marginTop: "15px",
                    }}
                  >
                    ₹{land.price}
                  </p>

                  {/* BUTTONS */}

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginTop: "20px",
                    }}
                  >
                    <button
                      onClick={() =>
                        navigate(
                          `/land/${land.land_id}`
                        )
                      }
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                          "center",
                        gap: "7px",
                        background: "#2E7D32",
                        color: "#fff",
                        border: "none",
                        borderRadius: "9px",
                        padding: "12px",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      <FaEye />
                      View Details
                    </button>

                    <button
                      onClick={() =>
                        removeFavorite(
                          land.land_id
                        )
                      }
                      disabled={
                        removingId ===
                        land.land_id
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                          "center",
                        gap: "7px",
                        background: "#D32F2F",
                        color: "#fff",
                        border: "none",
                        borderRadius: "9px",
                        padding: "12px 15px",
                        cursor:
                          removingId ===
                          land.land_id
                            ? "not-allowed"
                            : "pointer",
                        fontWeight: "bold",
                        opacity:
                          removingId ===
                          land.land_id
                            ? 0.6
                            : 1,
                      }}
                    >
                      <FaTrash />

                      {removingId ===
                      land.land_id
                        ? "Removing..."
                        : "Remove"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default MyFavorites;