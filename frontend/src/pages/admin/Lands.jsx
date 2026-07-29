import { useEffect, useState } from "react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";

function Lands() {
  const [lands, setLands] = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchLands();
  }, []);

  const fetchLands = async () => {
    try {
      const response = await api.get("/admin/lands");
      setLands(response.data);
    } catch (error) {
      console.log(error);
      alert("Failed to load lands");
    }
  };

  const deleteLand = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this land?"
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`/admin/lands/${id}`);

      alert("Land deleted successfully");

      fetchLands();
    } catch (error) {
      console.log(error);
      alert("Failed to delete land");
    }
  };
const filteredLands = lands.filter((land) =>
  land.title.toLowerCase().includes(search.toLowerCase()) ||
  land.owner_name.toLowerCase().includes(search.toLowerCase()) ||
  land.village.toLowerCase().includes(search.toLowerCase()) ||
  land.district.toLowerCase().includes(search.toLowerCase()) ||
  (land.crop_type || "").toLowerCase().includes(search.toLowerCase())
);

  return (
    <div style={{ padding: "30px" }}>
      <h1>🌾 Land Management</h1>
      <input
  type="text"
  placeholder="Search by title, owner, village, district or crop..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  style={{
    width: "350px",
    padding: "10px",
    margin: "20px 0",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "16px",
  }}
/>

      <table
        border="1"
        cellPadding="10"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "20px",
        }}
      >
        <thead>
          <tr>
            <th>ID</th>
            <th>Image</th>
            <th>Owner</th>
            <th>Email</th>
            <th>Mobile</th>
            <th>Title</th>
            <th>Village</th>
            <th>District</th>
            <th>Area</th>
            <th>Price</th>
            <th>Crop</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
            {filteredLands.map((land) => (
          
            <tr key={land.id}>
              <td>{land.id}</td>

              <td>
                {land.image_url ? (
                  <img
                    src={land.image_url}
                    alt={land.title}
                    width="80"
                    height="60"
                    style={{
                      objectFit: "cover",
                      borderRadius: "5px",
                    }}
                  />
                ) : (
                  "No Image"
                )}
              </td>

              <td>{land.owner_name}</td>

              <td>{land.owner_email}</td>

              <td>{land.owner_mobile}</td>

              <td>{land.title}</td>

              <td>{land.village}</td>

              <td>{land.district}</td>

              <td>{land.area} Acres</td>

              <td>₹ {land.price}</td>

              <td>{land.crop_type}</td>

              <td>
                <button
                  onClick={() => navigate(`/admin/edit-land/${land.id}`)}
                  style={{
                   backgroundColor: "#1976D2",
                   color: "white",
                   border: "none",
                   padding: "8px 12px",
                   marginRight: "10px",
                   borderRadius: "5px",
                   cursor: "pointer",
                 }}
              >
                Edit
            </button>

           <button
             onClick={() => deleteLand(land.id)}
             style={{
               backgroundColor: "#d32f2f",
               color: "white",
               border: "none",
               padding: "8px 12px",
               borderRadius: "5px",
               cursor: "pointer",
              }}
             >
               Delete
            </button>
          </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Lands;