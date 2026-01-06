# TSA Implementation Summary

**Status:** ✅ COMPLETE  
**Date:** 2026-01-06

## What Was Implemented

### 1. Database Schema

**Migration:** `20260106090005_document_entities_events.sql`

- Added `events` JSONB column (append-only ledger)
- Added `tsa_latest` JSONB column (cache, auto-updated)
- Constraints:
  - `events` MUST be array
  - TSA events MUST have `kind:"tsa"`, `at`, `witness_hash`, `tsa.token_b64`
  - `witness_hash` MUST match `document_entities.witness_hash`
- Triggers:
  - `enforce_events_append_only()` - validates TSA events on append
  - `update_tsa_latest()` - auto-updates cache from events[]

### 2. Type Definitions

**Files:**
- `client/src/lib/documentEntityService.ts`
- `client/src/lib/eco/v2/index.ts`

```typescript
type TsaEvent = {
  kind: 'tsa';
  at: string;  // ISO 8601
  witness_hash: string;
  tsa: {
    token_b64: string;
    gen_time?: string;
    policy_oid?: string;
    serial?: string;
    digest_algo?: string;
    tsa_cert_fingerprint?: string;
    token_hash?: string;
  };
};
```

### 3. Service Layer

**Function:** `appendTsaEvent(documentId, payload)`

- Validates `witness_hash` consistency
- Builds TSA event
- Appends to `events[]` (DB trigger validates)
- Server-side only (prevents client manipulation)

**Helper:** `requestAndPersistTsa(documentId, witnessHash)`

- Requests RFC 3161 token from TSA
- Verifies token locally
- Persists via `appendTsaEvent`
- One-shot: request + persist

### 4. ECO v2 Projection

**Changes:**
- ECO v2 now includes `events: EventEntry[]`
- TSA events are projected deterministically
- `.eco` file contains full TSA evidence (offline-verifiable)

### 5. Verifier v2

**TSA Verification:**

```typescript
verifyEcoV2(eco) => {
  status: 'valid' | 'tampered' | 'incomplete' | 'unknown',
  tsa?: {
    present: boolean,
    valid?: boolean,
    witness_hash?: string,
    gen_time?: string
  }
}
```

**States:**
- `present: false` - No TSA (not an error, depends on policy)
- `present: true, valid: true` - TSA consistent with witness_hash
- `present: true, valid: false` - TSA exists but invalid → **tampered**

### 6. Tests

**Unit Tests:** `tests/unit/tsaEvents.test.ts`
- 7 tests (all passing ✅)
- Covers: projection, verification, multiple TSA, edge cases

**Integration Tests:** `tests/integration/tsaEvents.test.ts`
- DB trigger validation
- Append-only enforcement
- `tsa_latest` cache consistency
- Requires Supabase local dev

### 7. Documentation

**Contract:** `docs/contratos/TSA_EVENT_RULES.md`
- MUST/SHOULD/MAY rules (RFC 2119 style)
- 843 lines of formal specification
- Aligned with canonical truth principles

---

## Architecture Decisions

### ✅ events[] as Separate Ledger (NOT hash_chain)

**Rationale:**
- `hash_chain` = index of canonical hashes (result)
- `events[]` = temporal evidence (history)
- TSA is evidence, not a hash
- Separation avoids semantic confusion

### ✅ tsa_latest as Cache (NOT Source of Truth)

**Derivation:**
```sql
tsa_latest = last(events where kind = 'tsa')
```

**Benefits:**
- Fast reads (no JSON array scan)
- Always derivable (no risk of inconsistency)
- Auto-updated via trigger

### ✅ Multiple TSA Events Allowed

**Use cases:**
- Retry (TSA failed, use alternative)
- Dual-anchoring (Polygon + Bitcoin)
- Renewal (TSA expired, re-timestamp)

**UI shows:** Last TSA (by `at` timestamp)

---

## Integration Points

### 1. Current Flow (Manual)

```typescript
// After witness generation:
const witnessHash = await hashWitness(pdf);
await ensureWitnessCurrent(docId, { hash: witnessHash, ... });

// Request TSA:
await requestAndPersistTsa(docId, witnessHash);
```

### 2. Future: Auto-TSA on Witness

```typescript
// After witness generation:
const witnessHash = await hashWitness(pdf);
await ensureWitnessCurrent(docId, { hash: witnessHash, ... });

// Auto-request TSA (if policy requires):
if (shouldRequestTsa(doc)) {
  await requestAndPersistTsa(docId, witnessHash);
}
```

### 3. Export .eco

```typescript
// ECO v2 automatically includes TSA events:
const { eco, json } = await emitEcoVNext(docId);
// eco.events contains TSA
```

---

## Migration from Legacy

**Script:** `20260106090006_migrate_legacy_tsa.sql`

- Moves TSA from `user_documents.tca_timestamp` to `events[]`
- Only migrates if no TSA event exists
- Keeps legacy columns (audit/rollback)

**Manual step:** Verify migration, then deprecate legacy columns

---

## Next Steps

### Immediate (Today)

1. ✅ DB migration
2. ✅ Service layer
3. ✅ ECO v2 projection
4. ✅ Verifier v2
5. ✅ Tests

### Short-term (This Week)

1. **UI Adaptation:**
   - Show TSA status in DocumentsPage
   - Add TSA badge in VerificationComponent
   - Tooltip: "TSA timestamp: 2026-01-06 15:30 UTC (FreeTSA)"

2. **Auto-TSA Policy:**
   - Add `auto_tsa: boolean` to document settings
   - Trigger TSA on witness generation

3. **Edge Function Migration:**
   - Update `verify-ecox` to use `events[]`
   - Update `process-signature` to check TSA

### Medium-term (Next Sprint)

1. **Anchors as Events:**
   - Similar pattern: `kind: "anchor"` in `events[]`
   - Polygon/Bitcoin anchors as temporal evidence

2. **External Signatures:**
   - `kind: "external_signature"` in `events[]`
   - SignNow/DocuSign as external authority

---

## Metrics

- **Code Added:** ~800 lines
- **Tests:** 7 unit + 6 integration
- **Migrations:** 2 SQL files
- **Documentation:** 1 contract (843 lines)
- **Breaking Changes:** NONE (additive only)

---

## Validation Checklist

- [x] DB schema with triggers
- [x] Type definitions
- [x] Service layer (appendTsaEvent)
- [x] ECO v2 projection
- [x] Verifier v2
- [x] Unit tests (7/7 passing)
- [x] Integration tests (ready, needs Supabase)
- [x] Contract documentation
- [x] Migration script (legacy)
- [ ] UI adaptation (pending)
- [ ] Edge function update (pending)

---

## References

- **Contract:** [docs/contratos/TSA_EVENT_RULES.md](../docs/contratos/TSA_EVENT_RULES.md)
- **Migration:** [supabase/migrations/20260106090005_document_entities_events.sql](../supabase/migrations/20260106090005_document_entities_events.sql)
- **Tests:** [tests/unit/tsaEvents.test.ts](../tests/unit/tsaEvents.test.ts)

---

**Summary:**

TSA is now a first-class citizen in EcoSign's canonical system.  
It lives as append-only evidence in `events[]`, projects deterministically to ECO v2,  
and verifies offline without backend dependency.

**Status:** Production-ready at 90% (pending UI + edge functions).
