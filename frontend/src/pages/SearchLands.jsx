import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";

const EMPTY_FILTERS = {
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
};

function SearchLands() {
  const [loading, setLoading] = useState(false);
  const [lands, setLands] = useState([]);
  const [searchParams] = useSearchParams();

  // =========================================================
  // SEARCH FILTERS
  // =========================================================

  const [filters, setFilters] = useState({
    ...EMPTY_FILTERS,
  });

  // =========================================================
  // SAVED SEARCHES
  // =========================================================

  const [savedSearches, setSavedSearches] = useState([]);
  const [savedSearchesLoading, setSavedSearchesLoading] =
    useState(false);
  const [savingSearch, setSavingSearch] = useState(false);
  const [deletingSearchId, setDeletingSearchId] =
    useState(null);

  // =========================================================
  // LOAD LANDS
  // =========================================================

  const loadLands = async (currentFilters = filters) => {
    try {
      setLoading(true);

      const params = {};

      Object.entries(currentFilters).forEach(
        ([key, value]) => {
          if (
            value !== "" &&
            value !== null &&
            value !== undefined
          ) {
            params[key] = value;
          }
        }
      );

      const response = await api.get("/lands/search", {
        params,
      });

      setLands(response.data || []);
    } catch (err) {
      console.error("Failed to load lands:", err);
      alert("Failed to load lands");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // LOAD SAVED SEARCHES
  // =========================================================

  const loadSavedSearches = async () => {
    try {
      setSavedSearchesLoading(true);

      const response = await api.get(
        "/saved-searches/"
      );

      setSavedSearches(response.data || []);
    } catch (error) {
      console.error(
        "Failed to load saved searches:",
        error
      );

      setSavedSearches([]);
    } finally {
      setSavedSearchesLoading(false);
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    const district = searchParams.get("district");

    if (district) {
      const updatedFilters = {
        ...EMPTY_FILTERS,
        district,
      };

      setFilters(updatedFilters);
      loadLands(updatedFilters);
    } else {
      loadLands(EMPTY_FILTERS);
    }

    loadSavedSearches();
  }, []);

  // =========================================================
  // HANDLE FILTER CHANGE
  // =========================================================

  const handleChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  // =========================================================
  // CLEAR FILTERS
  // =========================================================

  const clearFilters = () => {
    const clearedFilters = {
      ...EMPTY_FILTERS,
    };

    setFilters(clearedFilters);
    loadLands(clearedFilters);
  };

  // =========================================================
  // SAVE CURRENT SEARCH
  // =========================================================

  const saveCurrentSearch = async () => {
    const hasFilters = Object.values(filters).some(
      (value) =>
        value !== "" &&
        value !== null &&
        value !== undefined
    );

    if (!hasFilters) {
      alert(
        "Please select at least one search filter before saving."
      );
      return;
    }

    const name = window.prompt(
      "Enter a name for this saved search:"
    );

    if (name === null) {
      return;
    }

    const trimmedName = name.trim();

    if (!trimmedName) {
      alert("Please enter a saved search name.");
      return;
    }

    if (trimmedName.length > 100) {
      alert(
        "Saved search name cannot exceed 100 characters."
      );
      return;
    }

    try {
      setSavingSearch(true);

      await api.post("/saved-searches/", {
        name: trimmedName,
        district: filters.district || null,
        village: filters.village || null,
        mandal: filters.mandal || null,
        crop_type: filters.crop_type || null,
        soil_type: filters.soil_type || null,
        water_source: filters.water_source || null,
        min_price:
          filters.min_price !== ""
            ? Number(filters.min_price)
            : null,
        max_price:
          filters.max_price !== ""
            ? Number(filters.max_price)
            : null,
        min_area:
          filters.min_area !== ""
            ? Number(filters.min_area)
            : null,
        max_area:
          filters.max_area !== ""
            ? Number(filters.max_area)
            : null,
      });

      alert("Search saved successfully.");

      await loadSavedSearches();
    } catch (error) {
      console.error(
        "Failed to save search:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to save search."
      );
    } finally {
      setSavingSearch(false);
    }
  };

  // =========================================================
  // APPLY SAVED SEARCH
  // =========================================================

  const applySavedSearch = (savedSearch) => {
    const appliedFilters = {
      district: savedSearch.district || "",
      village: savedSearch.village || "",
      mandal: savedSearch.mandal || "",
      crop_type: savedSearch.crop_type || "",
      soil_type: savedSearch.soil_type || "",
      water_source: savedSearch.water_source || "",
      min_price:
        savedSearch.min_price !== null &&
        savedSearch.min_price !== undefined
          ? String(savedSearch.min_price)
          : "",
      max_price:
        savedSearch.max_price !== null &&
        savedSearch.max_price !== undefined
          ? String(savedSearch.max_price)
          : "",
      min_area:
        savedSearch.min_area !== null &&
        savedSearch.min_area !== undefined
          ? String(savedSearch.min_area)
          : "",
      max_area:
        savedSearch.max_area !== null &&
        savedSearch.max_area !== undefined
          ? String(savedSearch.max_area)
          : "",
    };

    setFilters(appliedFilters);

    loadLands(appliedFilters);
  };

  // =========================================================
  // DELETE SAVED SEARCH
  // =========================================================

  const deleteSavedSearch = async (savedSearchId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this saved search?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingSearchId(savedSearchId);

      await api.delete(
        `/saved-searches/${savedSearchId}`
      );

      setSavedSearches((previous) =>
        previous.filter(
          (search) => search.id !== savedSearchId
        )
      );

      alert("Saved search deleted successfully.");
    } catch (error) {
      console.error(
        "Failed to delete saved search:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to delete saved search."
      );
    } finally {
      setDeletingSearchId(null);
    }
  };

  // =========================================================
  // FORMAT SAVED SEARCH DESCRIPTION
  // =========================================================

  const getSavedSearchDescription = (savedSearch) => {
    const parts = [];

    if (savedSearch.district) {
      parts.push(`District: ${savedSearch.district}`);
    }

    if (savedSearch.village) {
      parts.push(`Village: ${savedSearch.village}`);
    }

    if (savedSearch.mandal) {
      parts.push(`Mandal: ${savedSearch.mandal}`);
    }

    if (savedSearch.crop_type) {
      parts.push(
        `Crop: ${savedSearch.crop_type}`
      );
    }

    if (savedSearch.soil_type) {
      parts.push(
        `Soil: ${savedSearch.soil_type}`
      );
    }

    if (savedSearch.water_source) {
      parts.push(
        `Water: ${savedSearch.water_source}`
      );
    }

    if (
      savedSearch.min_price !== null &&
      savedSearch.min_price !== undefined
    ) {
      parts.push(
        `Min Price: ₹${Number(
          savedSearch.min_price
        ).toLocaleString("en-IN")}`
      );
    }

    if (
      savedSearch.max_price !== null &&
      savedSearch.max_price !== undefined
    ) {
      parts.push(
        `Max Price: ₹${Number(
          savedSearch.max_price
        ).toLocaleString("en-IN")}`
      );
    }

    if (
      savedSearch.min_area !== null &&
      savedSearch.min_area !== undefined
    ) {
      parts.push(
        `Min Area: ${savedSearch.min_area} Acres`
      );
    }

    if (
      savedSearch.max_area !== null &&
      savedSearch.max_area !== undefined
    ) {
      parts.push(
        `Max Area: ${savedSearch.max_area} Acres`
      );
    }

    return parts.length > 0
      ? parts.join(" • ")
      : "No filters";
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="container mt-4">

      <h2 className="mb-4">
        🔍 Search Farmland
      </h2>

      {/* =====================================================
          SEARCH FILTERS
      ===================================================== */}

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

      {/* =====================================================
          SEARCH BUTTONS
      ===================================================== */}

      <div className="mt-4">

        <button
          className="btn btn-success me-2"
          onClick={() => loadLands(filters)}
          disabled={loading}
        >
          {loading
            ? "Searching..."
            : "Search"}
        </button>

        <button
          className="btn btn-secondary me-2"
          onClick={clearFilters}
          disabled={loading}
        >
          Clear Filters
        </button>

        <button
          className="btn btn-outline-primary"
          onClick={saveCurrentSearch}
          disabled={
            savingSearch || loading
          }
        >
          {savingSearch
            ? "Saving..."
            : "💾 Save Search"}
        </button>

      </div>

      {/* =====================================================
          SAVED SEARCHES
      ===================================================== */}

      <div
        className="mt-4"
        style={{
          background: "#f8f9fa",
          border: "1px solid #dee2e6",
          borderRadius: "10px",
          padding: "20px",
        }}
      >

        <div
          className="d-flex justify-content-between align-items-center mb-3"
        >
          <h4 className="mb-0">
            ⭐ My Saved Searches
          </h4>

          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={loadSavedSearches}
            disabled={savedSearchesLoading}
          >
            {savedSearchesLoading
              ? "Loading..."
              : "Refresh"}
          </button>
        </div>

        {savedSearchesLoading ? (
          <p className="mb-0">
            Loading saved searches...
          </p>
        ) : savedSearches.length === 0 ? (
          <p
            className="text-muted mb-0"
          >
            You don't have any saved searches yet.
          </p>
        ) : (
          <div>
            {savedSearches.map(
              (savedSearch) => (
                <div
                  key={savedSearch.id}
                  className="card mb-2"
                >
                  <div className="card-body">

                    <div
                      className="d-flex justify-content-between align-items-start gap-3"
                    >

                      <div
                        style={{
                          minWidth: 0,
                          flex: 1,
                        }}
                      >

                        <h5 className="mb-1">
                          {savedSearch.name}
                        </h5>

                        <p
                          className="text-muted mb-0"
                          style={{
                            fontSize: "14px",
                          }}
                        >
                          {getSavedSearchDescription(
                            savedSearch
                          )}
                        </p>

                      </div>

                      <div
                        className="d-flex gap-2"
                        style={{
                          flexShrink: 0,
                        }}
                      >

                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() =>
                            applySavedSearch(
                              savedSearch
                            )
                          }
                          disabled={loading}
                        >
                          Apply
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() =>
                            deleteSavedSearch(
                              savedSearch.id
                            )
                          }
                          disabled={
                            deletingSearchId ===
                            savedSearch.id
                          }
                        >
                          {deletingSearchId ===
                          savedSearch.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>

                      </div>

                    </div>

                  </div>
                </div>
              )
            )}
          </div>
        )}

      </div>

      <hr />

      {/* =====================================================
          SEARCH RESULT COUNT
      ===================================================== */}

      {loading ? (
        <h4>
          Loading Lands...
        </h4>
      ) : (
        <h4>
          {lands.length} Lands Found
        </h4>
      )}

      {/* =====================================================
          LAND RESULTS
      ===================================================== */}

      {lands.length === 0 ? (
        <div className="alert alert-warning">
          No lands found.
        </div>
      ) : (
        lands.map((land) => (
          <div
            className="card mb-3"
            key={land.id}
          >

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

              <h4>
                {land.title}
              </h4>

              <p>
                {land.description}
              </p>

              <p>
                <strong>
                  Price:
                </strong>{" "}
                ₹{land.price}
              </p>

              <p>
                <strong>
                  Area:
                </strong>{" "}
                {land.area} Acres
              </p>

              <p>
                <strong>
                  Location:
                </strong>{" "}
                {land.village},{" "}
                {land.mandal},{" "}
                {land.district}
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