import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import { DashboardApp } from './DashboardApp'
import { SignerApp } from './SignerApp'
import './index.css'

// Initialize Sentry for error tracking
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true, // Privacy: mask all text
        blockAllMedia: true, // Privacy: block all media
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
    // Session Replay (only errors, not all sessions - privacy first)
    replaysSessionSampleRate: 0, // Don't capture all sessions
    replaysOnErrorSampleRate: 1.0, // Capture 100% of sessions with errors
    
    // Privacy: Never send sensitive data
    beforeSend(event) {
      // Remove any potential sensitive data
      if (event.request?.data) {
        delete event.request.data;
      }
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      return event;
    },
    
    // Ignore expected errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],
  });
}

// ============================================
// Hostname-based App Selection
// ============================================
// ecosign.app → DashboardApp (full experience)
// app.ecosign.app → SignerApp (minimal signer flow)
// localhost → DashboardApp (dev default)
// ============================================

const hostname = window.location.hostname
const isSignerHost = hostname === 'app.ecosign.app'

const AppToRender = isSignerHost ? SignerApp : DashboardApp

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppToRender />
    </BrowserRouter>
  </React.StrictMode>,
)

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(() => {
        // Service worker registered successfully
      })
      .catch((error) => {
        console.error('SW registration failed:', error);
      });
  });
}