import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

function AllLands() {
  const navigate = useNavigate();

  const [lands, setLands] = useState([]);

  const [district, setDistrict] = useState("");
  const [village, setVillage] = useState("");
  const [cropType, setCropType] = useState("");

  useEffect(() => {
    fetchLands();
  }, [district, village, cropType]);

  const fetchLands = async () => {
    try {
      const response = await api.get("/lands/search", {
        params: {
          district: district || undefined,
          village: village || undefined,
          crop_type: cropType || undefined,
        },
      });

      console.log("Search Response:", response.data);

      setLands(response.data);
    } catch (error) {
      console.log("Full Error:", error);

      if (error.response) {
        console.log("Status:", error.response.status);
        console.log("Response:", error.response.data);
      }

      alert("Failed to load lands.");
    }
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
        <h1 style={{ color: "#2E7D32" }}>🌾 Available Lands</h1>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "20px",
          }}
        >
          <button
            onClick={() => navigate("/home")}
            style={{
              background: "#1565C0",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            ← Home
          </button>

          <button
            onClick={fetchLands}
            style={{
              background: "#2E7D32",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>

          <input
            type="text"
            placeholder="District"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            style={{
              flex: 1,
              minWidth: "180px",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid gray",
            }}
          />

          <input
            type="text"
            placeholder="Village"
            value={village}
            onChange={(e) => setVillage(e.target.value)}
            style={{
              flex: 1,
              minWidth: "180px",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid gray",
            }}
          />

          <input
            type="text"
            placeholder="Crop Type"
            value={cropType}
            onChange={(e) => setCropType(e.target.value)}
            style={{
              flex: 1,
              minWidth: "180px",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid gray",
            }}
          />
        </div>

        {lands.length === 0 ? (
          <h2>No lands found.</h2>
        ) : (
          lands.map((land) => (
            <div
              key={land.id}
              onClick={() => navigate(`/land/${land.id}`)}
              style={{
                background: "white",
                borderRadius: "10px",
                padding: "20px",
                marginBottom: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                cursor: "pointer",
              }}
            >
              <h2>{land.title}</h2>

              {land.image_url && (
                <img
                  src={land.image_url}
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

              <p><strong>Description:</strong> {land.description}</p>
              <p><strong>Price:</strong> ₹{land.price}</p>
              <p><strong>Area:</strong> {land.area} Acres</p>
              <p><strong>Village:</strong> {land.village}</p>
              <p><strong>Mandal:</strong> {land.mandal}</p>
              <p><strong>District:</strong> {land.district}</p>
              <p><strong>State:</strong> {land.state}</p>
              <p><strong>Pincode:</strong> {land.pincode}</p>
              <p><strong>Survey Number:</strong> {land.survey_number}</p>
              <p><strong>Soil Type:</strong> {land.soil_type}</p>
              <p><strong>Water Source:</strong> {land.water_source}</p>
              <p><strong>Crop Type:</strong> {land.crop_type}</p>
            </div>
          ))
        )}
      </div>
    </>
  );
}

export default AllLands;