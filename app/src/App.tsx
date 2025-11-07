import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AccessGateway from "./pages/AccessGateway";
import LoginPage from "./pages/Login";
import GuestFlow from "./pages/GuestFlow";
import Dashboard from "./pages/Dashboard";
import VerifyDocument from "./pages/VerifyDocument";
import NdaFlow from "./pages/NdaFlow";
import Pricing from "./pages/Pricing";
import LandingPage from "./pages/LandingPage";
import Analytics from "./pages/Analytics";
import { ProtectedRoute } from "./components/ProtectedRoute";

function App(){
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app/access" element={<AccessGateway asPage />} />
        <Route path="/app/login" element={<LoginPage/>} />
        <Route path="/app/guest" element={<GuestFlow/>} />
        <Route path="/verify" element={<VerifyDocument/>} />
        <Route path="/nda" element={<NdaFlow/>} />
        <Route path="/pricing" element={<Pricing/>} />
        <Route path="/app/pricing" element={<Pricing/>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics/></ProtectedRoute>} />
        <Route path="/app/analytics" element={<ProtectedRoute><Analytics/></ProtectedRoute>} />

        <Route path="/guest" element={<GuestFlow/>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard/></ProtectedRoute>} />
        <Route path="/app/dashboard" element={<ProtectedRoute><Dashboard/></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;