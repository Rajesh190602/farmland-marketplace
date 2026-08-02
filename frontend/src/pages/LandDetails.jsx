import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import LandMap from "../components/LandMap";
import api from "../services/api";


function LandDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [land, setLand] = useState(null);

  useEffect(() => {
  fetchLand();
}, [id]);

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
  const addFavorite = async () => {
  try {
    await api.post(`/favorites/${land.id}`);

    alert("Land added to Favorites.");

  } catch (error) {
    alert(
      error.response?.data?.detail ||
      "Unable to add favorite."
    );
  }
};

  if (!land) {
  return (
    <>
      <Navbar />

      <div
        style={{
          minHeight: "100vh",
          background: "#F4F7F8",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: "50px",
            borderRadius: "20px",
            boxShadow: "0 12px 35px rgba(0,0,0,.15)",
            textAlign: "center",
             width: "360px"
          }}
        >
          <h1
            style={{
              color: "#2E7D32",
              marginBottom: "10px",
            }}
          >
            🌾
          </h1>

          <h2
            style={{
              color: "#2E7D32",
              marginBottom: "10px",
            }}
          >
            🌾 Loading Land Details...
          </h2>

          <p style={{
              color: "#666",
              marginBottom: 0,
            }}
          > Please wait while we load the property.</p>
        </div>
      </div>
    </>
  );
}



  
  return (
    <>
      <Navbar />
      <div
  style={{
    maxWidth: "1200px",
    margin: "40px auto",
    background: "#fff",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(0,0,0,.15)",
  }}
>
      
        {land.image_url && (

          
          <img
            src={land.image_url}
            alt={land.title}
            style={{
              width: "100%",
              height: "520px",
              objectFit: "cover",
            }}
          />
        )}
        <div
  style={{
    padding: "35px",
    paddingBottom: "10px",
  }}
>
  <h1
    style={{
      margin: 0,
      fontSize: "40px",
      color: "#2E7D32",
    }}
  >
    🌾 {land.title}
  </h1>

  <div
    style={{
      marginTop: "20px",
      display: "inline-block",
      background: "#E8F5E9",
      color: "#2E7D32",
      padding: "12px 25px",
      borderRadius: "30px",
      fontWeight: "bold",
      fontSize: "30px",
    }}
  >
    💰 ₹ {land.price}
  </div>
  <div
  style={{
    display: "flex",
    gap: "15px",
    flexWrap: "wrap",
    marginTop: "25px",
    marginBottom: "35px",
  }}
>
  <span style={badgeStyle}>
    🌱 {land.crop_type}
  </span>

  <span style={badgeStyle}>
    📏 {land.area} Acres
  </span>

  <span style={badgeStyle}>
    🌍 {land.soil_type}
  </span>

  <span style={badgeStyle}>
    💧 {land.water_source}
  </span>
</div>



        
         
        <div

  style={{
    background: "#FFFFFF",
    padding: "25px",
    marginTop: "20px",
    borderRadius: "15px",
    boxShadow: "0 5px 20px rgba(0,0,0,.08)",
    lineHeight: "30px",
  }}
>
  <h2
    style={{
      color: "#2E7D32",
      marginBottom: "20px",
    }}
  >
    📋 Property Information
  </h2>

  <p><strong>📝 Description:</strong> {land.description}</p>

  <p><strong>📏 Area:</strong> {land.area} Acres</p>

  <p><strong>🌱 Crop Type:</strong> {land.crop_type}</p>

  <p><strong>🌍 Soil Type:</strong> {land.soil_type}</p>

  <p><strong>💧 Water Source:</strong> {land.water_source}</p>

  <hr />

  <p><strong>📍 Village:</strong> {land.village}</p>

  <p><strong>🏛 Mandal:</strong> {land.mandal}</p>

  <p><strong>🏙 District:</strong> {land.district}</p>

  <p><strong>🌎 State:</strong> {land.state}</p>

  <p><strong>📮 Pincode:</strong> {land.pincode}</p>

  <p><strong>📑 Survey Number:</strong> {land.survey_number}</p>
</div>

       <div
  style={{
    background: "#FFFFFF",
    marginTop: "30px",
    padding: "25px",
    borderRadius: "15px",
    boxShadow: "0 5px 20px rgba(0,0,0,.08)",
  }}
>
  <h2
    style={{
      color: "#2E7D32",
      marginBottom: "20px",
    }}
  >
    📍 Land Location
  </h2>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "15px",
      marginBottom: "20px",
    }}
  >
    <div>
      <strong>Latitude</strong>
      <br />
      {land.latitude}
    </div>

    <div>
      <strong>Longitude</strong>
      <br />
      {land.longitude}
    </div>
  </div>

  {land.latitude && land.longitude && (
    <>
      <LandMap
        latitude={Number(land.latitude)}
        longitude={Number(land.longitude)}
        title={land.title}
      />

      <div
        style={{
          marginTop: "20px",
        }}
      >
        <a
          href={`https://www.google.com/maps?q=${land.latitude},${land.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            background: "#1976D2",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          📍 Open in Google Maps
        </a>
      </div>
    </>
  )}
</div>

        <div
  style={{
    background: "#FFFFFF",
    marginTop: "30px",
    padding: "25px",
    borderRadius: "15px",
    boxShadow: "0 5px 20px rgba(0,0,0,.08)",
  }}
>
  <h2
    style={{
      color: "#2E7D32",
      marginBottom: "20px",
    }}
  >
    👤 Seller Information
  </h2>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "20px",
      marginBottom: "25px",
    }}
  >
    <div>
      <strong>Seller Name</strong>
      <br />
      {land.owner_name}
    </div>

    <div>
      <strong>Mobile Number</strong>
      <br />
      {land.owner_mobile}
    </div>
  </div>

  <div
    style={{
      
      display:"grid",
      gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",
      gap:"15px"
      
    }}
  >
    <a
      href={`tel:${land.owner_mobile}`}
      style={{
        background: "#2E7D32",
        color: "#fff",
        padding: "12px 20px",
        borderRadius: "8px",
        textDecoration: "none",
        fontWeight: "bold",
      }}
    >
      📞 Call
    </a>

    <a
      href={`https://wa.me/91${land.owner_mobile}`}
      target="_blank"
      rel="noreferrer"
      style={{
        background: "#25D366",
        color: "#fff",
        padding: "12px 20px",
        borderRadius: "8px",
        textDecoration: "none",
        fontWeight: "bold",
      }}
    >
      💬 WhatsApp
    </a>

    <button
      onClick={startChat}
      style={{
        background: "#1976D2",
        color: "#fff",
        padding: "12px 20px",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "bold",
      }}
    >
      💬 Chat
    </button>

    <button
      onClick={addFavorite}
      style={{
        background: "#E91E63",
        color: "#fff",
        padding: "12px 20px",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "bold",
      }}
    >
      ❤️ Favorite
    </button>

    <button
      onClick={() => {
        if (navigator.share) {
          navigator.share({
            title: land.title,
            text: land.description,
            url: window.location.href,
          });
        } 
        try {
          

           navigator.clipboard.writeText(window.location.href);
           alert("Link copied!");
        }
       catch {
        

        alert("Sharing is not supported.");
       }

      }}
      style={{
        background: "#FF9800",
        color: "#fff",
        padding: "12px 20px",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "bold",
      }}
    >
      📤 Share
    </button>
  </div>
</div>
        <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "35px",
    flexWrap: "wrap",
    gap: "15px",
  }}
>
  <button
    onClick={() => navigate("/all-lands")}
    style={{
      background: "#424242",
      color: "#fff",
      padding: "14px 28px",
      border: "none",
      borderRadius: "10px",
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: "16px",
    }}
  >
    ⬅ Back to Marketplace
  </button>

  <div
    style={{
      color: "#666",
      fontSize: "14px",
    }}
  >
    🌾 Thank you for using Farmland Marketplace
  </div>
</div>
      </div>
      </div>
    </>
  );
}
const badgeStyle = {
  background: "#E8F5E9",
  color: "#2E7D32",
  padding: "8px 18px",
  borderRadius: "25px",
  fontWeight: "bold",
  fontSize: "16px",
};

export default LandDetails;