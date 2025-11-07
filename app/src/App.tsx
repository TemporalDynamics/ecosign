import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Login";
import GuestFlow from "./pages/GuestFlow";
import Dashboard from "./pages/Dashboard";
import VerifyDocument from "./pages/VerifyDocument";
import NdaFlow from "./pages/NdaFlow";
import Pricing from "./pages/Pricing";
import LandingPage from "./pages/LandingPage";
import Analytics from "./pages/Analytics";
import Contact from "./pages/Contact";
import { ProtectedRoute } from "./components/ProtectedRoute";

function App(){
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage/>} />
        <Route path="/guest" element={<GuestFlow/>} />
        <Route path="/verify" element={<VerifyDocument/>} />
        <Route path="/nda" element={<NdaFlow/>} />
        <Route path="/pricing" element={<Pricing/>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics/></ProtectedRoute>} />
        <Route path="/contact" element={<Contact/>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard/></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;