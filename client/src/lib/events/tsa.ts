/**
 * TSA UI Helpers
 * 
 * Pure functions to extract TSA information from events[]
 * UI never parses TSA directly - everything goes through these helpers
 */

import type { EventEntry, TsaEvent } from '../eco/v2';

export type TsaUiInfo = {
  present: boolean;
  at?: string;
  gen_time?: string;
  provider?: string;
  witness_hash?: string;
};

/**
 * Get latest TSA event from events array
 * 
 * @param events - Events array from document_entities or ECO v2
 * @returns TSA UI information (present + metadata)
 */
export function getLatestTsaEvent(events?: EventEntry[]): TsaUiInfo {
  if (!events || events.length === 0) {
    return { present: false };
  }

  const tsaEvents = events.filter((e): e is TsaEvent => e.kind === 'tsa');
  
  if (tsaEvents.length === 0) {
    return { present: false };
  }

  // Last TSA event (by array position, which respects append-only order)
  const last = tsaEvents[tsaEvents.length - 1];

  return {
    present: true,
    at: last.at,
    gen_time: last.tsa?.gen_time,
    provider: mapProviderName(last.tsa?.policy_oid),
    witness_hash: last.witness_hash,
  };
}

/**
 * Map TSA policy OID to human-readable provider name
 * 
 * @param policyOid - OID from TSA token
 * @returns Provider name or generic label
 */
function mapProviderName(policyOid?: string): string | undefined {
  if (!policyOid) return undefined;

  // Known providers (extend as needed)
  const providers: Record<string, string> = {
    '1.2.3.4.5': 'FreeTSA',
    // Add more mappings here
  };

  return providers[policyOid] || 'TSA Provider';
}

/**
 * Format TSA timestamp for UI display
 * 
 * @param tsaInfo - TSA UI info from getLatestTsaEvent
 * @returns Formatted timestamp string
 */
export function formatTsaTimestamp(tsaInfo: TsaUiInfo): string | undefined {
  if (!tsaInfo.present) return undefined;

  const timestamp = tsaInfo.gen_time || tsaInfo.at;
  if (!timestamp) return undefined;

  try {
    const date = new Date(timestamp);
    return date.toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return timestamp;
  }
}
