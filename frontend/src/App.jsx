import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import AddLand from "./pages/AddLand";
import MyLands from "./pages/MyLands";
import EditLand from "./pages/EditLand";
import AllLands from "./pages/AllLands";
import SearchLands from "./pages/SearchLands";

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