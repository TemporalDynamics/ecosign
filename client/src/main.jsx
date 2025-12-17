import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { DashboardApp } from './DashboardApp'
import { SignerApp } from './SignerApp'
import './index.css'

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

// Register service worker (only in production)
const isProduction = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');

if ('serviceWorker' in navigator && isProduction) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
} else if ('serviceWorker' in navigator && !isProduction) {
  // Unregister any existing service workers in development
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
      console.log('SW unregistered in development:', registration);
    });
  });
}