import { useEffect, useState } from "react";
import api from "../../services/api";

function PendingLands() {
  const [lands, setLands] = useState([]);
  const [filteredLands, setFilteredLands] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingLands();
  }, []);

  useEffect(() => {
    const keyword = search.toLowerCase();

    const result = lands.filter((land) => {
      return (
        land.title?.toLowerCase().includes(keyword) ||
        land.village?.toLowerCase().includes(keyword) ||
        land.owner_name?.toLowerCase().includes(keyword)
      );
    });

    setFilteredLands(result);
  }, [search, lands]);

  const fetchPendingLands = async () => {
    try {
      setLoading(true);

      const response = await api.get("/admin/lands/pending");

      setLands(response.data);
      setFilteredLands(response.data);
    } catch (error) {
      console.log(error);
      alert("Failed to load pending lands");
    } finally {
      setLoading(false);
    }
  };

  const approveLand = async (id) => {
    if (!window.confirm("Approve this land?")) return;

    try {
      await api.put(`/admin/lands/${id}/approve`);
      alert("Land Approved");
      fetchPendingLands();
    } catch (error) {
      console.log(error);
      alert("Approval failed");
    }
  };

  const requestChanges = async (id) => {
    const reason = prompt("Enter reason for requesting changes:");

    if (!reason) return;

    try {
      await api.put(`/admin/lands/${id}/request-changes`, {
        reason,
      });

      alert("Changes Requested");
      fetchPendingLands();
    } catch (error) {
      console.log(error);
      alert("Request failed");
    }
  };

  const rejectLand = async (id) => {
    const reason = prompt("Reason for rejection:");

    if (!reason) return;

    try {
      await api.put(`/admin/lands/${id}/reject`, {
        reason,
      });

      alert("Land Rejected");
      fetchPendingLands();
    } catch (error) {
      console.log(error);
      alert("Reject failed");
    }
  };
    if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          marginTop: "100px",
          fontSize: "24px",
          color: "#2E7D32",
          fontWeight: "bold",
        }}
      >
        Loading Pending Lands...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5F7FA",
        padding: "30px",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg,#FB8C00,#FDD835)",
          color: "#fff",
          padding: "25px",
          borderRadius: "18px",
          marginBottom: "30px",
        }}
      >
        <h1 style={{ margin: 0 }}>
          🟡 Pending Land Approvals
        </h1>

        <p style={{ marginTop: "10px" }}>
          Review and approve newly submitted lands.
        </p>
      </div>

      <input
        type="text"
        placeholder="Search by title, village or owner..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "10px",
          border: "1px solid #ccc",
          marginBottom: "25px",
          fontSize: "16px",
        }}
      />

      <h3>
        Pending Lands : {filteredLands.length}
      </h3>

      {filteredLands.length === 0 ? (
        <div
          style={{
            background: "#fff",
            padding: "40px",
            borderRadius: "15px",
            textAlign: "center",
            marginTop: "30px",
          }}
        >
          <h2>No Pending Lands</h2>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(340px,1fr))",
            gap: "20px",
            marginTop: "20px",
          }}
        >
          {filteredLands.map((land) => (
            <div
              key={land.id}
              style={{
                background: "#fff",
                borderRadius: "15px",
                padding: "20px",
                boxShadow: "0 5px 15px rgba(0,0,0,.1)",
              }}
            >
              <img
                src={land.image_url}
                alt={land.title}
                style={{
                  width: "100%",
                  height: "220px",
                  objectFit: "cover",
                  borderRadius: "10px",
                  marginBottom: "15px",
                }}
              />

              <h2>{land.title}</h2>

              <p>
                <strong>Owner :</strong>{" "}
                {land.owner_name}
              </p>

              <p>
                <strong>Mobile :</strong>{" "}
                {land.owner_mobile}
              </p>

              <p>
                <strong>Village :</strong>{" "}
                {land.village}
              </p>

              <p>
                <strong>District :</strong>{" "}
                {land.district}
              </p>

              <p>
                <strong>Area :</strong>{" "}
                {land.area} Acres
              </p>

              <p>
                <strong>Price :</strong> ₹
                {land.price}
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  marginTop: "20px",
                }}
              >
                <button
                  onClick={() => approveLand(land.id)}
                  style={{
                    background: "#2E7D32",
                    color: "#fff",
                    border: "none",
                    padding: "12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  ✅ Approve
                </button>

                <button
                  onClick={() =>
                    requestChanges(land.id)
                  }
                  style={{
                    background: "#FB8C00",
                    color: "#fff",
                    border: "none",
                    padding: "12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  📝 Request Changes
                </button>

                <button
                  onClick={() => rejectLand(land.id)}
                  style={{
                    background: "#D32F2F",
                    color: "#fff",
                    border: "none",
                    padding: "12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  ❌ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PendingLands;