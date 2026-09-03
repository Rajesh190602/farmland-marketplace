import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FaSearch,
  FaMapMarkerAlt,
  FaSeedling,
  FaRupeeSign,
  FaHeart,
  FaEye,
  FaSyncAlt,
  FaShareAlt,
  FaFilter,
} from "react-icons/fa";

import Navbar from "../components/Navbar";
import api from "../services/api";


function AllLands() {

  const navigate = useNavigate();

  const [lands, setLands] = useState([]);

  // =====================================================
  // PHASE 3 - STEP 16: SORT LANDS
  // =====================================================
  const [sortBy, setSortBy] = useState("newest");

  const [loading, setLoading] = useState(true);

  const [district, setDistrict] = useState("");

  const [village, setVillage] = useState("");

  const [cropType, setCropType] = useState("");

  const [search, setSearch] = useState("");

  useEffect(() => {

    fetchLands();

  }, [district, village, cropType]);

  const fetchLands = async () => {

    try {

      setLoading(true);

      const response = await api.get("/lands/search", {

        params: {

          district: district || undefined,

          village: village || undefined,

          crop_type: cropType || undefined,

        },

      });

      let filtered = response.data;

      if (search.trim()) {

        const keyword = search.toLowerCase();

        filtered = filtered.filter((land) =>

          land.title?.toLowerCase().includes(keyword) ||

          land.village?.toLowerCase().includes(keyword) ||

          land.district?.toLowerCase().includes(keyword) ||

          land.crop_type?.toLowerCase().includes(keyword)

        );

      }

      setLands(filtered);

    }

    catch (error) {

      console.error(error);

      alert("Failed to load lands.");

    }

    finally {

      setLoading(false);

    }

  };
  const addFavorite = async (landId) => {
  try {
    await api.post(`/favorites/${landId}`);

    alert("Added to favorites ❤️");

  } catch (error) {
    alert(
      error.response?.data?.detail ||
      "Failed to add favorite."
    );
  }
};

    // =====================================================
  // STEP 16 - SORT CURRENT LAND RESULTS
  // =====================================================
  const sortedLands = [...lands].sort((a, b) => {
    switch (sortBy) {
      case "price_low":
        return Number(a.price ?? 0) - Number(b.price ?? 0);
      case "price_high":
        return Number(b.price ?? 0) - Number(a.price ?? 0);
      case "area_low":
        return Number(a.area ?? 0) - Number(b.area ?? 0);
      case "area_high":
        return Number(b.area ?? 0) - Number(a.area ?? 0);
      case "newest":
      default:
        return Number(b.id ?? 0) - Number(a.id ?? 0);
    }
  });

  return (
    <>
      <Navbar />

      <div
        style={{
          minHeight: "100vh",
          background: "#f5f7fa",
          padding: "30px",
        }}
      >
        {/* Header */}

        <div
          style={{
            background: "linear-gradient(135deg,#2E7D32,#43A047)",
            color: "#fff",
            padding: "30px",
            borderRadius: "18px",
            marginBottom: "30px",
            boxShadow: "0 10px 25px rgba(0,0,0,.15)",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "36px",
            }}
          >
            🌾 Browse Farmlands
          </h1>

          <p
            style={{
              marginTop: "12px",
              fontSize: "18px",
              opacity: .95,
            }}
          >
            Find the perfect agricultural land directly from farmers.
          </p>
        </div>

        {/* Search & Filters */}

        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "25px",
            marginBottom: "30px",
            boxShadow: "0 5px 18px rgba(0,0,0,.10)",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#2E7D32",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <FaFilter />
            Search Filters
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(220px,1fr))",
              gap: "15px",
              marginTop: "20px",
            }}
          >
            <div style={inputContainer}>
              <FaSearch style={inputIcon} />

              <input
                type="text"
                placeholder="Search Lands..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={inputContainer}>
              <FaMapMarkerAlt style={inputIcon} />

              <input
                type="text"
                placeholder="District"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={inputContainer}>
              <FaMapMarkerAlt style={inputIcon} />

              <input
                type="text"
                placeholder="Village"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={inputContainer}>
              <FaSeedling style={inputIcon} />

              <input
                type="text"
                placeholder="Crop Type"
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "15px",
              marginTop: "20px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={fetchLands}
              style={refreshButton}
            >
              <FaSyncAlt />
              Refresh
            </button>

            <button
              onClick={() => navigate("/home")}
              style={homeButton}
            >
              ← Home
            </button>

            {/* =================================================
                STEP 16 - SORT LANDS
            ================================================= */}
            <div style={sortContainer}>
              <label htmlFor="land-sort" style={sortLabel}>
                Sort by:
              </label>

              <select
                id="land-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={sortSelect}
              >
                <option value="newest">Newest First</option>
                <option value="price_low">Price: Low → High</option>
                <option value="price_high">Price: High → Low</option>
                <option value="area_low">Area: Small → Large</option>
                <option value="area_high">Area: Large → Small</option>
              </select>
            </div>
          </div>
        </div>
                {/* ===========================
            Loading State
        =========================== */}

        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px",
            }}
          >
            <h2 style={{ color: "#2E7D32" }}>
              Loading Lands...
            </h2>
          </div>
        ) : lands.length === 0 ? (

          /* Empty State */

          <div
            style={{
              background: "#fff",
              padding: "60px",
              textAlign: "center",
              borderRadius: "18px",
              boxShadow: "0 5px 18px rgba(0,0,0,.10)",
            }}
          >
            <h1
              style={{
                fontSize: "70px",
                marginBottom: "20px",
              }}
            >
              🌾
            </h1>

            <h2>No Lands Found</h2>

            <p
              style={{
                color: "#666",
              }}
            >
              Try changing your search filters.
            </p>
          </div>

        ) : (

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(280px,1fr))",
              gap: "25px",
            }}
          >
            {sortedLands.map((land) => (

              <div
                key={land.id}
                style={cardStyle}
              >

                {/* Land Image */}

                {land.image_url ? (

                  <img
                    src={land.image_url}
                    alt={land.title}
                    style={imageStyle}
                  />

                ) : (

                  <div style={noImageStyle}>
                    No Image
                  </div>

                )}

                <div
                  style={{
                    padding: "20px",
                  }}
                >
                  {/* Title */}

                  <h2
                    style={{
                      marginTop: 0,
                      color: "#2E7D32",
                    }}
                  >
                    {land.title}
                  </h2>

                  {/* Badges */}

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                      marginBottom: "15px",
                    }}
                  >
                    <span style={cropBadge}>
                      🌱 {land.crop_type}
                    </span>

                    <span style={priceBadge}>
                      ₹ {land.price}
                    </span>
                  </div>

                  {/* Information */}

                  <p>
                    <strong>📏 Area:</strong>{" "}
                    {land.area} Acres
                  </p>

                  <p>
                    <strong>📍 Village:</strong>{" "}
                    {land.village}
                  </p>

                  <p>
                    <strong>🏛 District:</strong>{" "}
                    {land.district}
                  </p>

                  <p>
                    <strong>Description:</strong>
                  </p>

                  <p
                    style={{
                      color: "#555",
                    }}
                  >
                    {land.description}
                  </p>
                                    {/* ===========================
                      Action Buttons
                  =========================== */}

                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      flexWrap: "wrap",
                      marginTop: "20px",
                    }}
                  >
                    {/* Favorite */}

                    <button
                      style={favoriteButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        addFavorite(land.id);
                        
                      }}
                    >
                      <FaHeart />
                      Favorite
                    </button>

                    {/* Share */}

                    <button
                      style={shareButton}
                      onClick={(e) => {
                        e.stopPropagation();

                        if (navigator.share) {
                          navigator.share({
                            title: land.title,
                            text: land.description,
                            url: window.location.origin + `/lands/${land.id}`,
                          });
                        } else {
                          navigator.clipboard.writeText(
                            window.location.origin + `/lands/${land.id}`
                          );

                          alert("Land link copied.");
                        }
                      }}
                    >
                      <FaShareAlt />
                      Share
                    </button>

                    {/* View Details */}

                    <button
                      style={viewButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/lands/${land.id}`);
                      }}
                    >
                      <FaEye />
                      View Details
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
  // =======================================
// Styles
// =======================================

const sortContainer = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};

const sortLabel = {
  color: "#2E7D32",
  fontWeight: "bold",
  fontSize: "15px",
};

const sortSelect = {
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "12px 15px",
  background: "#fff",
  color: "#333",
  fontSize: "15px",
  outline: "none",
  cursor: "pointer",
  minWidth: "190px",
};

const inputContainer = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  background: "#fff",
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "0 15px",
  boxShadow: "0 2px 8px rgba(0,0,0,.08)",
};

const inputIcon = {
  color: "#2E7D32",
  fontSize: "18px",
};

const inputStyle = {
  flex: 1,
  border: "none",
  outline: "none",
  padding: "15px 0",
  fontSize: "15px",
  background: "transparent",
};

const refreshButton = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  background: "#2E7D32",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  padding: "12px 22px",
  cursor: "pointer",
  fontSize: "15px",
  fontWeight: "bold",
};

const homeButton = {
  background: "#1565C0",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  padding: "12px 22px",
  cursor: "pointer",
  fontSize: "15px",
  fontWeight: "bold",
};

const cardStyle = {
  background: "#fff",
  borderRadius: "18px",
  overflow: "hidden",
  boxShadow: "0 8px 20px rgba(0,0,0,.12)",
  transition: "0.3s",
};

const imageStyle = {
  width: "100%",
  height: "240px",
  objectFit: "cover",
};

const noImageStyle = {
  width: "100%",
  height: "240px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#EEEEEE",
  color: "#777",
  fontSize: "18px",
};

const cropBadge = {
  background: "#E8F5E9",
  color: "#2E7D32",
  padding: "6px 14px",
  borderRadius: "20px",
  fontWeight: "bold",
  fontSize: "14px",
};

const priceBadge = {
  background: "#FFF3E0",
  color: "#EF6C00",
  padding: "6px 14px",
  borderRadius: "20px",
  fontWeight: "bold",
  fontSize: "14px",
};

const favoriteButton = {
  flex: 1,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "8px",
  background: "#D81B60",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  padding: "12px",
  cursor: "pointer",
  fontWeight: "bold",
};

const shareButton = {
  flex: 1,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "8px",
  background: "#00897B",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  padding: "12px",
  cursor: "pointer",
  fontWeight: "bold",
};

const viewButton = {
  flex: 1,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "8px",
  background: "#1976D2",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  padding: "12px",
  cursor: "pointer",
  fontWeight: "bold",
};
export default AllLands;
