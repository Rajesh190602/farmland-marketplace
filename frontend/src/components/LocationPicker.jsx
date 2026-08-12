import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icons in React/Vite
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Default location: Warangal
const DEFAULT_POSITION = {
  lat: 17.9784,
  lng: 79.5941,
};

// Move map when position changes
function MapController({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], 15);
    }
  }, [position, map]);

  return null;
}

// Detect map clicks
function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      });
    },
  });

  if (!position) {
    return null;
  }

  return (
    <Marker position={[position.lat, position.lng]}>
      <Popup>
        <strong>Selected Land Location</strong>
        <br />
        Latitude: {position.lat.toFixed(6)}
        <br />
        Longitude: {position.lng.toFixed(6)}
      </Popup>
    </Marker>
  );
}

function LocationPicker({
  latitude,
  longitude,
  setLatitude,
  setLongitude,
}) {
  const initialPosition =
    latitude != null && longitude != null
      ? {
          lat: Number(latitude),
          lng: Number(longitude),
        }
      : DEFAULT_POSITION;

  const [position, setPosition] = useState(initialPosition);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  // Keep local map position synchronized with parent values
  useEffect(() => {
    if (latitude != null && longitude != null) {
      setPosition({
        lat: Number(latitude),
        lng: Number(longitude),
      });
    }
  }, [latitude, longitude]);

  const selectPosition = (pos) => {
    setPosition(pos);
    setLatitude(pos.lat);
    setLongitude(pos.lng);
    setLocationError("");
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(
        "Geolocation is not supported by this browser."
      );
      return;
    }

    setLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (location) => {
        const pos = {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        };

        selectPosition(pos);
        setLocating(false);
      },
      (error) => {
        console.error("Location error:", error);

        let message = "Unable to get your location.";

        if (error.code === 1) {
          message =
            "Location permission was denied. Please allow location access in your browser.";
        } else if (error.code === 2) {
          message =
            "Your location could not be determined. Please try again.";
        } else if (error.code === 3) {
          message =
            "Location request timed out. Please try again.";
        }

        setLocationError(message);
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div
      style={{
        marginBottom: "20px",
      }}
    >
      <h3>📍 Select Land Location</h3>

      <p
        style={{
          color: "#555",
          marginBottom: "10px",
        }}
      >
        Click anywhere on the map to select the exact land
        location, or use your current location.
      </p>

      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={locating}
        style={{
          padding: "10px 16px",
          marginBottom: "12px",
          background: "#1976D2",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: locating ? "not-allowed" : "pointer",
          fontSize: "14px",
        }}
      >
        {locating
          ? "Getting Location..."
          : "📍 Use My Current Location"}
      </button>

      {locationError && (
        <p
          style={{
            color: "#D32F2F",
            background: "#FFEBEE",
            padding: "10px",
            borderRadius: "5px",
          }}
        >
          {locationError}
        </p>
      )}

      <MapContainer
        center={[position.lat, position.lng]}
        zoom={13}
        style={{
          height: "400px",
          width: "100%",
          borderRadius: "10px",
          border: "1px solid #ccc",
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController position={position} />

        <LocationMarker
          position={position}
          setPosition={selectPosition}
        />
      </MapContainer>

      <div
        style={{
          marginTop: "12px",
          padding: "12px",
          background: "#F5F5F5",
          borderRadius: "6px",
        }}
      >
        <p style={{ margin: "5px 0" }}>
          <strong>Latitude:</strong>{" "}
          {latitude != null
            ? Number(latitude).toFixed(6)
            : "Not Selected"}
        </p>

        <p style={{ margin: "5px 0" }}>
          <strong>Longitude:</strong>{" "}
          {longitude != null
            ? Number(longitude).toFixed(6)
            : "Not Selected"}
        </p>

        {latitude != null && longitude != null && (
          <p
            style={{
              color: "#2E7D32",
              fontWeight: "bold",
              marginBottom: 0,
            }}
          >
            ✓ Land location selected
          </p>
        )}
      </div>
    </div>
  );
}

export default LocationPicker;