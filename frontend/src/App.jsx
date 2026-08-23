import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import PendingLands from "./pages/admin/PendingLands";

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