import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function SearchLands() {
  const [loading, setLoading] = useState(false);
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
    setLoading(true);

    const params = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "") {
        params[key] = value;
      }
    });

    const response = await api.get("/lands/search", {
      params,
    });

    setLands(response.data);

  } catch (err) {
    console.error(err);
    alert("Failed to load lands");
  } finally {
    setLoading(false);
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

  const clearFilters = () => {
    setFilters({
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

    setTimeout(loadLands, 100);
  };

  return (
    <div className="container mt-4">

      <h2 className="mb-4">🔍 Search Farmland</h2>

      <div className="row g-3">

        <div className="col-md-4">
          <input
            className="form-control"
            name="district"
            placeholder="District"
            value={filters.district}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4">
          <input
            className="form-control"
            name="village"
            placeholder="Village"
            value={filters.village}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4">
          <input
            className="form-control"
            name="mandal"
            placeholder="Mandal"
            value={filters.mandal}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4">
          <input
            className="form-control"
            name="crop_type"
            placeholder="Crop Type"
            value={filters.crop_type}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4">
          <input
            className="form-control"
            name="soil_type"
            placeholder="Soil Type"
            value={filters.soil_type}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-4">
          <input
            className="form-control"
            name="water_source"
            placeholder="Water Source"
            value={filters.water_source}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-3">
          <input
            type="number"
            className="form-control"
            name="min_price"
            placeholder="Min Price"
            value={filters.min_price}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-3">
          <input
            type="number"
            className="form-control"
            name="max_price"
            placeholder="Max Price"
            value={filters.max_price}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-3">
          <input
            type="number"
            className="form-control"
            name="min_area"
            placeholder="Min Area"
            value={filters.min_area}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-3">
          <input
            type="number"
            className="form-control"
            name="max_area"
            placeholder="Max Area"
            value={filters.max_area}
            onChange={handleChange}
          />
        </div>

      </div>

      <div className="mt-4">
        <button
          className="btn btn-success me-2"
          onClick={loadLands}
          disabled={loading}

        >
           {loading ? "Searching..." : "Search"}
        </button>

        <button
          className="btn btn-secondary"
          onClick={clearFilters}
        >
          Clear Filters
        </button>
      </div>

      <hr />
      {loading ? (
         <h4>Loading Lands...</h4>
      ) : (
        <h4>{lands.length} Lands Found</h4>
      )}


      

      {lands.length === 0 ? (
        <div className="alert alert-warning">
          No lands found.
        </div>
      ) : (
        lands.map((land) => (
          <div className="card mb-3" key={land.id}>
            <div className="card-body">
              {land.image_url && (
                <img
                  src={land.image_url}
                  alt={land.title}
                  style={{
                    width: "100%",
                    height: "220px",
                    objectFit: "cover",
                    borderRadius: "8px",
                    marginBottom: "15px",
                  }}
                />
              )}





              <h4>{land.title}</h4>

              <p>{land.description}</p>

              <p>
                <strong>Price:</strong> ₹{land.price}
              </p>

              <p>
                <strong>Area:</strong> {land.area} Acres
              </p>

              <p>
                <strong>Location:</strong> {land.village}, {land.mandal}, {land.district}
              </p>

              <Link
                className="btn btn-primary"
                to={`/land/${land.id}`}
              >
                View Details
              </Link>

            </div>
          </div>
        ))
      )}

    </div>
  );
}

export default SearchLands;