/**
 * API Client - Helper para llamar Netlify Functions
 *
 * Maneja automáticamente:
 * - CSRF tokens
 * - Authorization headers
 * - Error handling
 * - Retry logic con exponential backoff
 */

import { getSupabase } from './supabaseClient';
import {
  parseApiError,
  isRetryableError,
  getRetryDelay,
  AuthenticationError
} from './apiErrors';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/.netlify/functions';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

class ApiClient {
  private csrfToken: string | null = null;
  private csrfTokenExpiry: number = 0;

  /**
   * Obtener CSRF token (cachear por 50 minutos)
   */
  private async getCSRFToken(): Promise<string> {
    const now = Date.now();

    // Si tenemos token válido, reutilizarlo
    if (this.csrfToken && now < this.csrfTokenExpiry) {
      return this.csrfToken;
    }

    // Obtener nuevo token
    const response = await fetch(`${API_BASE_URL}/get-csrf-token`);
    const result: ApiResponse<{ token: string; expires_in: number }> = await response.json();

    if (!result.success || !result.data) {
      throw new Error('Failed to get CSRF token');
    }

    this.csrfToken = result.data.token;
    this.csrfTokenExpiry = now + (result.data.expires_in * 1000) - 60000; // 1 min buffer

    return this.csrfToken;
  }

  /**
   * Obtener access token de Supabase
   */
  private async getAccessToken(): Promise<string | null> {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  /**
   * POST request genérico con retry logic
   */
  private async post<T>(
    endpoint: string,
    body: any,
    options: {
      requireAuth?: boolean;
      requireCSRF?: boolean;
      maxRetries?: number;
    } = {}
  ): Promise<ApiResponse<T>> {
    const { requireAuth = true, requireCSRF = true, maxRetries = 3 } = options;

    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        // Agregar CSRF token si se requiere
        if (requireCSRF) {
          const csrfToken = await this.getCSRFToken();
          headers['X-CSRF-Token'] = csrfToken;
        }

        // Agregar Authorization si se requiere
        if (requireAuth) {
          const accessToken = await this.getAccessToken();
          if (!accessToken) {
            throw new AuthenticationError();
          }
          headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body)
        });

        const result: ApiResponse<T> = await response.json();

        if (!response.ok || !result.success) {
          const error = parseApiError(result, response.status);
          throw error;
        }

        return result;
      } catch (error: any) {
        lastError = error;

        // No reintentar si es error de autenticación/validación
        if (!isRetryableError(error)) {
          throw error;
        }

        // Si es el último intento, lanzar el error
        if (attempt === maxRetries) {
          throw error;
        }

        // Esperar antes de reintentar (exponential backoff)
        const delay = getRetryDelay(attempt);
        console.warn(`API request failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Generar enlace NDA
   */
  async generateLink(params: {
    document_id: string;
    recipient_email: string;
    expires_in_hours?: number;
    require_nda?: boolean;
  }): Promise<{
    link_id: string;
    recipient_id: string;
    access_url: string;
    expires_at: string;
    require_nda: boolean;
  }> {
    const result = await this.post<any>('generate-link', params, {
      requireAuth: true,
      requireCSRF: true
    });
    return result.data!;
  }

  /**
   * Verificar acceso con token
   */
  async verifyAccess(params: {
    token: string;
    otp?: string;
  }): Promise<{
    document_id: string;
    title: string;
    eco_hash: string;
    download_url: string;
    recipient_id: string;
    expires_in: number | null;
    nda_accepted: boolean;
  }> {
    const result = await this.post<any>('verify-access', params, {
      requireAuth: false,
      requireCSRF: false
    });
    return result.data!;
  }

  /**
   * Registrar evento de acceso
   */
  async logEvent(params: {
    recipient_id: string;
    event_type: 'view' | 'download' | 'forward';
    session_id?: string;
  }): Promise<{
    event_id: string;
    timestamp: string;
    message: string;
  }> {
    const result = await this.post<any>('log-event', params, {
      requireAuth: false,
      requireCSRF: false
    });
    return result.data!;
  }
}

// Export singleton
export const api = new ApiClient();