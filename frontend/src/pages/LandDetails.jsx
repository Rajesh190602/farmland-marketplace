import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import LandMap from "../components/LandMap";
import api from "../services/api";

const API = "https://farmland-backend-ncnk.onrender.com";

function LandDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [land, setLand] = useState(null);

  useEffect(() => {
    fetchLand();
  }, []);

  const fetchLand = async () => {
    try {
      const response = await api.get(`/lands/${id}`);
      setLand(response.data);
    } catch (error) {
      console.log(error);
      alert("Failed to load land details.");
    }
  };

  const startChat = async () => {
    try {
      const response = await api.post("/chat/start", {
        land_id: land.id,
      });

      navigate(`/chat/${response.data.conversation_id}`);
    } catch (error) {
      console.log(error);

      alert(
        error.response?.data?.detail ||
          "Unable to start conversation."
      );
    }
  };

  if (!land) {
    return (
      <>
        <Navbar />
        <h2 style={{ textAlign: "center", marginTop: "50px" }}>
          Loading...
        </h2>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div
        style={{
          maxWidth: "900px",
          margin: "30px auto",
          background: "white",
          padding: "25px",
          borderRadius: "10px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
        }}
      >
        {land.image_url && (
          <img
            src={`${API}${land.image_url}`}
            alt={land.title}
            style={{
              width: "100%",
              height: "400px",
              objectFit: "cover",
              borderRadius: "10px",
            }}
          />
        )}

        <h1>{land.title}</h1>

        <h2 style={{ color: "green" }}>₹ {land.price}</h2>

        <p>
          <strong>Description:</strong> {land.description}
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

        <hr />

        <h2>📍 Land Location</h2>

        <p>
          <strong>Latitude:</strong> {land.latitude}
        </p>

        <p>
          <strong>Longitude:</strong> {land.longitude}
        </p>

        {land.latitude && land.longitude && (
          <>
            <LandMap
              latitude={Number(land.latitude)}
              longitude={Number(land.longitude)}
              title={land.title}
            />

            <br />

            <a
              href={`https://www.google.com/maps?q=${land.latitude},${land.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                background: "#4285F4",
                color: "white",
                padding: "12px 20px",
                borderRadius: "6px",
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              📍 Open in Google Maps
            </a>
          </>
        )}

        <hr />

        <h2>Seller Details</h2>

        <p>
          <strong>Name:</strong> {land.owner_name}
        </p>

        <p>
          <strong>Mobile:</strong> {land.owner_mobile}
        </p>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginTop: "20px",
          }}
        >
          <a
            href={`tel:${land.owner_mobile}`}
            style={{
              background: "#2E7D32",
              color: "white",
              padding: "10px 20px",
              textDecoration: "none",
              borderRadius: "5px",
            }}
          >
            📞 Call Seller
          </a>

          <a
            href={`https://wa.me/91${land.owner_mobile}`}
            target="_blank"
            rel="noreferrer"
            style={{
              background: "#25D366",
              color: "white",
              padding: "10px 20px",
              textDecoration: "none",
              borderRadius: "5px",
            }}
          >
            💬 WhatsApp
          </a>

          <button
            onClick={startChat}
            style={{
              background: "#1976D2",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            💬 Chat with Seller
          </button>
        </div>

        <button
          onClick={() => navigate("/all-lands")}
          style={{
            marginTop: "30px",
            padding: "12px 25px",
            background: "#2E7D32",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          ⬅ Back
        </button>
      </div>
    </>
  );
}

export default LandDetails;