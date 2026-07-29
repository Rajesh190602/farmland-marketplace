import { useEffect, useState } from "react";
import api from "../services/api";

function SearchLands() {
  const [lands, setLands] = useState([]);

  const [filters, setFilters] = useState({
    district: "",
    village: "",
    mandal: "",
    crop_type: "",
    soil_type: "",
    water_source: "",
    min_price: "",
    max_price: "",
    min_area: "",
    max_area: "",
  });

  const loadLands = async () => {
  try {
    const params = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        params[key] = value;
      }
    });

    const response = await api.get("/lands/search", {
      params,
    });

    setLands(response.data);
  } catch (err) {
    console.error(err);

    if (err.response) {
      console.log(err.response.data);
    }
  }
};

  useEffect(() => {
    loadLands();
  }, []);

  const handleChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>Search Farmland</h2>

      <input
        name="district"
        placeholder="District"
        value={filters.district}
        onChange={handleChange}
      />

      <input
        name="village"
        placeholder="Village"
        value={filters.village}
        onChange={handleChange}
      />

      <input
        name="crop_type"
        placeholder="Crop"
        value={filters.crop_type}
        onChange={handleChange}
      />

      <input
        name="min_price"
        placeholder="Minimum Price"
        value={filters.min_price}
        onChange={handleChange}
      />

      <input
        name="max_price"
        placeholder="Maximum Price"
        value={filters.max_price}
        onChange={handleChange}
      />

      <button onClick={loadLands}>
        Search
      </button>

      <hr />

      {lands.length === 0 ? (
        <h3>No Lands Found</h3>
      ) : (
        lands.map((land) => (
          <div
            key={land.id}
            style={{
              border: "1px solid #ccc",
              padding: 15,
              marginBottom: 15,
            }}
          >
            <h3>{land.title}</h3>

            <p>{land.description}</p>

            <p>₹ {land.price}</p>

            <p>{land.area} Acres</p>

            <p>
              {land.village}, {land.mandal}, {land.district}
            </p>
          </div>
        ))
      )}
    </div>
  );
}

export default SearchLands;