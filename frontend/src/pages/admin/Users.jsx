import { useEffect, useState } from "react";
import api from "../../services/api";

function Users() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get("/admin/users");
      setUsers(response.data);
    } catch (error) {
         console.log("Status:", error.response?.status);
         console.log("Response:", error.response?.data);
         console.log("Headers:", error.response?.headers);
         console.log(error);

         alert("Failed to load users");
     }
  };

  return (
    <div style={{ padding: "30px" }}>
      <h1>👥 User Management</h1>

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
            <th>Name</th>
            <th>Email</th>
            <th>Mobile</th>
            <th>Role</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.full_name}</td>
              <td>{user.email}</td>
              <td>{user.mobile}</td>
              <td>{user.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Users;