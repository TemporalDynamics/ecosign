// ============================================
// DashboardApp - Full ecosign.app experience
// ============================================
// This is the main app rendered for ecosign.app
// Includes all routes: landing, dashboard, marketing, etc.
// ============================================

import React, { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import FloatingVideoPlayer from './components/FloatingVideoPlayer'
import ScrollToTop from './components/ScrollToTop'
import { VideoPlayerProvider, useVideoPlayer } from './contexts/VideoPlayerContext'
import { LegalCenterProvider } from './contexts/LegalCenterContext'
import LegalCenterRoot from './components/LegalCenterRoot'
import { initGuestFromLocation } from './contexts/GuestContext'

// Lazy load all page components for code-splitting
const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const DashboardStartPage = lazy(() => import('./pages/DashboardStartPage'))
const DashboardVerifyPage = lazy(() => import('./pages/DashboardVerifyPage'))
const DashboardPricingPage = lazy(() => import('./pages/DashboardPricingPage'))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const NdaPage = lazy(() => import('./pages/NdaPage'))
const VerifyPage = lazy(() => import('./pages/VerifyPage'))
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage'))
const NdaAccessPage = lazy(() => import('./pages/NdaAccessPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const SecurityPage = lazy(() => import('./pages/SecurityPage'))
const HelpPage = lazy(() => import('./pages/HelpPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const StatusPage = lazy(() => import('./pages/StatusPage'))
const ReportPage = lazy(() => import('./pages/ReportPage'))
const ReportIssuePage = lazy(() => import('./pages/ReportIssuePage'))
const DocumentationPage = lazy(() => import('./pages/DocumentationPage'))
const QuickGuidePage = lazy(() => import('./pages/QuickGuidePage'))
const FAQPage = lazy(() => import('./pages/FAQPage'))
const UseCasesPage = lazy(() => import('./pages/UseCasesPage'))
const ServiceStatusPage = lazy(() => import('./pages/ServiceStatusPage'))
const RealtorsPage = lazy(() => import('./pages/RealtorsPage'))
const LawyersPage = lazy(() => import('./pages/LawyersPage'))
const BusinessPage = lazy(() => import('./pages/BusinessPage'))
const ComparisonPage = lazy(() => import('./pages/ComparisonPage'))
const VideosPage = lazy(() => import('./pages/VideosPage'))
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'))
const UpdatesPage = lazy(() => import('./pages/UpdatesPage'))
const InvitePage = lazy(() => import('./pages/InvitePage'))
const SignWorkflowPage = lazy(() => import('./pages/SignWorkflowPage'))
const WorkflowsPage = lazy(() => import('./pages/WorkflowsPage'))
const WorkflowDetailPage = lazy(() => import('./pages/WorkflowDetailPage'))
const SharedDocumentAccessPage = lazy(() => import('./pages/SharedDocumentAccessPage'))

// Kill switch para dashboard legacy
const DASHBOARD_ENABLED = false

function DashboardAppRoutes() {
  const { videoState, closeVideo, playNext, playPrevious } = useVideoPlayer()
  const location = useLocation()

  useEffect(() => {
    initGuestFromLocation(location.search)
  }, [location.search])

  // ❌ REMOVED: beforeunload listener was clearing session prematurely
  // Session crypto now persists across page navigations and refreshes
  // It's only cleared on explicit logout (via useAuthWithE2E hook)
  // This allows documents to be encrypted once and shared multiple times
  // without regenerating sessionSecret (which would invalidate wrapped_keys)

  return (
    <>
      <ScrollToTop />
      <main id="main-content">
        <Suspense
          fallback={
            <div className="flex h-screen w-full items-center justify-center bg-gray-50 text-gray-900">
              Cargando...
            </div>
          }
        >
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/nda" element={<NdaPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/nda/:token" element={<NdaAccessPage />} />
            <Route path="/sign/:token" element={<SignWorkflowPage mode="dashboard" />} />
            <Route path="/invite/:token" element={<InvitePage />} />
            <Route path="/shared/:shareId" element={<SharedDocumentAccessPage />} />
            <Route path="/videos" element={<VideosPage />} />

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
              path="/inicio"
              element={
                <ProtectedRoute>
                  <DashboardStartPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documentos"
              element={
                <ProtectedRoute>
                  <DocumentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/verificador"
              element={
                <ProtectedRoute>
                  <DashboardVerifyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/planes"
              element={
                <ProtectedRoute>
                  <DashboardPricingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                DASHBOARD_ENABLED ? (
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                ) : (
                  <Navigate to="/inicio" replace />
                )
              }
            />
            <Route
              path="/dashboard/start"
              element={
                <Navigate to="/inicio" replace />
              }
            />
            <Route
              path="/dashboard/verify"
              element={
                <Navigate to="/verificador" replace />
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
                <Navigate to="/planes" replace />
              }
            />
            <Route
              path="/dashboard/documents"
              element={
                <Navigate to="/documentos" replace />
              }
            />

            {/* Dashboard internal routes */}
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

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {/* Global Floating Video Player - persists across pages */}
      {videoState.isPlaying && videoState.videoSrc && (
        <FloatingVideoPlayer
          videoSrc={videoState.videoSrc}
          videoTitle={videoState.videoTitle ?? undefined}
          onClose={closeVideo}
          onEnded={playNext}
          onNext={playNext}
          onPrevious={playPrevious}
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
  )
}

export function DashboardApp() {
  return (
    <ErrorBoundary>
      <VideoPlayerProvider>
        <LegalCenterProvider>
          <div className="DashboardApp">
            <DashboardAppRoutes />
            <LegalCenterRoot />
          </div>
        </LegalCenterProvider>
      </VideoPlayerProvider>
    </ErrorBoundary>
  )
}
