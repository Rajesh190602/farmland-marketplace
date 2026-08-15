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
  const [galleryImages, setGalleryImages] = useState({});

  const navigate = useNavigate();

  // =========================================================
  // Load My Lands
  // =========================================================

  useEffect(() => {
    fetchMyLands();
  }, []);

  const fetchMyLands = async () => {
    try {
      setLoading(true);

      const response = await api.get("/lands/my/lands");

      const myLands = response.data;

      setLands(myLands);

      // Load gallery images for every land
      await loadGalleryImages(myLands);
    } catch (error) {
      console.error("Failed to load lands:", error);

      alert(
        error.response?.data?.detail ||
          "Failed to load your lands."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // Load Gallery Images
  // =========================================================

  const loadGalleryImages = async (landList) => {
    try {
      const imageResults = await Promise.all(
        landList.map(async (land) => {
          try {
            const response = await api.get(
              `/lands/${land.id}/images`
            );

            return {
              landId: land.id,
              images: response.data || [],
            };
          } catch (error) {
            console.error(
              `Failed to load images for land ${land.id}:`,
              error
            );

            return {
              landId: land.id,
              images: [],
            };
          }
        })
      );

      const imageMap = {};

      imageResults.forEach((result) => {
        imageMap[result.landId] = result.images;
      });

      setGalleryImages(imageMap);
    } catch (error) {
      console.error(
        "Failed to load land gallery images:",
        error
      );
    }
  };

  // =========================================================
  // Error Message Helper
  // =========================================================

  const getErrorMessage = (error, fallbackMessage) => {
    const detail = error.response?.data?.detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          return (
            item?.msg ||
            item?.message ||
            JSON.stringify(item)
          );
        })
        .join("\n");
    }

    if (detail && typeof detail === "object") {
      return (
        detail.message ||
        detail.msg ||
        JSON.stringify(detail)
      );
    }

    if (typeof error.response?.data === "string") {
      return error.response.data;
    }

    return fallbackMessage;
  };

  // =========================================================
  // Select Multiple Images
  // =========================================================

  const handleImageSelection = (landId, event) => {
    const files = Array.from(
      event.target.files || []
    );

    if (files.length === 0) {
      return;
    }

    // Validate image files
    const invalidFile = files.find(
      (file) =>
        !file.type ||
        !file.type.startsWith("image/")
    );

    if (invalidFile) {
      alert(
        `${invalidFile.name} is not a valid image file.`
      );

      event.target.value = "";
      return;
    }

    setSelectedFiles((previous) => ({
      ...previous,
      [landId]: files,
    }));
  };

  // =========================================================
  // Upload Multiple Images
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

      console.log(
        "Land images uploaded:",
        response.data
      );

      const uploadedImages =
        response.data?.images || [];

      alert(
        `${files.length} image${
          files.length > 1 ? "s" : ""
        } uploaded successfully.`
      );

      // Immediately update gallery on the page
      setGalleryImages((previous) => ({
        ...previous,
        [landId]: [
          ...(previous[landId] || []),
          ...uploadedImages,
        ],
      }));

      // Clear selected files
      setSelectedFiles((previous) => {
        const updated = {
          ...previous,
        };

        delete updated[landId];

        return updated;
      });

      // Reset the file input
      const fileInput =
        document.getElementById(
          `land-images-${landId}`
        );

      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      console.error(
        "Image upload error:",
        error
      );

      alert(
        getErrorMessage(
          error,
          "Failed to upload land images."
        )
      );
    } finally {
      setUploadingId(null);
    }
  };

  // =========================================================
  // Delete Land
  // =========================================================

  const deleteLand = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this land?"
      )
    ) {
      return;
    }

    try {
      setDeletingId(id);

      await api.delete(`/lands/${id}`);

      alert("Land deleted successfully.");

      // Remove deleted land from UI immediately
      setLands((previous) =>
        previous.filter(
          (land) => land.id !== id
        )
      );

      setGalleryImages((previous) => {
        const updated = {
          ...previous,
        };

        delete updated[id];

        return updated;
      });

      setSelectedFiles((previous) => {
        const updated = {
          ...previous,
        };

        delete updated[id];

        return updated;
      });
    } catch (error) {
      console.error(
        "Delete land error:",
        error
      );

      alert(
        getErrorMessage(
          error,
          "Failed to delete land."
        )
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
        <h1
          style={{
            color: "#2E7D32",
          }}
        >
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
            const filesForLand =
              selectedFiles[land.id] || [];

            const imagesForLand =
              galleryImages[land.id] || [];

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

                {/* =================================================
                    Existing Main Image
                ================================================= */}

                {land.image_url && (
                  <div
                    style={{
                      marginBottom: "20px",
                    }}
                  >
                    <h3
                      style={{
                        color: "#2E7D32",
                      }}
                    >
                      Main Image
                    </h3>

                    <img
                      src={land.image_url}
                      alt={land.title}
                      style={{
                        width: "100%",
                        maxHeight: "250px",
                        objectFit: "cover",
                        borderRadius: "10px",
                      }}
                    />
                  </div>
                )}

                {/* =================================================
                    Gallery Images
                ================================================= */}

                {imagesForLand.length > 0 && (
                  <div
                    style={{
                      marginBottom: "25px",
                    }}
                  >
                    <h3
                      style={{
                        color: "#2E7D32",
                      }}
                    >
                      📷 Land Gallery (
                      {imagesForLand.length})
                    </h3>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(180px, 1fr))",
                        gap: "12px",
                      }}
                    >
                      {imagesForLand.map(
                        (image) => (
                          <div
                            key={image.id}
                            style={{
                              background: "#f5f5f5",
                              borderRadius: "10px",
                              overflow: "hidden",
                              border:
                                "1px solid #ddd",
                            }}
                          >
                            <img
                              src={
                                image.image_url
                              }
                              alt={`${land.title} land`}
                              style={{
                                width: "100%",
                                height: "180px",
                                objectFit:
                                  "cover",
                                display: "block",
                              }}
                            />
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {!land.image_url &&
                  imagesForLand.length === 0 && (
                    <p
                      style={{
                        color: "#777",
                        fontStyle: "italic",
                      }}
                    >
                      No land images uploaded
                      yet.
                    </p>
                  )}

                {/* =================================================
                    Land Details
                ================================================= */}

                <p>
                  <strong>
                    Description:
                  </strong>{" "}
                  {land.description}
                </p>

                <p>
                  <strong>Price:</strong> ₹
                  {land.price}
                </p>

                <p>
                  <strong>Area:</strong>{" "}
                  {land.area} Acres
                </p>

                <p>
                  <strong>
                    Village:
                  </strong>{" "}
                  {land.village}
                </p>

                <p>
                  <strong>
                    Mandal:
                  </strong>{" "}
                  {land.mandal}
                </p>

                <p>
                  <strong>
                    District:
                  </strong>{" "}
                  {land.district}
                </p>

                <p>
                  <strong>State:</strong>{" "}
                  {land.state}
                </p>

                <p>
                  <strong>
                    Pincode:
                  </strong>{" "}
                  {land.pincode}
                </p>

                <p>
                  <strong>
                    Survey No:
                  </strong>{" "}
                  {land.survey_number}
                </p>

                <p>
                  <strong>
                    Soil Type:
                  </strong>{" "}
                  {land.soil_type}
                </p>

                <p>
                  <strong>
                    Water Source:
                  </strong>{" "}
                  {land.water_source}
                </p>

                <p>
                  <strong>
                    Crop Type:
                  </strong>{" "}
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
                    border:
                      "1px solid #C8E6C9",
                    borderRadius: "10px",
                  }}
                >
                  <h3
                    style={{
                      color: "#2E7D32",
                      marginTop: 0,
                    }}
                  >
                    📷 Upload Land Images
                  </h3>

                  <p
                    style={{
                      color: "#555",
                    }}
                  >
                    Select multiple images of
                    this land.
                  </p>

                  <input
                    id={`land-images-${land.id}`}
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
                      uploadingId ===
                      land.id
                    }
                  />

                  {filesForLand.length >
                    0 && (
                    <div
                      style={{
                        marginTop: "15px",
                      }}
                    >
                      <p>
                        <strong>
                          Selected images:
                        </strong>{" "}
                        {filesForLand.length}
                      </p>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(120px, 1fr))",
                          gap: "10px",
                          marginTop: "10px",
                        }}
                      >
                        {filesForLand.map(
                          (file, index) => (
                            <div
                              key={`${file.name}-${index}`}
                              style={{
                                border:
                                  "1px solid #ddd",
                                borderRadius:
                                  "8px",
                                padding:
                                  "5px",
                                overflow:
                                  "hidden",
                              }}
                            >
                              <img
                                src={URL.createObjectURL(
                                  file
                                )}
                                alt={file.name}
                                style={{
                                  width: "100%",
                                  height: "100px",
                                  objectFit:
                                    "cover",
                                  borderRadius:
                                    "5px",
                                }}
                              />

                              <p
                                style={{
                                  fontSize:
                                    "12px",
                                  margin:
                                    "5px 0 0",
                                  wordBreak:
                                    "break-word",
                                }}
                              >
                                {file.name}
                              </p>
                            </div>
                          )
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          uploadLandImages(
                            land.id
                          )
                        }
                        disabled={
                          uploadingId ===
                          land.id
                        }
                        style={{
                          backgroundColor:
                            "#2E7D32",
                          color: "white",
                          border: "none",
                          padding:
                            "10px 20px",
                          borderRadius: "5px",
                          cursor:
                            uploadingId ===
                            land.id
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            uploadingId ===
                            land.id
                              ? 0.6
                              : 1,
                          marginTop:
                            "15px",
                        }}
                      >
                        {uploadingId ===
                        land.id
                          ? "Uploading Images..."
                          : `📤 Upload ${filesForLand.length} Image${
                              filesForLand.length >
                              1
                                ? "s"
                                : ""
                            }`}
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
                      backgroundColor:
                        "green",
                      color: "white",
                      border: "none",
                      padding:
                        "10px 20px",
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
                      deletingId ===
                      land.id
                    }
                    style={{
                      backgroundColor: "red",
                      color: "white",
                      border: "none",
                      padding:
                        "10px 20px",
                      borderRadius: "5px",
                      cursor:
                        deletingId ===
                        land.id
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        deletingId ===
                        land.id
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