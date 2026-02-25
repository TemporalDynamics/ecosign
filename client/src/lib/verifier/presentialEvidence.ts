import type { DocumentEventEntry } from './types';

export type PresenceClosedStrand = {
  key: string;
  required: boolean | null;
  ok: boolean | null;
  reason: string | null;
};

export type PresenceClosedSummary = {
  closedAt: string | null;
  actaHash: string | null;
  trenzaStatus: string | null;
  confirmedStrands: number | null;
  requiredStrands: number | null;
  strands: PresenceClosedStrand[];
  tsaStatus: string | null;
  tsaProvider: string | null;
  tsaTokenHash: string | null;
  tsaError: string | null;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

const asNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const asBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

const getEventAtMs = (event: DocumentEventEntry): number => {
  const at = asString(event.at);
  if (!at) return 0;
  const ms = new Date(at).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

const parseTrenzaStrands = (value: unknown): PresenceClosedStrand[] => {
  const strandsRecord = asRecord(value);
  if (!strandsRecord) return [];

  const preferredOrder = ['signer', 'witness', 'ecosign'];
  const keys = [
    ...preferredOrder.filter((key) => key in strandsRecord),
    ...Object.keys(strandsRecord).filter((key) => !preferredOrder.includes(key)),
  ];

  return keys.map((key) => {
    const strand = asRecord(strandsRecord[key]);
    return {
      key,
      required: asBoolean(strand?.required),
      ok: asBoolean(strand?.ok),
      reason: asString(strand?.reason),
    };
  });
};

export const getLatestPresenceClosedSummary = (
  events: DocumentEventEntry[],
): PresenceClosedSummary | null => {
  const closeEvents = events.filter(
    (event) => asString(event.kind) === 'identity.session.presence.closed',
  );
  if (closeEvents.length === 0) return null;

  const latest = [...closeEvents].sort((a, b) => getEventAtMs(b) - getEventAtMs(a))[0];
  const payload = asRecord(latest.payload);
  if (!payload) {
    return {
      closedAt: asString(latest.at),
      actaHash: null,
      trenzaStatus: null,
      confirmedStrands: null,
      requiredStrands: null,
      strands: [],
      tsaStatus: null,
      tsaProvider: null,
      tsaTokenHash: null,
      tsaError: null,
    };
  }

  const trenza = asRecord(payload.trenza);
  const timestampEvidence = asRecord(payload.timestamp_evidence);

  return {
    closedAt: asString(payload.closed_at) ?? asString(latest.at),
    actaHash: asString(payload.acta_hash),
    trenzaStatus: asString(trenza?.status),
    confirmedStrands: asNumber(trenza?.confirmed_strands),
    requiredStrands: asNumber(trenza?.required_strands),
    strands: parseTrenzaStrands(trenza?.strands),
    tsaStatus: asString(timestampEvidence?.tsa),
    tsaProvider: asString(timestampEvidence?.tsa_provider),
    tsaTokenHash: asString(timestampEvidence?.tsa_token_hash),
    tsaError: asString(timestampEvidence?.tsa_error),
  };
};
