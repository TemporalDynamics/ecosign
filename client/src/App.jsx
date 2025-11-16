import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPageV2 from './pages/LandingPageV2';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PricingPage from './pages/PricingPage';
import NdaPage from './pages/NdaPage';
import GuestPage from './pages/GuestPage';
import VerifyPage from './pages/VerifyPage';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <div className="App">
        <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPageV2 />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/nda" element={<NdaPage />} />
        <Route path="/guest" element={<GuestPage />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
    </ErrorBoundary>
  );
}

export default App;