# System State Report — 2026-01-06

**Date:** 2026-01-06  
**Context:** Post-TSA implementation, pre-anchors design

---

## 🟢 Closed (Formal Freeze)

These decisions are **irreversible** and will NOT be reconsidered:

### ✅ Canonical Truth Architecture
- **Date:** 2026-01-05
- **Status:** Formalized in `docs/contratos/verdad-canonica.md`
- **Key Decision:** Document = source truth in time, everything else = witness/derived

### ✅ ECO v2 Format
- **Date:** 2026-01-05
- **Status:** Contract closed in `docs/ECO_V2_CONTRACT.md`
- **Key Decision:** Deterministic projection from `document_entities`, RFC 8785 (JCS) canonicalization

### ✅ Verifier v2
- **Date:** 2026-01-05
- **Status:** Contract closed in `docs/VERIFIER_V2_CONTRACT.md`
- **Key Decision:** Offline-first, states: valid/tampered/incomplete/unknown

### ✅ TSA as Append-Only Event
- **Date:** 2026-01-06
- **Status:** Implemented, tested, documented
- **Key Decision:** TSA lives in `events[]`, NOT `hash_chain`. Cache (`tsa_latest`) is derived, not source of truth.

### ✅ Anchors Without Wallets
- **Date:** 2026-01-06
- **Status:** Decision formalized, implementation pending
- **Key Decision:** Anchors = system-generated evidence (server-side), NO user wallets, NO Metamask, NO legacy code reuse

---

## 🟡 In Progress (Active, No New Fronts)

### ⚠️ TSA UI Adaptation (1-2 days)
- **Scope:** DocumentsPage, VerificationComponent
- **Goal:** Show TSA status, descriptive tooltips
- **Blockers:** None

### ⚠️ TSA Edge Functions (1 day)
- **Scope:** `verify-ecox`, `process-signature`
- **Goal:** Read from `events[]` instead of legacy fields
- **Blockers:** None

---

## 🔴 Blocked (On Purpose)

These items are **intentionally blocked** until pre-requisites are met:

### 🚫 Anchors Implementation
- **Reason:** TSA must be 100% complete first (UI + edge functions)
- **Pre-requisites:**
  1. ✅ TSA DB schema complete
  2. ✅ `events[]` pattern validated
  3. ⬜ TSA UI complete
  4. ⬜ TSA edge functions complete
- **Next Step:** Design `ANCHOR_EVENT_RULES.md` (contract only, no code)

### 🚫 External Signatures (SignNow)
- **Reason:** Same pattern as anchors, waiting for anchors to be complete
- **Pre-requisites:**
  1. ⬜ Anchors contract designed
  2. ⬜ Anchors implemented following TSA pattern
- **Next Step:** Wait for anchors

---

## 📊 Metrics (Current State)

### Database
- ✅ `document_entities` canonical schema
- ✅ `events[]` column (JSONB array, append-only)
- ✅ `tsa_latest` column (JSONB, cache)
- ✅ Triggers: validation + auto-cache update
- ⚠️ Migration `20260106090005` applied
- ⚠️ Migration `20260106090006` safe (NO-OP placeholder)

### Service Layer
- ✅ `appendTsaEvent(documentId, payload)` functional
- ✅ `requestAndPersistTsa(documentId, witnessHash)` functional
- ✅ Types: `TsaEvent`, `TsaEventPayload`, `EventEntry`

### ECO v2 + Verifier
- ✅ ECO v2 includes `events: EventEntry[]`
- ✅ Verifier v2 validates TSA consistency
- ✅ Offline verification functional

### Tests
- ✅ 7 unit tests (TSA events) — **ALL PASSING**
- ✅ 6 integration tests (DB triggers) — **READY**

