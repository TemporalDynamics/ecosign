import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AccessGateway from "./pages/AccessGateway";
import LoginPage from "./pages/Login";
import GuestFlow from "./pages/GuestFlow";
import Dashboard from "./pages/Dashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";

function App(){
  return (
    <BrowserRouter>
      <Routes>
        {/* CTA unified entry */}
        <Route path="/app/access" element={<AccessGateway asPage />} />
        <Route path="/app/login" element={<LoginPage/>} />
        <Route path="/app/guest" element={<GuestFlow/>} />

        {/* Example protected route */}
        <Route path="/app/dashboard" element={<ProtectedRoute><Dashboard/></ProtectedRoute>} />

        {/* Home -> redirect to access for the demo */}
        <Route path="/" element={<Navigate to="/app/access" replace />} />
        <Route path="*" element={<Navigate to="/app/access" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;