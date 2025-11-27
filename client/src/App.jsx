import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import FloatingVideoPlayer from './components/FloatingVideoPlayer';
import ScrollToTop from './components/ScrollToTop';
import { VideoPlayerProvider, useVideoPlayer } from './contexts/VideoPlayerContext';

// Lazy load all page components for code-splitting
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const DashboardStartPage = lazy(() => import('./pages/DashboardStartPage'));
const DashboardVerifyPage = lazy(() => import('./pages/DashboardVerifyPage'));
const DashboardPricingPage = lazy(() => import('./pages/DashboardPricingPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const NdaPage = lazy(() => import('./pages/NdaPage'));
const GuestPage = lazy(() => import('./pages/GuestPage'));
const VerifyPage = lazy(() => import('./pages/VerifyPage'));
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage'));
const NdaAccessPage = lazy(() => import('./pages/NdaAccessPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const SecurityPage = lazy(() => import('./pages/SecurityPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const StatusPage = lazy(() => import('./pages/StatusPage'));
const ReportPage = lazy(() => import('./pages/ReportPage'));
const ReportIssuePage = lazy(() => import('./pages/ReportIssuePage'));
const DocumentationPage = lazy(() => import('./pages/DocumentationPage'));
const QuickGuidePage = lazy(() => import('./pages/QuickGuidePage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const UseCasesPage = lazy(() => import('./pages/UseCasesPage'));
const ServiceStatusPage = lazy(() => import('./pages/ServiceStatusPage'));
const RealtorsPage = lazy(() => import('./pages/RealtorsPage'));
const LawyersPage = lazy(() => import('./pages/LawyersPage'));
const BusinessPage = lazy(() => import('./pages/BusinessPage'));
const ComparisonPage = lazy(() => import('./pages/ComparisonPage'));
const VideosPage = lazy(() => import('./pages/VideosPage'));
const HelpCenterPage = lazy(() => import('./pages/HelpCenterPage'));
const VideoLibraryPage = lazy(() => import('./pages/VideoLibraryPage'));
const DocumentationInternalPage = lazy(() => import('./pages/dashboard/DocumentationInternalPage'));
const QuickGuideInternalPage = lazy(() => import('./pages/dashboard/QuickGuideInternalPage'));
const UseCasesInternalPage = lazy(() => import('./pages/dashboard/UseCasesInternalPage'));
const ReportIssueInternalPage = lazy(() => import('./pages/dashboard/ReportIssueInternalPage'));
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'));
const UpdatesPage = lazy(() => import('./pages/UpdatesPage'));
const InvitePage = lazy(() => import('./pages/InvitePage'));
const SignWorkflowPage = lazy(() => import('./pages/SignWorkflowPage'));
const WorkflowsPage = lazy(() => import('./pages/WorkflowsPage'));
const WorkflowDetailPage = lazy(() => import('./pages/WorkflowDetailPage'));


function AppRoutes() {
  const { videoState, closeVideo } = useVideoPlayer();

  return (
    <>
      <ScrollToTop />
      <main id="main-content">
        <Suspense fallback={<div className="w-full h-screen flex items-center justify-center bg-gray-50 text-gray-900">Cargando...</div>}>
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
            <Route path="/sign/:token" element={<SignWorkflowPage />} />
            <Route path="/invite/:token" element={<InvitePage />} />

            {/* New specialized pages */}
            <Route path="/realtors" element={<RealtorsPage />} />
            <Route path="/abogados" element={<LawyersPage />} />
            <Route path="/business" element={<BusinessPage />} />
            <Route path="/comparison" element={<ComparisonPage />} />

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
              path="/dashboard/workflows"
              element={
                <ProtectedRoute>
                  <WorkflowsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/workflows/:id"
              element={
                <ProtectedRoute>
                  <WorkflowDetailPage />
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
        </Suspense>
      </main>

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
