import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

function MyLands() {
  const [lands, setLands] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyLands();
  }, []);

  const fetchMyLands = async () => {
    try {
      const response = await api.get("/lands/my/lands");
      setLands(response.data);
    } catch (error) {
      console.log(error);
      alert("Failed to load your lands.");
    }
  };

  const deleteLand = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this land?"
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`/lands/${id}`);

      alert("Land deleted successfully.");

      fetchMyLands();
    } catch (error) {
      console.log(error);
      alert("Failed to delete land.");
    }
  };

  const editLand = (id) => {
    navigate(`/edit-land/${id}`);
  };

  return (
    <>
      <Navbar />

      <div
        style={{
          padding: "30px",
          backgroundColor: "#f4f4f4",
          minHeight: "100vh",
        }}
      >
        <h1 style={{ color: "#2E7D32" }}>🌾 My Lands</h1>

        <button
          onClick={() => navigate("/home")}
          style={{
            backgroundColor: "#1565C0",
            color: "white",
            padding: "10px 20px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            marginBottom: "20px",
          }}
        >
          ← Back to Home
        </button>

        {lands.length === 0 ? (
          <h2>No lands found.</h2>
        ) : (
          lands.map((land) => (
            <div
              key={land.id}
              style={{
                background: "white",
                borderRadius: "10px",
                padding: "20px",
                marginBottom: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            >
              <h2>{land.title}</h2>
              {land.image_url && (
  <img
    src={`http://127.0.0.1:8000${land.image_url}`}
    alt={land.title}
    style={{
      width: "100%",
      maxHeight: "250px",
      objectFit: "cover",
      borderRadius: "10px",
      marginBottom: "15px",
    }}
  />
)}

              <p>
                <strong>Description:</strong> {land.description}
              </p>

              <p>
                <strong>Price:</strong> ₹{land.price}
              </p>

              <p>
                <strong>Area:</strong> {land.area} Acres
              </p>

              <p>
                <strong>Village:</strong> {land.village}
              </p>

              <p>
                <strong>Mandal:</strong> {land.mandal}
              </p>

              <p>
                <strong>District:</strong> {land.district}
              </p>

              <p>
                <strong>State:</strong> {land.state}
              </p>

              <p>
                <strong>Pincode:</strong> {land.pincode}
              </p>

              <p>
                <strong>Survey No:</strong> {land.survey_number}
              </p>

              <p>
                <strong>Soil Type:</strong> {land.soil_type}
              </p>

              <p>
                <strong>Water Source:</strong> {land.water_source}
              </p>

              <p>
                <strong>Crop Type:</strong> {land.crop_type}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginTop: "20px",
                }}
              >
                <button
                  onClick={() => editLand(land.id)}
                  style={{
                    backgroundColor: "green",
                    color: "white",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  Edit
                </button>

                <button
                  onClick={() => deleteLand(land.id)}
                  style={{
                    backgroundColor: "red",
                    color: "white",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

export default MyLands;