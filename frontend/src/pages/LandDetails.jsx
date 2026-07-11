import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

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
            src={`http://127.0.0.1:8000${land.image_url}`}
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

        <p><strong>Description:</strong> {land.description}</p>
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
        <hr />

<h2>Seller Details</h2>

<p>
  <strong>Name:</strong> {land.owner_name}
</p>

<p>
  <strong>Mobile:</strong> {land.owner_mobile}
</p>

<div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
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
</div>

        <button
          onClick={() => navigate("/all-lands")}
          style={{
            marginTop: "20px",
            padding: "12px 25px",
            background: "#2E7D32",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Back
        </button>
      </div>
    </>
  );
}

export default LandDetails;