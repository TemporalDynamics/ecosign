/**
 * ProtectedRoute Component
 *
 * Protege rutas que requieren autenticación.
 * Si no hay usuario, redirige a /login
 *
 * Uso:
 * <Route path="/dashboard" element={
 *   <ProtectedRoute>
 *     <DashboardPage />
 *   </ProtectedRoute>
 * } />
 */

import React, { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isGuestMode } from '../utils/guestMode';
import { initializeSessionCrypto } from '../lib/e2e/sessionCrypto';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = '/login'
}) => {
  const { user, loading } = useAuth();
  const guest = isGuestMode();
  const [cryptoReady, setCryptoReady] = useState(false);
  const [cryptoError, setCryptoError] = useState<string | null>(null);

  // Inicializar SessionCrypto cuando el usuario esté autenticado
  useEffect(() => {
    async function initCrypto() {
      // Solo para usuarios reales (no invitados)
      if (!user || guest) {
        setCryptoReady(true); // Invitados no necesitan crypto
        return;
      }

      console.log('🔐 Inicializando SessionCrypto para usuario:', user.id);
      try {
        await initializeSessionCrypto(user.id);
        console.log('✅ SessionCrypto inicializado correctamente');
        setCryptoReady(true);
      } catch (error: any) {
        console.error('❌ Error inicializando SessionCrypto:', error);
        setCryptoError(error.message || 'Error desconocido');
      }
    }

    if (!loading) {
      initCrypto();
    }
  }, [user, guest, loading]);

  // Mostrar loading mientras verificamos auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-600 mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario y no es invitado, redirigir a login
  if (!user && !guest) {
    return <Navigate to={redirectTo} replace />;
  }

  // Mostrar loading mientras crypto se inicializa (solo para usuarios reales)
  if (!guest && !cryptoReady) {
    if (cryptoError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md p-6">
            <h2 className="text-xl font-bold text-red-600 mb-4">
              Error de inicialización
            </h2>
            <p className="text-gray-700 mb-4">
              No se pudo inicializar el sistema de cifrado: {cryptoError}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-600 mb-4"></div>
          <p className="text-gray-600">Inicializando cifrado seguro...</p>
        </div>
      </div>
    );
  }

  // Usuario autenticado y crypto listo, mostrar children
  return <>{children}</>;
};

export default ProtectedRoute;
