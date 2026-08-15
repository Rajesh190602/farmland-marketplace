import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

function EditLand() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [land, setLand] = useState({
    title: "",
    description: "",
    price: "",
    area: "",
    village: "",
    mandal: "",
    district: "",
    state: "",
    pincode: "",
    survey_number: "",
    soil_type: "",
    water_source: "",
    crop_type: "",
    latitude: null,
    longitude: null,
    image_url: "",
  });

  // =========================================================
  // Load existing land
  // =========================================================

  useEffect(() => {
    loadLand();
  }, [id]);

  const loadLand = async () => {
    try {
      setLoading(true);

      const response = await api.get(`/lands/${id}`);

      setLand({
        title: response.data.title || "",
        description: response.data.description || "",
        price: response.data.price ?? "",
        area: response.data.area ?? "",
        village: response.data.village || "",
        mandal: response.data.mandal || "",
        district: response.data.district || "",
        state: response.data.state || "",
        pincode: response.data.pincode || "",
        survey_number: response.data.survey_number || "",
        soil_type: response.data.soil_type || "",
        water_source: response.data.water_source || "",
        crop_type: response.data.crop_type || "",
        latitude: response.data.latitude ?? null,
        longitude: response.data.longitude ?? null,
        image_url: response.data.image_url || "",
      });
    } catch (error) {
      console.error("Failed to load land:", error);

      alert(
        error.response?.data?.detail ||
          "Failed to load land details."
      );

      navigate("/my-lands");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // Handle input changes
  // =========================================================

  const handleChange = (e) => {
    setLand((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  };

  // =========================================================
  // Update Land
  // =========================================================

  const updateLand = async (e) => {
    e.preventDefault();

    // Validation MUST be inside submit handler
    if (!land.title.trim()) {
      alert("Title is required.");
      return;
    }

    if (!land.description.trim()) {
      alert("Description is required.");
      return;
    }

    if (Number(land.price) <= 0) {
      alert("Enter a valid price.");
      return;
    }

    if (Number(land.area) <= 0) {
      alert("Enter a valid area.");
      return;
    }

    if (!land.village.trim()) {
      alert("Village is required.");
      return;
    }

    if (!land.mandal.trim()) {
      alert("Mandal is required.");
      return;
    }

    if (!land.district.trim()) {
      alert("District is required.");
      return;
    }

    if (!land.state.trim()) {
      alert("State is required.");
      return;
    }

    if (!land.pincode.trim()) {
      alert("Pincode is required.");
      return;
    }

    if (!land.survey_number.trim()) {
      alert("Survey Number is required.");
      return;
    }

    if (!land.soil_type.trim()) {
      alert("Soil Type is required.");
      return;
    }

    if (!land.water_source.trim()) {
      alert("Water Source is required.");
      return;
    }

    if (!land.crop_type.trim()) {
      alert("Crop Type is required.");
      return;
    }

    try {
      setUpdating(true);

      await api.put(`/lands/${id}`, {
        title: land.title.trim(),
        description: land.description.trim(),
        price: Number(land.price),
        area: Number(land.area),

        village: land.village.trim(),
        mandal: land.mandal.trim(),
        district: land.district.trim(),
        state: land.state.trim(),
        pincode: land.pincode.trim(),

        survey_number: land.survey_number.trim(),

        soil_type: land.soil_type.trim(),
        water_source: land.water_source.trim(),
        crop_type: land.crop_type.trim(),

        latitude: land.latitude,
        longitude: land.longitude,
        image_url: land.image_url || null,
      });

      alert("Land updated successfully!");

      navigate("/my-lands");
    } catch (error) {
      console.error("Update land error:", error);

      const detail = error.response?.data?.detail;

      if (typeof detail === "string") {
        alert(detail);
      } else if (Array.isArray(detail)) {
        alert(
          detail
            .map((item) => item?.msg || JSON.stringify(item))
            .join("\n")
        );
      } else {
        alert("Failed to update land.");
      }
    } finally {
      setUpdating(false);
    }
  };

  // =========================================================
  // Loading screen
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
          Loading Land Details...
        </div>
      </>
    );
  }

  // =========================================================
  // Edit page
  // =========================================================

  return (
    <>
      <Navbar />

      <div
        style={{
          maxWidth: "700px",
          margin: "30px auto",
          padding: "20px",
          background: "white",
          borderRadius: "10px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
        }}
      >
        <h1>Edit Land</h1>

        <form onSubmit={updateLand}>
          <input
            type="text"
            name="title"
            value={land.title}
            onChange={handleChange}
            placeholder="Title"
            required
          />
          <br />
          <br />

          <textarea
            name="description"
            value={land.description}
            onChange={handleChange}
            placeholder="Description"
            required
          />
          <br />
          <br />

          <input
            type="number"
            name="price"
            value={land.price}
            onChange={handleChange}
            placeholder="Price"
            required
          />
          <br />
          <br />

          <input
            type="number"
            name="area"
            value={land.area}
            onChange={handleChange}
            placeholder="Area"
            required
          />
          <br />
          <br />

          <input
            type="text"
            name="village"
            value={land.village}
            onChange={handleChange}
            placeholder="Village"
            required
          />
          <br />
          <br />

          <input
            type="text"
            name="mandal"
            value={land.mandal}
            onChange={handleChange}
            placeholder="Mandal"
            required
          />
          <br />
          <br />

          <input
            type="text"
            name="district"
            value={land.district}
            onChange={handleChange}
            placeholder="District"
            required
          />
          <br />
          <br />

          <input
            type="text"
            name="state"
            value={land.state}
            onChange={handleChange}
            placeholder="State"
            required
          />
          <br />
          <br />

          <input
            type="text"
            name="pincode"
            value={land.pincode}
            onChange={handleChange}
            placeholder="Pincode"
            required
          />
          <br />
          <br />

          <input
            type="text"
            name="survey_number"
            value={land.survey_number}
            onChange={handleChange}
            placeholder="Survey Number"
            required
          />
          <br />
          <br />

          <input
            type="text"
            name="soil_type"
            value={land.soil_type}
            onChange={handleChange}
            placeholder="Soil Type"
            required
          />
          <br />
          <br />

          <input
            type="text"
            name="water_source"
            value={land.water_source}
            onChange={handleChange}
            placeholder="Water Source"
            required
          />
          <br />
          <br />

          <input
            type="text"
            name="crop_type"
            value={land.crop_type}
            onChange={handleChange}
            placeholder="Crop Type"
            required
          />
          <br />
          <br />

          <div
            style={{
              display: "flex",
              gap: "10px",
            }}
          >
            <button
              type="submit"
              disabled={updating}
              style={{
                flex: 1,
                background: "#2E7D32",
                color: "white",
                border: "none",
                padding: "12px",
                borderRadius: "5px",
                cursor: updating
                  ? "not-allowed"
                  : "pointer",
                opacity: updating ? 0.6 : 1,
              }}
            >
              {updating
                ? "Updating..."
                : "Update Land"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/my-lands")}
              disabled={updating}
              style={{
                flex: 1,
                background: "#757575",
                color: "white",
                border: "none",
                padding: "12px",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default EditLand;