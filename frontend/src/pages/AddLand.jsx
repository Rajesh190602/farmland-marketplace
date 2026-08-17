import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import LocationPicker from "../components/LocationPicker";
import api from "../services/api";

function AddLand() {
  const [addingLand, setAddingLand] = useState(false);
  const navigate = useNavigate();

  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
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
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setSelectedImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const uploadImage = async () => {
    if (!selectedImage) return "";

    try {
      setUploading(true);

      const imageData = new FormData();
      imageData.append("file", selectedImage);

      const response = await api.post(
        "/upload/",
        imageData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log(
        "Cloudinary Response:",
        response.data
      );

      return response.data.url;
    } catch (error) {
      console.error(error);

      if (error.response) {
        alert(
          error.response.data.detail ||
            "Image upload failed."
        );
      } else {
        alert("Image upload failed.");
      }

      return "";
    } finally {
      setUploading(false);
    }
  };

  const addLand = async (e) => {
    e.preventDefault();

    // ==========================
    // Validation
    // ==========================

    if (!formData.title.trim()) {
      alert("Please enter the land title.");
      return;
    }

    if (Number(formData.price) <= 0) {
      alert("Enter a valid land price.");
      return;
    }

    if (Number(formData.area) <= 0) {
      alert("Enter a valid land area.");
      return;
    }

    if (!latitude || !longitude) {
      alert(
        "Please select the land location on the map."
      );
      return;
    }

    try {
      setAddingLand(true);

      let imageUrl = "";

      // ==========================
      // Upload Image
      // ==========================

      if (selectedImage) {
        imageUrl = await uploadImage();

        // Stop if image upload failed
        if (!imageUrl) {
          setAddingLand(false);
          return;
        }
      }

      console.log("Latitude:", latitude);
      console.log("Longitude:", longitude);

      // ==========================
      // Create Land
      // ==========================

      const response = await api.post("/lands", {
        ...formData,
        image_url: imageUrl,
        price: Number(formData.price),
        area: Number(formData.area),
        latitude,
        longitude,
      });

      console.log(
        "Land creation response:",
        response.data
      );

      // ==========================
      // SUCCESS MESSAGE
      // ==========================

      const successMessage =
        response.data?.message ||
        "Land added successfully and is waiting for admin approval.";

      alert(
        `✅ ${successMessage}\n\n⏳ Your land will become visible to buyers after admin approval.`
      );

      // ==========================
      // Clear Form
      // ==========================

      setFormData({
        title: "",
        description: "",
        image_url: "",
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
      });

      setSelectedImage(null);
      setPreview("");
      setLatitude(null);
      setLongitude(null);

      // ==========================
      // Go To My Lands
      // ==========================

      navigate("/my-lands");
    } catch (error) {
      console.error(
        "Add land error:",
        error
      );

      if (error.response) {
        alert(
          error.response.data.detail ||
            "Failed to add land."
        );
      } else {
        alert("Server Error.");
      }
    } finally {
      setAddingLand(false);
    }
  };

  return (
    <>
      <Navbar />

      <div
        style={{
          maxWidth: "700px",
          margin: "30px auto",
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "10px",
          background: "#fff",
        }}
      >
        <h1>Add New Land</h1>

        <h3>Upload Land Image</h3>

        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
        />

        <br />
        <br />

        {preview && (
          <img
            src={preview}
            alt="Preview"
            width="300"
            style={{
              borderRadius: "10px",
              border: "1px solid #ccc",
              marginBottom: "20px",
            }}
          />
        )}

        {uploading && (
          <p>Uploading Image...</p>
        )}

        <br />

        <LocationPicker
          latitude={latitude}
          longitude={longitude}
          setLatitude={setLatitude}
          setLongitude={setLongitude}
        />

        <br />

        <form onSubmit={addLand}>
          <input
            type="text"
            name="title"
            placeholder="Land Title"
            value={formData.title}
            onChange={handleChange}
            required
          />

          <br />
          <br />

          <textarea
            name="description"
            placeholder="Description"
            value={formData.description}
            onChange={handleChange}
            required
          />

          <br />
          <br />

          <input
            type="number"
            name="price"
            placeholder="Price"
            value={formData.price}
            onChange={handleChange}
            required
          />

          <br />
          <br />

          <input
            type="number"
            name="area"
            placeholder="Area (Acres)"
            value={formData.area}
            onChange={handleChange}
            required
          />

          <br />
          <br />

          <input
            type="text"
            name="village"
            placeholder="Village"
            value={formData.village}
            onChange={handleChange}
            required
          />

          <br />
          <br />

          <input
            type="text"
            name="mandal"
            placeholder="Mandal"
            value={formData.mandal}
            onChange={handleChange}
            required
          />

          <br />
          <br />

          <input
            type="text"
            name="district"
            placeholder="District"
            value={formData.district}
            onChange={handleChange}
            required
          />

          <br />
          <br />

          <input
            type="text"
            name="state"
            placeholder="State"
            value={formData.state}
            onChange={handleChange}
            required
          />

          <br />
          <br />

          <input
            type="text"
            name="pincode"
            placeholder="Pincode"
            value={formData.pincode}
            onChange={handleChange}
            required
          />

          <br />
          <br />

          <input
            type="text"
            name="survey_number"
            placeholder="Survey Number"
            value={formData.survey_number}
            onChange={handleChange}
            required
          />

          <br />
          <br />

          <input
            type="text"
            name="soil_type"
            placeholder="Soil Type"
            value={formData.soil_type}
            onChange={handleChange}
            required
          />

          <br />
          <br />

          <input
            type="text"
            name="water_source"
            placeholder="Water Source"
            value={formData.water_source}
            onChange={handleChange}
            required
          />

          <br />
          <br />

          <input
            type="text"
            name="crop_type"
            placeholder="Crop Type"
            value={formData.crop_type}
            onChange={handleChange}
            required
          />

          <br />
          <br />

          <button
            type="submit"
            disabled={
              addingLand || uploading
            }
            style={{
              width: "100%",
              padding: "12px",
              background: "#2E7D32",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor:
                addingLand || uploading
                  ? "not-allowed"
                  : "pointer",
              fontSize: "16px",
              opacity:
                addingLand || uploading
                  ? 0.7
                  : 1,
            }}
          >
            {uploading
              ? "Uploading Image..."
              : addingLand
              ? "Adding Land..."
              : "Add Land"}
          </button>
        </form>
      </div>
    </>
  );
}

export default AddLand;