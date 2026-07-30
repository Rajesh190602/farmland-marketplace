import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

function MyFavorites() {
  const [favorites, setFavorites] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const response = await api.get("/favorites");
      setFavorites(response.data);
    } catch (error) {
      console.error(error);
      alert("Failed to load favorites");
    }
  };

  const removeFavorite = async (landId) => {
    try {
      await api.delete(`/favorites/${landId}`);
      fetchFavorites();
    } catch (error) {
      console.error(error);
      alert("Failed to remove favorite");
    }
  };

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