import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import { inject } from '@vercel/analytics'
import { DashboardApp } from './DashboardApp'
import { SignerApp } from './SignerApp'
import './index.css'

// Initialize Vercel Analytics
inject()

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

// ============================================
// Robustness: auto-recover from stale chunk loads
// ============================================
// If a user has an old tab open, a new deploy may invalidate hashed chunks.
// This catches dynamic-import failures and forces a single hard reload.
const CHUNK_RECOVERY_KEY = 'ecosign:chunk-recovery:reloaded'
function maybeRecoverFromStaleChunk(errorLike) {
  try {
    const message =
      typeof errorLike === 'string'
        ? errorLike
        : (errorLike?.message || errorLike?.toString?.() || '')

    const looksLikeChunkFailure =
      message.includes('Failed to fetch dynamically imported module') ||
      message.includes('Importing a module script failed') ||
      message.includes('MIME') ||
      message.includes('text/html') ||
      message.includes('/assets/') && message.includes('.js')

    if (!looksLikeChunkFailure) return

    const alreadyReloaded = sessionStorage.getItem(CHUNK_RECOVERY_KEY)
    if (alreadyReloaded) return

    sessionStorage.setItem(CHUNK_RECOVERY_KEY, String(Date.now()))
    window.location.reload()
  } catch {
    // no-op
  }
}

window.addEventListener('unhandledrejection', (event) => {
  maybeRecoverFromStaleChunk(event?.reason)
})

window.addEventListener('error', (event) => {
  maybeRecoverFromStaleChunk(event?.error || event?.message)
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppToRender />
    </BrowserRouter>
  </React.StrictMode>,
)

// Register service worker
// TEMPORARILY DISABLED - debugging CORS issue with Origin: null
// TODO: Re-enable after fixing SW CORS issue
// eslint-disable-next-line no-constant-condition, no-constant-binary-expression
if (false && 'serviceWorker' in navigator) {
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
