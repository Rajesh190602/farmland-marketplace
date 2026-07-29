import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";

function EditLand() {
  const navigate = useNavigate();
  const { id } = useParams();

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

  useEffect(() => {
    fetchLand();
  }, []);

  const fetchLand = async () => {
    try {
      const response = await api.get(`/admin/lands/${id}`);
      setForm(response.data);
    } catch (error) {
      console.log(error);
      alert("Failed to load land");
    }
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const updateLand = async (e) => {
    e.preventDefault();

    try {
      await api.put(`/admin/lands/${id}`, form);

      alert("Land updated successfully");

      navigate("/admin/lands");
    } catch (error) {
      console.log(error);
      alert("Failed to update land");
    }
  };

  return (
    <div
      style={{
        maxWidth: "700px",
        margin: "40px auto",
        padding: "30px",
        border: "1px solid #ddd",
        borderRadius: "10px",
      }}
    >
      <h2>✏️ Edit Land</h2>

      <form onSubmit={updateLand}>

        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="Title"
        />
        <br /><br />

        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Description"
        />
        <br /><br />

        <input
          name="price"
          type="number"
          value={form.price}
          onChange={handleChange}
          placeholder="Price"
        />
        <br /><br />

        <input
          name="area"
          type="number"
          value={form.area}
          onChange={handleChange}
          placeholder="Area"
        />
        <br /><br />

        <input
          name="village"
          value={form.village}
          onChange={handleChange}
          placeholder="Village"
        />
        <br /><br />

        <input
          name="mandal"
          value={form.mandal}
          onChange={handleChange}
          placeholder="Mandal"
        />
        <br /><br />

        <input
          name="district"
          value={form.district}
          onChange={handleChange}
          placeholder="District"
        />
        <br /><br />

        <input
          name="state"
          value={form.state}
          onChange={handleChange}
          placeholder="State"
        />
        <br /><br />

        <input
          name="crop_type"
          value={form.crop_type}
          onChange={handleChange}
          placeholder="Crop Type"
        />
        <br /><br />

        <button
          type="submit"
          style={{
            padding: "10px 20px",
            background: "#2E7D32",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Update Land
        </button>

      </form>
    </div>
  );
}

export default EditLand;