/**
 * Product Analytics Helper
 *
 * Propósito: Track user interactions, feature usage, and navigation flows.
 *
 * Filosofía:
 * - Analytics NUNCA debe romper la aplicación
 * - Errors silenciosos (logged pero no thrown)
 * - Privacy-first (no PII sin consentimiento)
 * - Lightweight (no bloquea UI)
 */

import { getSupabase, getCurrentUser } from './supabaseClient';

/**
 * Genera o recupera un session_id único para esta sesión del navegador.
 * Se persiste en sessionStorage (se pierde al cerrar tab, no al refrescar).
 */
const getSessionId = (): string => {
  const STORAGE_KEY = 'ecosign_session_id';

  // Intentar recuperar session existente
  let sessionId = sessionStorage.getItem(STORAGE_KEY);

  if (!sessionId) {
    // Generar nuevo session_id: timestamp + random
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem(STORAGE_KEY, sessionId);
  }

  return sessionId;
};

/**
 * Tipo de evento de analytics
 */
export interface AnalyticsEvent {
  event_name: string;
  event_data?: Record<string, unknown>;
}

/**
 * Track un evento de producto.
 *
 * @param eventName - Nombre del evento (e.g., 'opened_legal_center', 'uploaded_doc')
 * @param eventData - Metadata opcional del evento (JSONB)
 *
 * @example
 * ```ts
 * trackEvent('opened_legal_center', { source: 'dashboard_button' });
 * trackEvent('uploaded_doc', { fileType: 'pdf', fileSize: 1024000 });
 * ```
 */
export const trackEvent = async (
  eventName: string,
  eventData: Record<string, unknown> = {}
): Promise<void> => {
  try {
    const supabase = getSupabase();
    const sessionId = getSessionId();

    // Obtener user_id (puede ser null si no está autenticado)
    const user = await getCurrentUser();
    const userId = user?.id || null;

    // Obtener contexto de navegación
    const pagePath = window.location.pathname;
    const userAgent = navigator.userAgent;

    // Insertar evento
    const { error } = await supabase
      .from('product_events')
      .insert({
        user_id: userId,
        session_id: sessionId,
        event_name: eventName,
        event_data: eventData,
        page_path: pagePath,
        user_agent: userAgent,
      });

    if (error) {
      // Log error pero NO throw (analytics no debe romper la app)
      console.error('[Analytics] Error tracking event:', eventName, error);
    }
  } catch (err) {
    // Catch-all para cualquier error inesperado
    console.error('[Analytics] Unexpected error:', err);
  }
};

/**
 * Track page view.
 * Convenience wrapper para trackEvent con event_name = 'page_view'.
 *
 * @param pageName - Nombre legible de la página (e.g., 'Dashboard', 'Legal Center')
 *
 * @example
 * ```ts
 * trackPageView('Dashboard');
 * trackPageView('Legal Center Modal');
 * ```
 */
export const trackPageView = async (pageName: string): Promise<void> => {
  await trackEvent('page_view', { page_name: pageName });
};

/**
 * Track error encontrado por el usuario.
 *
 * @param errorMessage - Mensaje de error user-friendly
 * @param errorDetails - Detalles técnicos opcionales
 *
 * @example
 * ```ts
 * trackError('No se pudo subir el archivo', { reason: 'file_too_large' });
 * ```
 */
export const trackError = async (
  errorMessage: string,
  errorDetails?: Record<string, unknown>
): Promise<void> => {
  await trackEvent('error_encountered', {
    error_message: errorMessage,
    ...errorDetails,
  });
};