### Documentation
- ✅ `docs/contratos/TSA_EVENT_RULES.md` (843 lines)
- ✅ `docs/TSA_IMPLEMENTATION.md`
- ✅ `docs/TSA_DEPLOYMENT_GUIDE.md`
- ✅ `docs/TSA_ARCHITECTURE.txt`
- ✅ `TSA_SUMMARY.md`
- ✅ `decision_log2.0.md` (entry added)
- ✅ `docs/decision-log/2026-01-06_ANCHORS_NO_WALLETS.md` (formal decision)

---

## 🧭 Execution Order (Next 7 Days)

### Day 1-2: TSA UI Adaptation
```
[ ] DocumentsPage: show TSA status
[ ] VerificationComponent: TSA badge
[ ] Tooltips: evidence-based copy
```

### Day 3: TSA Edge Functions
```
[ ] verify-ecox: read from events[]
[ ] process-signature: check TSA if exists
```

### Day 4: Production Validation
```
[ ] Deploy to production
[ ] Monitor events[] performance
[ ] Validate trigger behavior
[ ] Confirm offline verification works
```

### Day 5-7: Anchors Contract Design
```
[ ] Design ANCHOR_EVENT_RULES.md (NO CODE)
[ ] Define event structure
[ ] Define invariants (MUST/SHOULD/MAY)
[ ] Define states (pending/confirmed/failed)
[ ] Define ECO v2 projection
[ ] Define verification offline
```

**NO CODE until contract is closed.**

---

## 🎯 System Health

### Production-Ready Components
- ✅ Canonical truth architecture
- ✅ ECO v2 projection
- ✅ Verifier v2 (offline)
- ✅ TSA event system (90% complete)
- ✅ DB triggers (append-only enforcement)

### Pending Components (Non-blocking)
- ⚠️ TSA UI (descriptive, not promissory)
- ⚠️ TSA edge functions (read from events[])

### Future Components (Blocked on Purpose)
- 🚫 Anchors (Polygon, Bitcoin)
- 🚫 External signatures (SignNow)

---

## 🔐 Invariants (Guaranteed by System)

### Database Level
- ✓ `events[]` is append-only (cannot shrink)
- ✓ TSA events validated by trigger
- ✓ `witness_hash` consistency enforced
- ✓ `tsa_latest` auto-derived (not writable)

### Application Level
- ✓ ECO v2 projection is deterministic (RFC 8785)
- ✓ Verifier v2 is offline-first
- ✓ UI reflects evidence, never promises

### Architectural Level
- ✓ `hash_chain` = result (immutable index)
- ✓ `events[]` = history (append-only ledger)
- ✓ Cache = derived (not source of truth)

---

## 📜 Axioms (System Canon)

### 1. Document Truth
> "The document is its original content at a point in time.  
> Everything else is witness or derived."

### 2. TSA Evidence
> "TSA is not a feature, it's evidence.  
> It lives in events[], not hash_chain."

### 3. Anchors Without Wallets
> "Anchors are system-generated evidence, not user-driven signatures.  
> Wallets are tools for humans, not dependencies for truth."

### 4. UI Reflects, Not Affirms
> "UI describes evidence present.  
> UI does NOT promise immutability."

---

## 🚫 Anti-Patterns (Formally Forbidden)

### ❌ DO NOT:
1. Mix result (`hash_chain`) with history (`events[]`)
2. Write to cache manually (always derived)
3. Use Metamask in core anchor flow
4. Reuse legacy blockchain code
5. Promise immutability in UI
6. Depend on live blockchain queries for verification

---

## 📍 Current Focus

**100% on TSA completion:**
- UI adaptation
- Edge functions migration
- Production validation

**NO new fronts until TSA is 100%.**

---

## ✅ Sign-Off

**Architect:** Manu  
**Date:** 2026-01-06  
**Status:** System state frozen, execution order locked

**Next Review:** After TSA 100% complete (Day 4)

---

**Summary:** TSA is 90% complete. Anchors decision is formalized. No new work until current sprint closes.
