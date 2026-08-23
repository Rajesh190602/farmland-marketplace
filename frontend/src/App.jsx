import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Users from "./pages/admin/Users";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;