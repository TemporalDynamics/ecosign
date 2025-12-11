// ============================================
// SignerApp - Ultra simple signer experience
// ============================================
// This app is rendered ONLY when hostname is app.ecosign.app
// Provides a minimal interface for external signers:
// - No dashboard
// - No navigation
// - Only /sign/:token route
// - Clean, focused UX for NDA → OTP → Document → Sign
// ============================================

import React, { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ErrorBoundary from './components/ui/ErrorBoundary'
import SignWorkflowPage from './pages/SignWorkflowPage'

export function SignerApp() {
  return (
    <ErrorBoundary>
      <div className="SignerApp min-h-screen bg-white">
        <Suspense
          fallback={
            <div className="flex h-screen w-full items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                <p className="text-sm text-gray-600">Cargando...</p>
              </div>
            </div>
          }
        >
          <Routes>
            {/* Only route: signature workflow with token */}
            <Route path="/sign/:token" element={<SignWorkflowPage mode="signer" />} />

            {/* Fallback for invalid/expired links */}
            <Route
              path="*"
              element={
                <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
                  <div className="max-w-md text-center">
                    <div className="mb-6 flex justify-center">
                      <svg
                        className="h-20 w-20 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <h2 className="mb-2 text-2xl font-bold text-gray-900">
                      Enlace inválido o expirado
                    </h2>
                    <p className="mb-6 text-gray-600">
                      El enlace de firma que intentaste abrir no es válido o ha expirado.
                      Por favor, contactá al remitente del documento.
                    </p>
                    <div className="rounded-lg bg-blue-50 p-4 text-left">
                      <p className="text-sm font-medium text-blue-900">
                        ¿Necesitás ayuda?
                      </p>
                      <p className="mt-1 text-sm text-blue-700">
                        Escribinos a <a href="mailto:support@email.ecosign.app" className="underline">support@email.ecosign.app</a>
                      </p>
                    </div>
                  </div>
                </div>
              }
            />
          </Routes>
        </Suspense>

        {/* Global Toast Notifications */}
        <Toaster
          position="top-center"
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
      </div>
    </ErrorBoundary>
  )
}
