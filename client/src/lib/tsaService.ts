/**
 * TSA integration that requests RFC 3161 timestamps via Supabase Edge Functions
 * and verifies the returned token locally before embedding it in the .ECO data.
 */

const DEFAULT_TSA_URL = 'https://freetsa.org/tsr';

type TimestampOptions = { tsaUrl?: string };

export async function requestLegalTimestamp(hashHex: string, options: TimestampOptions = {}) {
  /**
   * @deprecated
   * TSA evidence must be produced server-side via the job pipeline.
   */
  void hashHex;
  void options;
  throw new Error('requestLegalTimestamp is deprecated: TSA must be produced server-side via jobs (run-tsa)');
}

export function getAvailableTSAs() {
  return {
    free: [
      {
        name: 'FreeTSA',
        url: DEFAULT_TSA_URL,
        cost: 'Free',
        reliability: 'Good',
        legalValidity: 'International (RFC 3161 compliant)'
      }
    ],
    premium: []
  };
}

/**
 * Request TSA timestamp and persist it to document_entities.events[]
 * 
 * This is the canonical way to timestamp a document.
 * - Requests RFC 3161 token from TSA
 * - Verifies token locally
 * - Persists to events[] via append-tsa-event Edge Function
 * 
 * @param documentId - document_entities.id
 * @param witnessHash - canonical witness_hash (must match DB)
 * @param options - TSA URL override
 */
export async function requestAndPersistTsa(
  documentId: string,
  witnessHash: string,
  options: TimestampOptions = {}
) {
  /**
   * @deprecated
   * TSA evidence must be produced server-side via the job pipeline.
   * Keep this function only as a stub to prevent legacy callers.
   */
  void documentId;
  void witnessHash;
  void options;
  throw new Error('requestAndPersistTsa is deprecated: TSA must be produced server-side via jobs (run-tsa)');
}
