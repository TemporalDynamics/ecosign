# 📦 Legacy Implementations - Historical Reference

**Created:** 2026-01-06  
**Status:** Preserved for reference  
**Decision:** See `/docs/DECISIONS_POST_ANCHOR_SPRINT.md`

---

## 🎯 Purpose

This folder contains **previous implementations** of the anchoring system that were replaced during the **Canonical Contracts Refactor** (2026-01-06).

**These files are NOT in use.** They are preserved as:
- Historical reference for architectural decisions
- Comparison baseline for new implementation
- Documentation of what was improved and why

---

## 📂 Contents

### `anchor-bitcoin/`
Previous implementation of Bitcoin anchoring using OpenTimestamps.

**Replaced by:**
- Canonical events model (`document_entities.events[]`)
- `anchorHelper.ts` with unified interface
- Decision: `docs/contratos/ANCHOR_EVENT_RULES.md`

### `anchor-polygon/`
Previous implementation of Polygon anchoring with direct contract interaction.

**Replaced by:**
- Canonical events model (`document_entities.events[]`)
- `anchorHelper.ts` with unified interface
- Decision: `docs/contratos/ANCHOR_EVENT_RULES.md`

### `process-bitcoin-anchors/`
Previous cron-based worker for Bitcoin anchor processing.

**Replaced by:**
- Dual-write pattern in canonical workers
- Trigger-based witness_hash resolution
- DB-enforced invariants

### `process-polygon-anchors/`
Previous cron-based worker for Polygon anchor processing.

**Replaced by:**
- Dual-write pattern in canonical workers
- Trigger-based witness_hash resolution
- DB-enforced invariants

---

## 🔄 Migration Timeline

| Date | Action | Reason |
|------|--------|--------|
| 2026-01-05 | Moved to `_legacy/` | Canonical refactor completed |
| 2026-01-06 | Preserved with README | Historical reference value |
| TBD | Final decision | Archive or maintain post-merge |

---

## 🚫 DO NOT USE

**These implementations are deprecated.**

If you need anchoring functionality, use:
- **Current implementation:** `supabase/functions/_shared/anchorHelper.ts`
- **Documentation:** `docs/contratos/ANCHOR_EVENT_RULES.md`
- **Examples:** See active edge functions using `requestAnchor()`

---

## 📊 Why was this replaced?

### Problems with old approach:
1. **No single source of truth** - Data scattered across tables
2. **Mutable state** - `document_hash` table modified post-creation
3. **No probative integrity** - Events could be lost or overwritten
4. **Complex resolution** - Witness hash derived from multiple sources
5. **No DB-level guarantees** - Logic in application layer only

### Canonical approach solves:
1. ✅ **Single source of truth:** `document_entities.events[]`
2. ✅ **Immutable events:** Append-only, DB-enforced
3. ✅ **Probative integrity:** Constraints + indexes
4. ✅ **Simple resolution:** Trigger derives canonical witness_hash
5. ✅ **DB-level guarantees:** Constraints, triggers, uniqueness

---

## 🔍 Comparison

### Old Architecture (Legacy)
```
document_hash (mutable)
  ↓
polygon_anchor_status
bitcoin_anchor_status
  ↓
UI reads from multiple tables
  ↓
Derives protection_level
```

**Issues:** Race conditions, inconsistency, no audit trail

### New Architecture (Canonical)
```
document_entities.events[] (immutable, append-only)
  ↓ DB trigger
witness_hash (derived, cached)
  ↓
UI reads single source
  ↓
Derives protection_level (pure function)
```

**Benefits:** Immutable, auditable, provable, consistent

---

## 📚 Related Documentation

- **Decision log:** `/docs/DECISIONS_POST_ANCHOR_SPRINT.md`
- **Canonical contracts:** `/docs/contratos/ANCHOR_EVENT_RULES.md`
- **Migration guide:** `/docs/ANCHORING_SYSTEM_AUDIT.md`
- **Current implementation:** `/supabase/functions/_shared/anchorHelper.ts`

---

## ⏭️ Next Steps

**Post-merge evaluation (2-3 weeks):**
1. Verify canonical system stability
2. Decide final fate of legacy code:
   - **Option A:** Keep as permanent reference
   - **Option B:** Archive to `/docs/legacy-code/`
   - **Option C:** Delete after documentation extraction

**Until then:** Preserved as-is.

---

**Status:** ⏸️ FROZEN - Do not modify  
**Merge blocking:** ❌ NO  
**Historical value:** ✅ YES
