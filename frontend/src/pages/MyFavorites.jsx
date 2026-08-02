import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

function MyFavorites() {
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFavorites();
  }, []);
  const fetchFavorites = async () => {
  try {
    setLoading(true);

    const response = await api.get("/favorites");

    setFavorites(response.data);

  } catch (error) {
    console.error(error);
    alert("Failed to load favorites");
  } finally {
    setLoading(false);
  }
};
const removeFavorite = async (landId) => {

  if (!window.confirm("Remove this land from favorites?")) {
    return;
  }

  try {

    setRemovingId(landId);

    await api.delete(`/favorites/${landId}`);

    alert("Removed from favorites.");

    fetchFavorites();

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
if (loading) {
  return (
    <>
      <Navbar />

      <div
        style={{
          textAlign: "center",
          marginTop: "80px",
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


  return (
    <>
      <Navbar />

      <div style={{ maxWidth: "900px", margin: "30px auto" }}>
        <h2>❤️ My Favorites</h2>

        {favorites.length === 0 ? (
          <p>No favorite lands yet.</p>
        ) : (
          favorites.map((land) => (
            <div
              key={land.favorite_id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "20px",
                marginBottom: "20px",
                background: "#fff",
              }}
            >
              {land.image_url && (
                <img
                  src={land.image_url}
                  alt={land.title}
                   style={{
                     width: "100%",
                      height: "220px",
                      objectFit: "cover",
                      borderRadius: "10px",
                      marginBottom: "15px",
                    }}
                  />  
                )}

              <h3>{land.title}</h3>

              <p><strong>Price:</strong> ₹{land.price}</p>
              <p><strong>Area:</strong> {land.area} Acres</p>
              <p><strong>Village:</strong> {land.village}</p>
              <p><strong>District:</strong> {land.district}</p>

              <div style={{ marginTop: "15px" }}>
                <button
                  onClick={() => navigate(`/land/${land.land_id}`)}
                  style={{
                    marginRight: "10px",
                    padding: "10px 15px",
                    background: "#1976D2",
                    color: "#fff",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  View Details
                </button>

                <button
                  onClick={() => removeFavorite(land.land_id)}
                  style={{
                    padding: "10px 15px",
                    background: "#D32F2F",
                    color: "#fff",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

export default MyFavorites;