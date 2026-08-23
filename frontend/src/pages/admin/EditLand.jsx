import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";

function EditLand() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [form, setForm] = useState({
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
    latitude: "",
    longitude: "",
    image_url: "",
  });

  // =====================================================
  // LOAD FARMER'S OWN LAND
  // =====================================================

  useEffect(() => {
    fetchLand();
  }, [id]);

  const fetchLand = async () => {
    try {
      setLoading(true);

      // IMPORTANT:
      // Farmer must use /lands/my/{id}
      // because pending/rejected lands are not public.
      const response = await api.get(`/admin/lands/${id}`);

      setForm({
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
        latitude: response.data.latitude ?? "",
        longitude: response.data.longitude ?? "",
        image_url: response.data.image_url || "",
      });
    } catch (error) {
      console.error("Failed to load land:", error);

      alert(
        error.response?.data?.detail ||
          "Failed to load land."
      );

      navigate("/admin/lands");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // HANDLE INPUT
  // =====================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =====================================================
  // UPDATE LAND
  // =====================================================

  const updateLand = async (e) => {
    e.preventDefault();

    try {
      setUpdating(true);

      // IMPORTANT:
      // Farmer uses /lands/{id}
      // NOT /admin/lands/{id}
      const response =  await api.put(`/admin/lands/${id}`, {
        title: form.title,
        description: form.description,

        price: Number(form.price),
        area: Number(form.area),

        village: form.village,
        mandal: form.mandal,
        district: form.district,
        state: form.state,
        pincode: form.pincode,

        survey_number: form.survey_number,

        soil_type: form.soil_type,
        water_source: form.water_source,
        crop_type: form.crop_type,

        latitude:
          form.latitude === ""
            ? null
            : Number(form.latitude),

        longitude:
          form.longitude === ""
            ? null
            : Number(form.longitude),

        image_url: form.image_url || null,
      });

      // =====================================================
      // CHECK ADMIN RE-APPROVAL REQUIREMENT
      // =====================================================

      if (response.data.approval_required === true) {
        alert(
          "Land updated successfully!\n\n" +
          "Your changes require admin approval.\n" +
          "The land is now waiting for admin review."
        );
      } else {
        alert("Land updated successfully!");
      }

      // Farmer goes back to My Lands
      navigate("/admin/lands");

    } catch (error) {
      console.error("Failed to update land:", error);

      const detail = error.response?.data?.detail;

      if (typeof detail === "string") {
        alert(detail);
      } else if (Array.isArray(detail)) {
        alert(
          detail
            .map(
              (item) =>
                item?.msg || JSON.stringify(item)
            )
            .join("\n")
        );
      } else {
        alert("Failed to update land.");
      }
    } finally {
      setUpdating(false);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          marginTop: "100px",
          fontSize: "22px",
          color: "#2E7D32",
          fontWeight: "bold",
        }}
      >
        Loading Land Details...
      </div>
    );
  }

  // =====================================================
  // FORM
  // =====================================================

  return (
    <div
      style={{
        maxWidth: "700px",
        margin: "40px auto",
        padding: "30px",
        border: "1px solid #ddd",
        borderRadius: "10px",
        background: "#fff",
      }}
    >
      <h2
        style={{
          color: "#2E7D32",
          marginBottom: "25px",
        }}
      >
        ✏️ Edit Land
      </h2>

      <form onSubmit={updateLand}>

        <label>Land Title</label>
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="Enter land title"
          required
          style={inputStyle}
        />

        <label>Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Enter description"
          required
          style={{
            ...inputStyle,
            minHeight: "100px",
          }}
        />

        <label>Price</label>
        <input
          name="price"
          type="number"
          value={form.price}
          onChange={handleChange}
          placeholder="Enter price"
          required
          style={inputStyle}
        />

        <label>Area (Acres)</label>
        <input
          name="area"
          type="number"
          value={form.area}
          onChange={handleChange}
          placeholder="Enter area"
          required
          style={inputStyle}
        />

        <h3>📍 Location Details</h3>

        <label>Village</label>
        <input
          name="village"
          value={form.village}
          onChange={handleChange}
          placeholder="Enter village"
          required
          style={inputStyle}
        />

        <label>Mandal</label>
        <input
          name="mandal"
          value={form.mandal}
          onChange={handleChange}
          placeholder="Enter mandal"
          required
          style={inputStyle}
        />

        <label>District</label>
        <input
          name="district"
          value={form.district}
          onChange={handleChange}
          placeholder="Enter district"
          required
          style={inputStyle}
        />

        <label>State</label>
        <input
          name="state"
          value={form.state}
          onChange={handleChange}
          placeholder="Enter state"
          required
          style={inputStyle}
        />

        <label>Pincode</label>
        <input
          name="pincode"
          value={form.pincode}
          onChange={handleChange}
          placeholder="Enter pincode"
          required
          style={inputStyle}
        />

        <label>Survey Number</label>
        <input
          name="survey_number"
          value={form.survey_number}
          onChange={handleChange}
          placeholder="Enter survey number"
          required
          style={inputStyle}
        />

        <h3>🌱 Agriculture Details</h3>

        <label>Soil Type</label>
        <input
          name="soil_type"
          value={form.soil_type}
          onChange={handleChange}
          placeholder="Enter soil type"
          style={inputStyle}
        />

        <label>Water Source</label>
        <input
          name="water_source"
          value={form.water_source}
          onChange={handleChange}
          placeholder="Enter water source"
          style={inputStyle}
        />

        <label>Crop Type</label>
        <input
          name="crop_type"
          value={form.crop_type}
          onChange={handleChange}
          placeholder="Enter crop type"
          style={inputStyle}
        />

        <h3>🗺️ Location Coordinates</h3>

        <label>Latitude</label>
        <input
          name="latitude"
          type="number"
          step="any"
          value={form.latitude}
          onChange={handleChange}
          placeholder="Latitude"
          style={inputStyle}
        />

        <label>Longitude</label>
        <input
          name="longitude"
          type="number"
          step="any"
          value={form.longitude}
          onChange={handleChange}
          placeholder="Longitude"
          style={inputStyle}
        />

        <button
          type="submit"
          disabled={updating}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "20px",
            background: "#2E7D32",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: updating
              ? "not-allowed"
              : "pointer",
            fontSize: "16px",
            opacity: updating ? 0.6 : 1,
          }}
        >
          {updating
            ? "Updating..."
            : "Update Land"}
        </button>

        <button
          type="button"
          onClick={() => navigate("/admin/lands")}
          disabled={updating}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "10px",
            background: "#757575",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Cancel
        </button>

      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "11px",
  marginTop: "6px",
  marginBottom: "18px",
  border: "1px solid #ccc",
  borderRadius: "6px",
  fontSize: "15px",
  boxSizing: "border-box",
};

export default EditLand;