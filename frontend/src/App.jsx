import MyLands from "./pages/MyLands";
import LandDetails from "./pages/LandDetails";
import EditLand from "./pages/EditLand";
import AllLands from "./pages/AllLands";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import AddLand from "./pages/AddLand";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<Home />} />
        <Route path="/my-lands" element={<MyLands />} />
        <Route path="/edit-land/:id" element={<EditLand />} />
        <Route path="/all-lands" element={<AllLands />} />
        <Route path="/land/:id" element={<LandDetails />} />
        <Route path="/add-land" element={<AddLand />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;