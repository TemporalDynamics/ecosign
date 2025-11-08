import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PricingPage from './pages/PricingPage';
import NdaPage from './pages/NdaPage';
import GuestPage from './pages/GuestPage';
import VerifyPage from './pages/VerifyPage';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/nda" element={<NdaPage />} />
        <Route path="/guest" element={<GuestPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;