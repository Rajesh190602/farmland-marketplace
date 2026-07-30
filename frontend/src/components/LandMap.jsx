import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

function LandMap({ latitude, longitude, title }) {
  if (!latitude || !longitude) {
    return <p>Location not available.</p>;
  }

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={15}
      style={{
        height: "400px",
        width: "100%",
        borderRadius: "10px",
      }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={[latitude, longitude]}>
        <Popup>{title}</Popup>
      </Marker>
    </MapContainer>
  );
}

export default LandMap;