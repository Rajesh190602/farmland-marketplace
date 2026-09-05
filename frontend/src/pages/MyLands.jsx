import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

function MyLands() {
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingImageId, setDeletingImageId] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [availabilityLoadingId, setAvailabilityLoadingId] = useState(null);

  const [lands, setLands] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [galleryImages, setGalleryImages] = useState({});
  const [availabilityStatuses, setAvailabilityStatuses] = useState({});
  const [listingAnalytics, setListingAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [expandedAnalyticsId, setExpandedAnalyticsId] = useState(null);
  const [expandedManagementId, setExpandedManagementId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

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

      // Load marketplace availability for every land
      await loadAvailabilityStatuses(myLands);

      // Load existing farmer listing analytics
      await loadListingAnalytics();
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
  // Load Marketplace Availability
  // =========================================================

  const loadAvailabilityStatuses = async (landList) => {
    try {
      const results = await Promise.all(
        landList.map(async (land) => {
          try {
            const response = await api.get(
              `/marketplace/lands/${land.id}/availability`
            );

            return {
              landId: land.id,
              status:
                response.data?.status || "available",
            };
          } catch (error) {
            console.error(
              `Failed to load availability for land ${land.id}:`,
              error
            );

            return {
              landId: land.id,
              status: "available",
            };
          }
        })
      );

      const statusMap = {};

      results.forEach((result) => {
        statusMap[result.landId] = result.status;
      });

      setAvailabilityStatuses(statusMap);
    } catch (error) {
      console.error(
        "Failed to load land availability:",
        error
      );
    }
  };

  // =========================================================
  // Load Farmer Listing Analytics
  // =========================================================

  const loadListingAnalytics = async () => {
    try {
      setAnalyticsLoading(true);

      const response = await api.get("/lands/my/analytics");

      setListingAnalytics(response.data || null);
    } catch (error) {
      console.error("Failed to load listing analytics:", error);
      setListingAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const getAnalyticsRecord = (landId) => {
    return (listingAnalytics?.records || []).find(
      (record) => Number(record.id) === Number(landId)
    );
  };

  const getStatusFilter = (land) => {
    const approvalStatus = String(land.status || "").toLowerCase();
    const availabilityStatus = String(
      availabilityStatuses[land.id] || "available"
    ).toLowerCase();

    if (statusFilter === "pending") return approvalStatus === "pending";
    if (statusFilter === "approved") return approvalStatus === "approved";
    if (statusFilter === "rejected") return approvalStatus === "rejected";
    if (statusFilter === "changes_requested") {
      return approvalStatus === "changes_requested";
    }
    if (statusFilter === "available") return availabilityStatus === "available";
    if (statusFilter === "reserved") return availabilityStatus === "reserved";
    if (statusFilter === "sold") return availabilityStatus === "sold";
    if (statusFilter === "unpublished") {
      const record = getAnalyticsRecord(land.id);
      return record ? !record.is_published : false;
    }

    return true;
  };

  const filteredLands = lands.filter(getStatusFilter);

  const filterDefinitions = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "available", label: "Available" },
    { key: "reserved", label: "Reserved" },
    { key: "sold", label: "Sold" },
    { key: "rejected", label: "Rejected" },
    { key: "changes_requested", label: "Change Requested" },
    { key: "unpublished", label: "Unpublished" },
  ];

  // =========================================================
  // Update Marketplace Availability
  // =========================================================

  const updateAvailability = async (landId, newStatus) => {
    const currentStatus =
      availabilityStatuses[landId] || "available";

    // Available -> Reserved is controlled by reservation confirmation.
    if (
      currentStatus === "available" &&
      newStatus === "reserved"
    ) {
      alert(
        "Reserved status is set only after you confirm a buyer reservation request from Marketplace Activity."
      );

      return;
    }

    // Reserved -> Available needs confirmation.
    if (
      currentStatus === "reserved" &&
      newStatus === "available"
    ) {
      const confirmed = window.confirm(
        "This land is currently reserved. Are you sure you want to make it available again?"
      );

      if (!confirmed) {
        return;
      }
    }

    // Available -> Sold is not a valid lifecycle transition.
    if (
      currentStatus === "available" &&
      newStatus === "sold"
    ) {
      alert(
        "A land listing must be Reserved before it can be marked Sold."
      );
      return;
    }

    // Sold land cannot be reopened directly.
    if (
      currentStatus === "sold" &&
      newStatus !== "sold"
    ) {
      alert(
        "Sold land cannot be reopened directly."
      );
      return;
    }

    // Sold is reached only from Reserved.
    if (
      currentStatus !== "reserved" &&
      newStatus === "sold"
    ) {
      alert(
        "A land listing must be Reserved before it can be marked Sold."
      );
      return;
    }

    try {
      setAvailabilityLoadingId(landId);

      const response = await api.put(
        `/marketplace/lands/${landId}/availability`,
        {
          land_id: landId,
          status: newStatus,
        }
      );

      const updatedStatus =
        response.data?.status || newStatus;

      setAvailabilityStatuses((previous) => ({
        ...previous,
        [landId]: updatedStatus,
      }));

      alert(
        `Land marked as ${updatedStatus}.`
      );
    } catch (error) {
      console.error(
        "Failed to update availability:",
        error
      );

      alert(
        getErrorMessage(
          error,
          "Unable to update land availability."
        )
      );
    } finally {
      setAvailabilityLoadingId(null);
    }
  };

  // =========================================================
  // Availability Display Helpers
  // =========================================================

  const getAvailabilityLabel = (status) => {
    switch (status) {
      case "reserved":
        return "🟠 Reserved";
      case "sold":
        return "🔴 Sold";
      case "available":
      default:
        return "🟢 Available";
    }
  };

  const getAvailabilityBadgeStyle = (status) => {
    if (status === "sold") {
      return {
        background: "#FFEBEE",
        color: "#C62828",
        border: "1px solid #FFCDD2",
      };
    }

    if (status === "reserved") {
      return {
        background: "#FFF3E0",
        color: "#EF6C00",
        border: "1px solid #FFE0B2",
      };
    }

    return {
      background: "#E8F5E9",
      color: "#2E7D32",
      border: "1px solid #C8E6C9",
    };
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
    const files = Array.from(event.target.files || []);

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
  // Delete Individual Image
  // =========================================================

  const deleteImage = async (landId, imageId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this image?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      setDeletingImageId(imageId);

      await api.delete(
        `/lands/${landId}/images/${imageId}`
      );

      alert("Image deleted successfully.");

      // Remove only the deleted image from the gallery
      setGalleryImages((previous) => ({
        ...previous,
        [landId]: (
          previous[landId] || []
        ).filter(
          (image) => image.id !== imageId
        ),
      }));
    } catch (error) {
      console.error(
        "Delete image error:",
        error
      );

      alert(
        getErrorMessage(
          error,
          "Failed to delete image."
        )
      );
    } finally {
      setDeletingImageId(null);
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

      setAvailabilityStatuses((previous) => {
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
        <div
          style={{
            maxWidth: "1250px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "15px",
              flexWrap: "wrap",
              marginBottom: "18px",
            }}
          >
            <div>
              <h1
                style={{
                  color: "#2E7D32",
                  margin: 0,
                }}
              >
                🌾 My Lands
              </h1>
              <p style={{ color: "#666", margin: "6px 0 0" }}>
                Manage your listings, approval status, marketplace availability and buyer activity.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={fetchMyLands}
                disabled={loading}
                style={{
                  backgroundColor: "#2E7D32",
                  color: "white",
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "8px",
                  cursor: loading ? "wait" : "pointer",
                  fontWeight: "bold",
                }}
              >
                ↻ Refresh
              </button>

              <button
                type="button"
                onClick={() => navigate("/home")}
                style={{
                  backgroundColor: "#1565C0",
                  color: "white",
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                ← Home
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            {[
              ["Total Listings", listingAnalytics?.summary?.total_lands ?? lands.length, "🌾"],
              ["Available", listingAnalytics?.summary?.available ?? lands.filter((land) => (availabilityStatuses[land.id] || "available") === "available").length, "🟢"],
              ["Reserved", listingAnalytics?.summary?.reserved ?? lands.filter((land) => availabilityStatuses[land.id] === "reserved").length, "🟡"],
              ["Sold", listingAnalytics?.summary?.sold ?? lands.filter((land) => availabilityStatuses[land.id] === "sold").length, "🔴"],
              ["Views", listingAnalytics?.summary?.total_views ?? 0, "👁️"],
              ["Inquiries", listingAnalytics?.summary?.total_inquiries ?? 0, "💬"],
              ["Offers", listingAnalytics?.summary?.total_offers ?? 0, "💰"],
              ["Site Visits", listingAnalytics?.summary?.total_site_visits ?? 0, "📅"],
            ].map(([label, value, icon]) => (
              <div
                key={label}
                style={{
                  background: "#fff",
                  border: "1px solid #DDE7DF",
                  borderRadius: "12px",
                  padding: "14px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ fontSize: "20px" }}>{icon}</div>
                <div style={{ fontSize: "22px", fontWeight: "800", color: "#2E7D32", marginTop: "4px" }}>{value}</div>
                <div style={{ fontSize: "12px", color: "#66736A", fontWeight: "700" }}>{label}</div>
              </div>
            ))}
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #DDE7DF",
              borderRadius: "12px",
              padding: "14px",
              marginBottom: "20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ fontWeight: "800", color: "#405247", marginBottom: "10px" }}>Filter Listings</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {filterDefinitions.map((filter) => {
                const active = statusFilter === filter.key;
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setStatusFilter(filter.key)}
                    style={{
                      border: active ? "2px solid #2E7D32" : "1px solid #D0D8D2",
                      background: active ? "#E8F5E9" : "#fff",
                      color: active ? "#2E7D32" : "#536057",
                      borderRadius: "20px",
                      padding: "8px 13px",
                      cursor: "pointer",
                      fontWeight: active ? "800" : "600",
                    }}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: "10px", color: "#66736A", fontSize: "13px" }}>
              Showing <strong>{filteredLands.length}</strong> of <strong>{lands.length}</strong> listings
            </div>
          </div>

          {lands.length === 0 ? (
            <div style={{ background: "#fff", padding: "40px", borderRadius: "12px", textAlign: "center" }}>
              <h2>No lands found.</h2>
              <p style={{ color: "#777" }}>Add a land listing to start managing your marketplace inventory.</p>
            </div>
          ) : filteredLands.length === 0 ? (
            <div style={{ background: "#fff", padding: "40px", borderRadius: "12px", textAlign: "center" }}>
              <h2>No listings match this filter.</h2>
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                style={{ background: "#2E7D32", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 16px", cursor: "pointer", fontWeight: "700" }}
              >
                Show All Listings
              </button>
            </div>
          ) : (
          filteredLands.map((land) => {
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
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(180px, 260px) 1fr",
                    gap: "20px",
                    alignItems: "start",
                  }}
                >
                  <div>
                    {land.image_url ? (
                      <img
                        src={land.image_url}
                        alt={land.title}
                        style={{
                          width: "100%",
                          height: "165px",
                          objectFit: "cover",
                          borderRadius: "10px",
                          border: "1px solid #DDE7DF",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          height: "165px",
                          borderRadius: "10px",
                          background: "#F1F4F2",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#77847B",
                          fontWeight: "700",
                        }}
                      >
                        🌾 No Image
                      </div>
                    )}
                  </div>

                  <div>
                    <h2 style={{ margin: "0 0 8px", color: "#2E7D32" }}>{land.title}</h2>
                    <div style={{ color: "#59665D", fontSize: "14px", lineHeight: 1.6 }}>
                      <div><strong>Price:</strong> ₹{Number(land.price || 0).toLocaleString("en-IN")}</div>
                      <div><strong>Area:</strong> {land.area} Acres</div>
                      <div><strong>Location:</strong> {land.village}, {land.mandal}, {land.district}</div>
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
                      <span style={{ background: land.status === "approved" ? "#E8F5E9" : land.status === "rejected" ? "#FFEBEE" : land.status === "changes_requested" ? "#FFF3E0" : "#EEF3F7", color: land.status === "approved" ? "#2E7D32" : land.status === "rejected" ? "#C62828" : land.status === "changes_requested" ? "#EF6C00" : "#546E7A", borderRadius: "18px", padding: "6px 10px", fontSize: "12px", fontWeight: "800" }}>
                        {land.status === "changes_requested" ? "⚠️ Change Requested" : `Approval: ${String(land.status || "unknown").replace("_", " ")}`}
                      </span>
                      <span style={{ ...getAvailabilityBadgeStyle(availabilityStatuses[land.id] || "available"), borderRadius: "18px", padding: "6px 10px", fontSize: "12px", fontWeight: "800" }}>
                        {getAvailabilityLabel(availabilityStatuses[land.id] || "available")}
                      </span>
                      {getAnalyticsRecord(land.id) && (
                        <span style={{ background: getAnalyticsRecord(land.id).is_published ? "#E8F5E9" : "#F3F4F5", color: getAnalyticsRecord(land.id).is_published ? "#2E7D32" : "#68736C", borderRadius: "18px", padding: "6px 10px", fontSize: "12px", fontWeight: "800" }}>
                          {getAnalyticsRecord(land.id).is_published ? "🌐 Published" : "⚪ Unpublished"}
                        </span>
                      )}
                    </div>

                    {land.rejection_reason && (
                      <div style={{ marginTop: "10px", padding: "9px 11px", background: "#FFF8E1", border: "1px solid #FFE082", borderRadius: "8px", color: "#795548", fontSize: "13px" }}>
                        <strong>Admin feedback:</strong> {land.rejection_reason}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
                      <button type="button" onClick={() => navigate(`/lands/${land.id}`)} style={{ background: "#1976D2", color: "#fff", border: "none", borderRadius: "7px", padding: "9px 13px", cursor: "pointer", fontWeight: "700" }}>👁️ View</button>
                      <button type="button" onClick={() => editLand(land.id)} style={{ background: "#2E7D32", color: "#fff", border: "none", borderRadius: "7px", padding: "9px 13px", cursor: "pointer", fontWeight: "700" }}>✏️ Edit</button>
                      <button type="button" onClick={() => setExpandedAnalyticsId((current) => current === land.id ? null : land.id)} style={{ background: "#6A1B9A", color: "#fff", border: "none", borderRadius: "7px", padding: "9px 13px", cursor: "pointer", fontWeight: "700" }}>📊 Analytics</button>
                      <button type="button" onClick={() => setExpandedManagementId((current) => current === land.id ? null : land.id)} style={{ background: "#EF6C00", color: "#fff", border: "none", borderRadius: "7px", padding: "9px 13px", cursor: "pointer", fontWeight: "700" }}>⚙️ Manage / Availability</button>
                    </div>

                    {expandedAnalyticsId === land.id && (
                      <div style={{ marginTop: "12px", padding: "12px", background: "#F8FBF8", border: "1px solid #DDE7DF", borderRadius: "9px" }}>
                        {analyticsLoading && !listingAnalytics ? (
                          <div style={{ color: "#66736A" }}>Loading analytics...</div>
                        ) : (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: "8px" }}>
                            {[
                              ["Views", getAnalyticsRecord(land.id)?.views ?? 0, "👁️"],
                              ["Inquiries", getAnalyticsRecord(land.id)?.inquiries?.total ?? 0, "💬"],
                              ["Offers", getAnalyticsRecord(land.id)?.offers?.total ?? 0, "💰"],
                              ["Site Visits", getAnalyticsRecord(land.id)?.site_visits?.total ?? 0, "📅"],
                            ].map(([label, value, icon]) => (
                              <div key={label} style={{ background: "#fff", borderRadius: "7px", padding: "8px", textAlign: "center" }}>
                                <div>{icon}</div>
                                <strong style={{ color: "#2E7D32", fontSize: "18px" }}>{value}</strong>
                                <div style={{ fontSize: "11px", color: "#66736A" }}>{label}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* =================================================
                    Existing Main Image / Detailed Management
                ================================================= */}
                {expandedManagementId === land.id && (
                  <div style={{ marginTop: "18px" }}>

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
                              src={image.image_url}
                              alt={`${land.title} land`}
                              style={{
                                width: "100%",
                                height: "180px",
                                objectFit: "cover",
                                display: "block",
                              }}
                            />

                            {/* =====================================
                                Delete Individual Image
                            ====================================== */}

                            <button
                              type="button"
                              onClick={() =>
                                deleteImage(
                                  land.id,
                                  image.id
                                )
                              }
                              disabled={
                                deletingImageId ===
                                image.id
                              }
                              style={{
                                width: "100%",
                                marginTop: "8px",
                                backgroundColor:
                                  deletingImageId ===
                                  image.id
                                    ? "#999"
                                    : "#D32F2F",
                                color: "white",
                                border: "none",
                                padding: "9px",
                                cursor:
                                  deletingImageId ===
                                  image.id
                                    ? "not-allowed"
                                    : "pointer",
                                fontWeight: "bold",
                              }}
                            >
                              {deletingImageId ===
                              image.id
                                ? "Deleting..."
                                : "🗑️ Delete Image"}
                            </button>
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
                      No land images uploaded yet.
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
                  <strong>State:</strong>{" "}
                  {land.state}
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
                    Marketplace Availability
                ================================================= */}

                <div
                  style={{
                    marginTop: "25px",
                    marginBottom: "25px",
                    padding: "20px",
                    background: "#F5F7FA",
                    border: "1px solid #DADADA",
                    borderRadius: "12px",
                  }}
                >
                  <h3
                    style={{
                      color: "#2E7D32",
                      marginTop: 0,
                      marginBottom: "10px",
                    }}
                  >
                    🏷️ Land Availability
                  </h3>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                      marginBottom: "15px",
                    }}
                  >
                    <strong>Current Status:</strong>

                    <span
                      style={{
                        ...getAvailabilityBadgeStyle(
                          availabilityStatuses[land.id] ||
                            "available"
                        ),
                        display: "inline-block",
                        padding: "8px 16px",
                        borderRadius: "22px",
                        fontWeight: "bold",
                      }}
                    >
                      {getAvailabilityLabel(
                        availabilityStatuses[land.id] ||
                          "available"
                      )}
                    </span>

                    {land.status !== "approved" && (
                      <span
                        style={{
                          background: "#FFF3E0",
                          color: "#EF6C00",
                          border: "1px solid #FFE0B2",
                          padding: "8px 14px",
                          borderRadius: "20px",
                          fontWeight: "bold",
                        }}
                      >
                        ⏳ {land.status}
                      </span>
                    )}
                  </div>

                  {land.status === "approved" ? (
                    <>
                      <p
                        style={{
                          color: "#666",
                          marginTop: 0,
                          marginBottom: "15px",
                        }}
                      >
                        Follow the listing lifecycle:
                        Available → Reserved → Sold.
                        A reserved listing can return to Available
                        if the reservation is cancelled.
                      </p>

                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            updateAvailability(
                              land.id,
                              "available"
                            )
                          }
                          disabled={
                            availabilityLoadingId ===
                              land.id ||
                            (availabilityStatuses[land.id] ||
                              "available") === "available"
                          }
                          style={{
                            background: "#2E7D32",
                            color: "white",
                            border: "none",
                            padding: "10px 18px",
                            borderRadius: "8px",
                            cursor:
                              availabilityLoadingId ===
                              land.id
                                ? "not-allowed"
                                : "pointer",
                            fontWeight: "bold",
                            opacity:
                              availabilityLoadingId ===
                                land.id ||
                              (availabilityStatuses[
                                land.id
                              ] || "available") ===
                                "available"
                                ? 0.6
                                : 1,
                          }}
                        >
                          🟢 Available
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            alert(
                              "Reserved status is set only after you confirm a buyer reservation request from Marketplace Activity."
                            )
                          }
                          disabled={
                            true ||
                            availabilityLoadingId ===
                              land.id ||
                            (availabilityStatuses[land.id] ||
                              "available") !== "available"
                          }
                          style={{
                            background: "#EF6C00",
                            color: "white",
                            border: "none",
                            padding: "10px 18px",
                            borderRadius: "8px",
                            cursor:
                              availabilityLoadingId ===
                              land.id
                                ? "not-allowed"
                                : "pointer",
                            fontWeight: "bold",
                            opacity:
                              availabilityLoadingId ===
                                land.id ||
                              (availabilityStatuses[
                                land.id
                              ] || "available") !==
                                "available"
                                ? 0.6
                                : 1,
                          }}
                        >
                          🟠 Reserved
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateAvailability(
                              land.id,
                              "sold"
                            )
                          }
                          disabled={
                            availabilityLoadingId ===
                              land.id ||
                            (availabilityStatuses[land.id] ||
                              "available") !== "reserved"
                          }
                          style={{
                            background: "#C62828",
                            color: "white",
                            border: "none",
                            padding: "10px 18px",
                            borderRadius: "8px",
                            cursor:
                              availabilityLoadingId ===
                              land.id
                                ? "not-allowed"
                                : "pointer",
                            fontWeight: "bold",
                            opacity:
                              availabilityLoadingId ===
                                land.id ||
                              (availabilityStatuses[
                                land.id
                              ] || "available") !==
                                "reserved"
                                ? 0.6
                                : 1,
                          }}
                        >
                          🔴 Sold
                        </button>
                      </div>

                      {(availabilityStatuses[land.id] ||
                        "available") === "sold" && (
                        <p
                          style={{
                            marginBottom: 0,
                            marginTop: "15px",
                            color: "#C62828",
                            fontWeight: "600",
                          }}
                        >
                          A sold listing cannot be reopened
                          directly.
                        </p>
                      )}

                      {availabilityLoadingId === land.id && (
                        <p
                          style={{
                            marginBottom: 0,
                            marginTop: "12px",
                            color: "#666",
                            fontWeight: "bold",
                          }}
                        >
                          Updating marketplace availability...
                        </p>
                      )}
                    </>
                  ) : (
                    <p
                      style={{
                        marginBottom: 0,
                        color: "#666",
                      }}
                    >
                      Availability can be changed only after
                      this land is approved by the admin.
                    </p>
                  )}
                </div>

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

                  {filesForLand.length > 0 && (
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

                  </div>
                )}

                {/* =================================================
                    Edit / Delete Entire Land
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
      </div>
    </>
  );
}



export default MyLands;