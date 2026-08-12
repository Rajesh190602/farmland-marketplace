import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix Leaflet marker icons in React/Vite
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function LandMap({ latitude, longitude, title }) {
  if (latitude == null || longitude == null) {
    return (
      <div
        style={{
          padding: "20px",
          background: "#F5F5F5",
          borderRadius: "10px",
          textAlign: "center",
        }}
      >
        <p>📍 Location not available.</p>
      </div>
    );
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return (
      <div
        style={{
          padding: "20px",
          background: "#F5F5F5",
          borderRadius: "10px",
          textAlign: "center",
        }}
      >
        <p>📍 Invalid land location.</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      scrollWheelZoom={true}
      style={{
        height: "400px",
        width: "100%",
        borderRadius: "10px",
        border: "1px solid #ddd",
      }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={[lat, lng]}>
        <Popup>
          <strong>{title}</strong>
          <br />
          Latitude: {lat.toFixed(6)}
          <br />
          Longitude: {lng.toFixed(6)}
        </Popup>
      </Marker>
    </MapContainer>
  );
}

export default LandMap;