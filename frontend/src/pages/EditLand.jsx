import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

function EditLand() {
  const { id } = useParams();
  const navigate = useNavigate();

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
  });

  useEffect(() => {
    loadLand();
  }, []);

  const loadLand = async () => {
    try {
      const response = await api.get(`/lands/${id}`);
      setLand(response.data);
    } catch (error) {
      console.log(error);
      alert("Failed to load land details.");
      navigate("/my-lands");
    }
  };

  const handleChange = (e) => {
    setLand({
      ...land,
      [e.target.name]: e.target.value,
    });
  };

  const updateLand = async (e) => {
    e.preventDefault();

    try {
      await api.put(`/lands/${id}`, {
        title: land.title,
        description: land.description,
        price: Number(land.price),
        area: Number(land.area),
        village: land.village,
        mandal: land.mandal,
        district: land.district,
        state: land.state,
        pincode: land.pincode,
        survey_number: land.survey_number,
        soil_type: land.soil_type,
        water_source: land.water_source,
        crop_type: land.crop_type,
      });

      alert("Land updated successfully!");

      navigate("/my-lands");
    } catch (error) {
      console.log(error);

      if (error.response) {
        alert(error.response.data.detail || "Update failed");
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
          <br /><br />

          <textarea
            name="description"
            value={land.description}
            onChange={handleChange}
            placeholder="Description"
            required
          />
          <br /><br />

          <input
            type="number"
            name="price"
            value={land.price}
            onChange={handleChange}
            placeholder="Price"
            required
          />
          <br /><br />

          <input
            type="number"
            name="area"
            value={land.area}
            onChange={handleChange}
            placeholder="Area"
            required
          />
          <br /><br />

          <input
            type="text"
            name="village"
            value={land.village}
            onChange={handleChange}
            placeholder="Village"
            required
          />
          <br /><br />

          <input
            type="text"
            name="mandal"
            value={land.mandal}
            onChange={handleChange}
            placeholder="Mandal"
            required
          />
          <br /><br />

          <input
            type="text"
            name="district"
            value={land.district}
            onChange={handleChange}
            placeholder="District"
            required
          />
          <br /><br />

          <input
            type="text"
            name="state"
            value={land.state}
            onChange={handleChange}
            placeholder="State"
            required
          />
          <br /><br />

          <input
            type="text"
            name="pincode"
            value={land.pincode}
            onChange={handleChange}
            placeholder="Pincode"
            required
          />
          <br /><br />

          <input
            type="text"
            name="survey_number"
            value={land.survey_number}
            onChange={handleChange}
            placeholder="Survey Number"
            required
          />
          <br /><br />

          <input
            type="text"
            name="soil_type"
            value={land.soil_type}
            onChange={handleChange}
            placeholder="Soil Type"
            required
          />
          <br /><br />

          <input
            type="text"
            name="water_source"
            value={land.water_source}
            onChange={handleChange}
            placeholder="Water Source"
            required
          />
          <br /><br />

          <input
            type="text"
            name="crop_type"
            value={land.crop_type}
            onChange={handleChange}
            placeholder="Crop Type"
            required
          />
          <br /><br />

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="submit"
              style={{
                flex: 1,
                background: "#2E7D32",
                color: "white",
                border: "none",
                padding: "12px",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              Update Land
            </button>

            <button
              type="button"
              onClick={() => navigate("/my-lands")}
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