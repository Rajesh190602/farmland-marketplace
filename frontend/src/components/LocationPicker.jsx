import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useState } from "react";
import "leaflet/dist/leaflet.css";

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position ? <Marker position={position} /> : null;
}

function LocationPicker({ latitude, longitude, setLatitude, setLongitude }) {
  const [position, setPosition] = useState(
    latitude && longitude
      ? { lat: latitude, lng: longitude }
      : { lat: 17.9784, lng: 79.5941 } // Warangal
  );

  return (
    <div>
      <h3>Select Land Location</h3>

      <MapContainer
        center={position}
        zoom={13}
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

        <LocationMarker
          position={position}
          setPosition={(pos) => {
            setPosition(pos);
            setLatitude(pos.lat);
            setLongitude(pos.lng);
          }}
        />
      </MapContainer>

      <br />

      <p>
        <strong>Latitude:</strong>{" "}
        {latitude ? latitude.toFixed(6) : "Not Selected"}
      </p>

      <p>
        <strong>Longitude:</strong>{" "}
        {longitude ? longitude.toFixed(6) : "Not Selected"}
      </p>
    </div>
  );
}

export default LocationPicker;