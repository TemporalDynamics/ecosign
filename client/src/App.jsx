import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DashboardStartPage from './pages/DashboardStartPage';
import DashboardVerifyPage from './pages/DashboardVerifyPage';
import DashboardPricingPage from './pages/DashboardPricingPage';
import DocumentsPage from './pages/DocumentsPage';
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
import ServiceStatusPage from './pages/ServiceStatusPage';
import VideosPage from './pages/VideosPage';
import HelpCenterPage from './pages/HelpCenterPage';
import VideoLibraryPage from './pages/VideoLibraryPage';
import DocumentationInternalPage from './pages/dashboard/DocumentationInternalPage';
import QuickGuideInternalPage from './pages/dashboard/QuickGuideInternalPage';
import UseCasesInternalPage from './pages/dashboard/UseCasesInternalPage';
import ReportIssueInternalPage from './pages/dashboard/ReportIssueInternalPage';
import RoadmapPage from './pages/RoadmapPage';
import UpdatesPage from './pages/UpdatesPage';
import InvitePage from './pages/InvitePage';
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
        <Route path="/invite/:token" element={<InvitePage />} />

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
        <Route
          path="/dashboard/documents"
          element={
            <ProtectedRoute>
              <DocumentsPage />
            </ProtectedRoute>
          }
        />
        
        {/* Dashboard internal routes */}
        <Route
          path="/dashboard/status"
          element={
            <ProtectedRoute>
              <ServiceStatusPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/videos"
          element={
            <ProtectedRoute>
              <VideoLibraryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/help-center"
          element={
            <ProtectedRoute>
              <HelpCenterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/contact"
          element={
            <ProtectedRoute>
              <ContactPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/report-issue"
          element={
            <ProtectedRoute>
              <ReportIssueInternalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/documentation"
          element={
            <ProtectedRoute>
              <DocumentationInternalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/quick-guide"
          element={
            <ProtectedRoute>
              <QuickGuideInternalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/use-cases"
          element={
            <ProtectedRoute>
              <UseCasesInternalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/roadmap"
          element={
            <ProtectedRoute>
              <RoadmapPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/updates"
          element={
            <ProtectedRoute>
              <UpdatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/terms"
          element={
            <ProtectedRoute>
              <TermsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/privacy"
          element={
            <ProtectedRoute>
              <PrivacyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/security"
          element={
            <ProtectedRoute>
              <SecurityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/documentation"
          element={
            <ProtectedRoute>
              <DocumentationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/quick-guide"
          element={
            <ProtectedRoute>
              <QuickGuidePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/use-cases"
          element={
            <ProtectedRoute>
              <UseCasesPage />
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

      {/* Global Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#363636',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
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