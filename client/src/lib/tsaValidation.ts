/**
 * TSA Validation Utilities
 *
 * Purpose: Validate TSA connectivity BEFORE user enables protection
 * Anti-explosion: C+D (Tardío + Sin salida)
 *
 * P0.3: validateTSAConnectivity - check FreeTSA before activating
 */

/**
 * P0.3: Validate TSA connectivity (server-side path)
 *
 * IMPORTANT:
 * - TSA requests are executed server-side via Edge Functions/jobs.
 * - Browser must NOT call external TSA domains directly (CSP/CORS risk).
 *
 * This client-side check only verifies that our backend function domain is reachable.
 */
export async function validateTSAConnectivity(): Promise<boolean> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) return false;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/health-check`, {
        method: 'GET',
        signal: controller.signal,
      });
      // Reachability check only: even 401/403/500 means network path is alive.
      return response.status > 0;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error('TSA backend reachability check failed:', error);
    return false;
  }
}
