import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

function MyLands() {
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [lands, setLands] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyLands();
  }, []);

  const fetchMyLands = async () => {
    try {
      setLoading(true);

      const response = await api.get("/lands/my/lands");

      setLands(response.data);
    } catch (error) {
      console.log(error);
      alert("Failed to load your lands.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // Select multiple images
  // =========================================================

  const handleImageSelection = (landId, event) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) {
      return;
    }

    // Validate image files
    const invalidFile = files.find(
      (file) => !file.type.startsWith("image/")
    );

    if (invalidFile) {
      alert(`${invalidFile.name} is not a valid image file.`);
      return;
    }

    setSelectedFiles((previous) => ({
      ...previous,
      [landId]: files,
    }));
  };

  // =========================================================
  // Upload multiple images
  // =========================================================

  const uploadLandImages = async (landId) => {
    const files = selectedFiles[landId];

    if (!files || files.length === 0) {
      alert("Please select at least one image.");
      return;
    }

    try {
      setUploadingId(landId);

      const formData = new FormData();

      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await api.post(
        `/lands/${landId}/images`,
        formData
      );

      console.log("Land images uploaded:", response.data);

      alert(
        `${files.length} image${
          files.length > 1 ? "s" : ""
        } uploaded successfully.`
      );

      // Clear selected files for this land
      setSelectedFiles((previous) => {
        const updated = { ...previous };
        delete updated[landId];
        return updated;
      });

      // Refresh lands
      await fetchMyLands();
    } catch (error) {
      console.log(error);

      alert(
        error.response?.data?.detail ||
          "Failed to upload land images."
      );
    } finally {
      setUploadingId(null);
    }
  };

  // =========================================================
  // Delete Land
  // =========================================================

  const deleteLand = async (id) => {
    if (!window.confirm("Are you sure you want to delete this land?")) {
      return;
    }

    try {
      setDeletingId(id);

      await api.delete(`/lands/${id}`);

      alert("Land deleted successfully.");

      fetchMyLands();
    } catch (error) {
      console.log(error);

      alert(
        error.response?.data?.detail ||
          "Failed to delete land."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =========================================================
  // Edit Land
  // =========================================================

  const editLand = (id) => {
    navigate(`/edit-land/${id}`);
  };

  // =========================================================
  // Loading
  // =========================================================

  if (loading) {
    return (
      <>
        <Navbar />

        <div
          style={{
            textAlign: "center",
            marginTop: "80px",
            fontSize: "22px",
            color: "#2E7D32",
            fontWeight: "bold",
          }}
        >
          Loading Your Lands...
        </div>
      </>
    );
  }

  // =========================================================
  // Page
  // =========================================================

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
        <h1 style={{ color: "#2E7D32" }}>
          🌾 My Lands
        </h1>

        <button
          onClick={() => navigate("/home")}
          style={{
            backgroundColor: "#1565C0",
            color: "white",
            padding: "10px 20px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            marginBottom: "20px",
          }}
        >
          ← Back to Home
        </button>

        {lands.length === 0 ? (
          <h2>No lands found.</h2>
        ) : (
          lands.map((land) => {
            const filesForLand = selectedFiles[land.id] || [];

            return (
              <div
                key={land.id}
                style={{
                  background: "white",
                  borderRadius: "10px",
                  padding: "20px",
                  marginBottom: "20px",
                  boxShadow:
                    "0 2px 8px rgba(0,0,0,0.2)",
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

                <p>
                  <strong>Description:</strong>{" "}
                  {land.description}
                </p>

                <p>
                  <strong>Price:</strong> ₹{land.price}
                </p>

                <p>
                  <strong>Area:</strong> {land.area} Acres
                </p>

                <p>
                  <strong>Village:</strong>{" "}
                  {land.village}
                </p>

                <p>
                  <strong>Mandal:</strong>{" "}
                  {land.mandal}
                </p>

                <p>
                  <strong>District:</strong>{" "}
                  {land.district}
                </p>

                <p>
                  <strong>State:</strong> {land.state}
                </p>

                <p>
                  <strong>Pincode:</strong>{" "}
                  {land.pincode}
                </p>

                <p>
                  <strong>Survey No:</strong>{" "}
                  {land.survey_number}
                </p>

                <p>
                  <strong>Soil Type:</strong>{" "}
                  {land.soil_type}
                </p>

                <p>
                  <strong>Water Source:</strong>{" "}
                  {land.water_source}
                </p>

                <p>
                  <strong>Crop Type:</strong>{" "}
                  {land.crop_type}
                </p>

                {/* =================================================
                    Multiple Image Upload
                ================================================= */}

                <div
                  style={{
                    marginTop: "25px",
                    padding: "20px",
                    background: "#F8FFF8",
                    border: "1px solid #C8E6C9",
                    borderRadius: "10px",
                  }}
                >
                  <h3
                    style={{
                      color: "#2E7D32",
                      marginTop: 0,
                    }}
                  >
                    📷 Land Image Gallery
                  </h3>

                  <p
                    style={{
                      color: "#555",
                    }}
                  >
                    Select multiple images of this land.
                  </p>

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) =>
                      handleImageSelection(
                        land.id,
                        event
                      )
                    }
                    disabled={
                      uploadingId === land.id
                    }
                  />

                  {filesForLand.length > 0 && (
                    <div
                      style={{
                        marginTop: "12px",
                      }}
                    >
                      <p>
                        <strong>
                          Selected images:
                        </strong>{" "}
                        {filesForLand.length}
                      </p>

                      <ul>
                        {filesForLand.map(
                          (file, index) => (
                            <li key={`${file.name}-${index}`}>
                              {file.name}
                            </li>
                          )
                        )}
                      </ul>

                      <button
                        type="button"
                        onClick={() =>
                          uploadLandImages(
                            land.id
                          )
                        }
                        disabled={
                          uploadingId === land.id
                        }
                        style={{
                          backgroundColor:
                            "#2E7D32",
                          color: "white",
                          border: "none",
                          padding: "10px 20px",
                          borderRadius: "5px",
                          cursor:
                            uploadingId === land.id
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            uploadingId === land.id
                              ? 0.6
                              : 1,
                          marginTop: "10px",
                        }}
                      >
                        {uploadingId === land.id
                          ? "Uploading Images..."
                          : "📤 Upload Images"}
                      </button>
                    </div>
                  )}
                </div>

                {/* =================================================
                    Edit / Delete
                ================================================= */}

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "20px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() =>
                      editLand(land.id)
                    }
                    style={{
                      backgroundColor: "green",
                      color: "white",
                      border: "none",
                      padding: "10px 20px",
                      borderRadius: "5px",
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>

                  <button
                    onClick={() =>
                      deleteLand(land.id)
                    }
                    disabled={
                      deletingId === land.id
                    }
                    style={{
                      backgroundColor: "red",
                      color: "white",
                      border: "none",
                      padding: "10px 20px",
                      borderRadius: "5px",
                      cursor:
                        deletingId === land.id
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        deletingId === land.id
                          ? 0.6
                          : 1,
                    }}
                  >
                    {deletingId === land.id
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

export default MyLands;