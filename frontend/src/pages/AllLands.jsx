import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

function AllLands() {
  const navigate = useNavigate();

  const [lands, setLands] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchLands();
  }, []);

  const fetchLands = async () => {
    try {
      const response = await api.get("/lands");
      setLands(response.data);
    } catch (error) {
      console.log(error);
      alert("Failed to load lands.");
    }
  };

  const filteredLands = lands.filter((land) => {
    const value = search.toLowerCase();

    return (
      land.title.toLowerCase().includes(value) ||
      land.village.toLowerCase().includes(value) ||
      land.district.toLowerCase().includes(value)
    );
  });

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
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => navigate("/home")}
            style={{
              backgroundColor: "#1565C0",
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
              backgroundColor: "#2E7D32",
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
            placeholder="Search by title, village or district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              minWidth: "250px",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid gray",
            }}
          />
        </div>

        {filteredLands.length === 0 ? (
          <h2>No lands found.</h2>
        ) : (
          filteredLands.map((land) => (
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
    transition: "0.3s",
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
                <strong>Survey Number:</strong> {land.survey_number}
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
            </div>
          ))
        )}
      </div>
    </>
  );
}

export default AllLands;