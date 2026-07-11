import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

function AddLand() {
  const navigate = useNavigate();

  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);

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
      "/upload/image",
      imageData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    setUploading(false);

    return response.data.image_url;

  } catch (error) {
    console.log(error);
    setUploading(false);

    alert("Image upload failed");

    return "";
  }
};
  const addLand = async (e) => {
  e.preventDefault();

  try {

    let imageUrl = "";

    if (selectedImage) {
      imageUrl = await uploadImage();
    }

    await api.post("/lands", {
      ...formData,
      image_url: imageUrl,
      price: Number(formData.price),
      area: Number(formData.area),
    });

    alert("Land Added Successfully!");

    navigate("/my-lands");

  } catch (error) {

    console.log(error);

    if (error.response) {
      alert(error.response.data.detail);
    } else {
      alert("Server Error");
    }
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

<br /><br />

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

        <form onSubmit={addLand}>

          <input
            type="text"
            name="title"
            placeholder="Land Title"
            value={formData.title}
            onChange={handleChange}
            required
          />
          <br /><br />

          <textarea
            name="description"
            placeholder="Description"
            value={formData.description}
            onChange={handleChange}
            required
          />
          <br /><br />

          <input
            type="number"
            name="price"
            placeholder="Price"
            value={formData.price}
            onChange={handleChange}
            required
          />
          <br /><br />

          <input
            type="number"
            name="area"
            placeholder="Area (Acres)"
            value={formData.area}
            onChange={handleChange}
            required
          />
          <br /><br />

          <input
            type="text"
            name="village"
            placeholder="Village"
            value={formData.village}
            onChange={handleChange}
            required
          />
          <br /><br />

          <input
            type="text"
            name="mandal"
            placeholder="Mandal"
            value={formData.mandal}
            onChange={handleChange}
            required
          />
          <br /><br />

          <input
            type="text"
            name="district"
            placeholder="District"
            value={formData.district}
            onChange={handleChange}
            required
          />
          <br /><br />

          <input
            type="text"
            name="state"
            placeholder="State"
            value={formData.state}
            onChange={handleChange}
            required
          />
          <br /><br />

          <input
            type="text"
            name="pincode"
            placeholder="Pincode"
            value={formData.pincode}
            onChange={handleChange}
            required
          />
          <br /><br />

          <input
            type="text"
            name="survey_number"
            placeholder="Survey Number"
            value={formData.survey_number}
            onChange={handleChange}
            required
          />
          <br /><br />

          <input
            type="text"
            name="soil_type"
            placeholder="Soil Type"
            value={formData.soil_type}
            onChange={handleChange}
            required
          />
          <br /><br />

          <input
            type="text"
            name="water_source"
            placeholder="Water Source"
            value={formData.water_source}
            onChange={handleChange}
            required
          />
          <br /><br />

          <input
            type="text"
            name="crop_type"
            placeholder="Crop Type"
            value={formData.crop_type}
            onChange={handleChange}
            required
          />
          <br /><br />

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "12px",
              background: "#2E7D32",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            Add Land
          </button>

        </form>
      </div>
    </>
  );
}

export default AddLand;