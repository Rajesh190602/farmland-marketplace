import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Keep Leaflet's default marker icons working with Vite.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;

function getValidLands(lands) {
  return (lands || [])
    .map((land) => {
      const latitude = Number(land.latitude);
      const longitude = Number(land.longitude);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return null;
      }

      return {
        ...land,
        _latitude: latitude,
        _longitude: longitude,
      };
    })
    .filter(Boolean);
}

function MapViewport({ lands }) {
  const map = useMap();

  useEffect(() => {
    if (!lands.length) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    if (lands.length === 1) {
      map.setView(
        [lands[0]._latitude, lands[0]._longitude],
        15,
        { animate: true }
      );
      return;
    }

    const bounds = L.latLngBounds(
      lands.map((land) => [land._latitude, land._longitude])
    );

    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 15,
      animate: true,
    });
  }, [lands, map]);

  return null;
}

function FarmlandDiscoveryMap({ lands }) {
  const navigate = useNavigate();
  const validLands = getValidLands(lands);
  const missingLocationCount = (lands || []).length - validLands.length;

  return (
    <div>
      {validLands.length === 0 ? (
        <div className="alert alert-info mb-0">
          Location coordinates are not available for the current search
          results, so there are no farmland markers to display.
        </div>
      ) : (
        <>
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            scrollWheelZoom={true}
            style={{
              height: "520px",
              width: "100%",
              borderRadius: "10px",
              border: "1px solid #dee2e6",
              overflow: "hidden",
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapViewport lands={validLands} />

            {validLands.map((land) => (
              <Marker
                key={land.id}
                position={[land._latitude, land._longitude]}
              >
                <Popup>
                  <div style={{ minWidth: "210px" }}>
                    <strong>{land.title || "Farmland"}</strong>

                    {land.image_url && (
                      <img
                        src={land.image_url}
                        alt={land.title || "Farmland"}
                        style={{
                          width: "100%",
                          height: "110px",
                          objectFit: "cover",
                          borderRadius: "6px",
                          marginTop: "8px",
                          marginBottom: "8px",
                        }}
                      />
                    )}

                    <div style={{ marginBottom: "6px" }}>
                      <strong>Price:</strong>{" "}
                      ₹{Number(land.price || 0).toLocaleString("en-IN")}
                    </div>

                    <div style={{ marginBottom: "6px" }}>
                      <strong>Area:</strong> {land.area} Acres
                    </div>

                    <div style={{ marginBottom: "10px" }}>
                      <strong>Location:</strong>{" "}
                      {land.village || ""}
                      {land.village && land.mandal ? ", " : ""}
                      {land.mandal || ""}
                      {(land.village || land.mandal) && land.district
                        ? ", "
                        : ""}
                      {land.district || ""}
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => navigate(`/lands/${land.id}`)}
                    >
                      View Details
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-2">
            <small className="text-muted">
              Showing {validLands.length} of {(lands || []).length} search
              results on the map.
            </small>

            {missingLocationCount > 0 && (
              <small className="text-warning">
                {missingLocationCount} result
                {missingLocationCount === 1 ? "" : "s"} without valid map
                coordinates.
              </small>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default FarmlandDiscoveryMap;
