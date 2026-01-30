import { CONTRACT_ECO_ECOX, DocumentEntityRules } from './authorityRules.ts';

export function validateEventAppend(documentEntity: any, event: any) {
  // FASE 1 ONLY: temporary hard-lock to TSA outcomes. Expand in Phase 2.
  if (event?.kind !== 'tsa.confirmed' && event?.kind !== 'tsa.failed') {
    return { ok: false, reason: 'event_kind_not_allowed', contract: CONTRACT_ECO_ECOX };
  }

  const rule = DocumentEntityRules[event.kind];
  if (!rule) return { ok: true };

  const events = Array.isArray(documentEntity?.events) ? documentEntity.events : [];
  if (rule.unique && events.some((e: any) => e.kind === event.kind)) {
    return { ok: false, reason: 'event_kind_duplicate', contract: CONTRACT_ECO_ECOX };
  }

  if (rule.requireWitnessHash && !event.witness_hash) {
    return { ok: false, reason: 'event_witness_hash_required', contract: CONTRACT_ECO_ECOX };
  }

  if (rule.requireTokenB64 && !event.tsa?.token_b64) {
    return { ok: false, reason: 'event_tsa_token_required', contract: CONTRACT_ECO_ECOX };
  }

  return { ok: true };
}
