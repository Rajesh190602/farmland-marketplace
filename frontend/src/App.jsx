import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import UserDetails from "./pages/admin/UserDetails";

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