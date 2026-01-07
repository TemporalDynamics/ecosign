/**
 * TSA Validation Utilities
 *
 * Purpose: Validate TSA connectivity BEFORE user enables protection
 * Anti-explosion: C+D (Tardío + Sin salida)
 *
 * P0.3: validateTSAConnectivity - check FreeTSA before activating
 */

/**
 * P0.3: Validate TSA connectivity
 *
 * Quick health check to FreeTSA before enabling protection.
 * Prevents: User enables protection → configures → TSA fails at certify
 * Now: User gets immediate feedback at toggle
 */
export async function validateTSAConnectivity(): Promise<boolean> {
  try {
    // Simple connectivity check to FreeTSA
    // We don't need to send a full TSA request, just verify endpoint is reachable
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch('https://freetsa.org/tsr', {
      method: 'HEAD',
      signal: controller.signal,
      // Add headers to make it a valid request
      headers: {
        'Content-Type': 'application/timestamp-query'
      }
    });

    clearTimeout(timeoutId);

    // If we get any response (even 400/405 for HEAD), TSA is reachable
    // We're not testing if it works, just if it's up
    return true;
  } catch (error) {
    // Network errors, timeouts, CORS issues = TSA not reachable
    console.error('TSA connectivity check failed:', error);
    return false;
  }
}
