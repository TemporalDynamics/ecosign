import { CONTRACT_ECO_ECOX, DocumentEntityRules } from './authorityRules.ts';

type DocumentEntitySnapshot = {
  id?: string;
  witness_hash?: string | null;
  events?: Array<{ kind?: string }>;
};

type GenericEvent = {
  kind?: string;
  at?: string;
  witness_hash?: string;
  tsa?: {
    token_b64?: string;
  };
  payload?: {
    witness_hash?: string;
    token_b64?: string;
  };
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string; contract: string };

type ValidationOptions = {
  mode?: 'allow-unknown' | 'strict';
};

const hasTsaEvent = (events: Array<{ kind?: string }>) =>
  events.some((event) => event.kind === 'tsa' || event.kind === 'tsa.confirmed');

const hasToken = (event: GenericEvent) =>
  typeof event.tsa?.token_b64 === 'string' ||
  typeof event.payload?.token_b64 === 'string';

const hasWitnessHash = (event: GenericEvent) =>
  typeof event.witness_hash === 'string' ||
  typeof event.payload?.witness_hash === 'string';

const isIsoTimestamp = (value?: string) => {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
};

export function validateEventAppend(
  documentEntity: DocumentEntitySnapshot,
  event: GenericEvent,
  options: ValidationOptions = {}
): ValidationResult {
  const mode = options.mode ?? 'allow-unknown';
  const kind = event.kind;

  if (!kind || typeof kind !== 'string') {
    return { ok: false, reason: 'event_kind_missing', contract: CONTRACT_ECO_ECOX };
  }

  if (!isIsoTimestamp(event.at)) {
    return { ok: false, reason: 'event_at_invalid', contract: CONTRACT_ECO_ECOX };
  }

  const rule = DocumentEntityRules[kind];
  if (!rule) {
    return mode === 'strict'
      ? { ok: false, reason: 'event_kind_not_allowed', contract: CONTRACT_ECO_ECOX }
      : { ok: true };
  }

  if (rule.unique) {
    const events = Array.isArray(documentEntity.events) ? documentEntity.events : [];
    if (hasTsaEvent(events)) {
      return { ok: false, reason: 'event_kind_duplicate', contract: CONTRACT_ECO_ECOX };
    }
  }

  if (rule.requireWitnessHash && !hasWitnessHash(event)) {
    return { ok: false, reason: 'event_witness_hash_required', contract: CONTRACT_ECO_ECOX };
  }

  if (rule.requireTokenB64 && !hasToken(event)) {
    return { ok: false, reason: 'event_tsa_token_required', contract: CONTRACT_ECO_ECOX };
  }

  return { ok: true };
}
