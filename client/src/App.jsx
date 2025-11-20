import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DashboardStartPage from './pages/DashboardStartPage';
import DashboardVerifyPage from './pages/DashboardVerifyPage';
import DashboardPricingPage from './pages/DashboardPricingPage';
import PricingPage from './pages/PricingPage';
import NdaPage from './pages/NdaPage';
import GuestPage from './pages/GuestPage';
import VerifyPage from './pages/VerifyPage';
import HowItWorksPage from './pages/HowItWorksPage';
import NdaAccessPage from './pages/NdaAccessPage';
import SignDocumentPage from './pages/SignDocumentPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import SecurityPage from './pages/SecurityPage';
import HelpPage from './pages/HelpPage';
import ContactPage from './pages/ContactPage';
import StatusPage from './pages/StatusPage';
import ReportPage from './pages/ReportPage';
import ReportIssuePage from './pages/ReportIssuePage';
import DocumentationPage from './pages/DocumentationPage';
import QuickGuidePage from './pages/QuickGuidePage';
import FAQPage from './pages/FAQPage';
import UseCasesPage from './pages/UseCasesPage';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import FloatingVideoPlayer from './components/FloatingVideoPlayer';
import ScrollToTop from './components/ScrollToTop';
import { VideoPlayerProvider, useVideoPlayer } from './contexts/VideoPlayerContext';

function AppRoutes() {
  const { videoState, closeVideo } = useVideoPlayer();

  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/nda" element={<NdaPage />} />
        <Route path="/guest" element={<GuestPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/nda/:token" element={<NdaAccessPage />} />
        <Route path="/sign/:token" element={<SignDocumentPage />} />
        
        {/* Legal and Support routes */}
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/report-issue" element={<ReportIssuePage />} />
        
        {/* Resources routes */}
        <Route path="/documentation" element={<DocumentationPage />} />
        <Route path="/quick-guide" element={<QuickGuidePage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/use-cases" element={<UseCasesPage />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/start"
          element={
            <ProtectedRoute>
              <DashboardStartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/verify"
          element={
            <ProtectedRoute>
              <DashboardVerifyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/pricing"
          element={
            <ProtectedRoute>
              <DashboardPricingPage />
            </ProtectedRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Floating Video Player - persists across pages */}
      {videoState.isPlaying && videoState.videoSrc && (
        <FloatingVideoPlayer
          videoSrc={videoState.videoSrc}
          videoTitle={videoState.videoTitle}
          onClose={closeVideo}
        />
      )}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <VideoPlayerProvider>
        <div className="App">
          <AppRoutes />
        </div>
      </VideoPlayerProvider>
    </ErrorBoundary>
  );
}

export default App;