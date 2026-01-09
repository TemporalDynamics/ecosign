# Anchoring System Audit Report

**Date:** 2026-01-06  
**Status:** AUDIT COMPLETE

---

## �� Executive Summary

### Current State: **FUNCTIONAL BUT LEGACY**

**Verdict:** Sistema funcional con arquitectura mixta (table + events). **Migración parcial recomendada**, NO rehacer todo.

---

## 📊 System Architecture (Current)

### 1. Database Tables

#### `anchor_states` (tabla agregada)
**Purpose:** Aggregated probative signals per project_id  
**File:** `20251224170000_add_anchor_states.sql`

```sql
CREATE TABLE public.anchor_states (
  project_id TEXT PRIMARY KEY,
  anchor_requested_at TIMESTAMPTZ,
  polygon_confirmed_at TIMESTAMPTZ,
  bitcoin_confirmed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Analysis:**
- ✅ Simple aggregation (one row per project)
- ❌ Separate from `document_entities` (bifurcates truth)
- ❌ No temporal history (only "last confirmed")
- ⚠️ Uses `project_id` (not `document_entity_id`)

**Status:** ⚠️ Legacy, pero funcional

#### `anchors` (tabla de transacciones)
**Purpose:** Individual anchor transactions (Polygon/Bitcoin)  
**Schema:** (infererido de código)

```sql
anchors:
- id
- document_hash
- user_document_id (FK legacy)
- document_id (FK?)
- anchor_status
- polygon_status
- polygon_tx_hash
- polygon_attempts
- polygon_error_message
- bitcoin_status
- bitcoin_anchor_id
- metadata (JSONB)
```

**Analysis:**
- ✅ Detalle transaccional (tx_hash, attempts, errors)
- ❌ Separate from `document_entities.events[]`
- ❌ Mixed FK (`user_document_id` vs `document_id`)
- ⚠️ No es append-only por diseño

**Status:** ⚠️ Legacy transactional table

### 2. Edge Functions

#### `anchor-polygon` ✅ WORKING
**File:** `supabase/functions/anchor-polygon/index.ts`  
**Purpose:** Anchor hash to Polygon Mainnet via ethers.js

**Flow:**
1. Validate `documentHash` (SHA-256 hex)
2. Connect to Polygon RPC (Alchemy)
3. Submit tx with sponsor wallet (system-controlled)
4. Insert into `anchors` table with status `pending`
5. Return `anchorId` + `txHash`

**Key Points:**
- ✅ Server-side wallet (NO Metamask)
- ✅ Real blockchain tx (not simulation)
- ⚠️ Writes to `anchors` table, NOT `events[]`
- ⚠️ TODO comment: "support document_entity_id"

**Config Required:**
- `POLYGON_RPC_URL` (Alchemy)
- `POLYGON_PRIVATE_KEY` (sponsor wallet)
- `POLYGON_CONTRACT_ADDRESS`

#### `anchor-bitcoin` ✅ WORKING
**File:** `supabase/functions/anchor-bitcoin/index.ts`  
**Purpose:** Anchor hash to Bitcoin via OpenTimestamps

**Flow:**
1. Validate `documentHash`
2. Submit to OpenTimestamps calendar servers
3. Insert into `anchors` table with status `pending`
4. Return `anchorId` + `otsProof`

**Key Points:**
- ✅ Server-side (no user wallet)
- ✅ OpenTimestamps (free, decentralized)
- ⚠️ Writes to `anchors` table, NOT `events[]`
- ⚠️ TODO comment: "support document_entity_id"

#### `process-polygon-anchors` ✅ WORKING (cron)
**File:** `supabase/functions/process-polygon-anchors/index.ts`  
**Purpose:** Background worker to confirm pending Polygon anchors

**Flow:**
1. Query `anchors` WHERE `polygon_status = 'pending'`
2. Check tx receipt on Polygon RPC
3. If confirmed → update `polygon_status = 'confirmed'`, `polygon_confirmed_at`
4. If failed → retry or mark `failed`
5. Send notification email

**Key Points:**
- ✅ Automatic retry logic
- ✅ Updates `anchor_states.polygon_confirmed_at`
- ⚠️ Reads/writes `anchors` table (not `events[]`)

#### `process-bitcoin-anchors` ✅ WORKING (cron)
**File:** `supabase/functions/process-bitcoin-anchors/index.ts`  
**Purpose:** Background worker to verify Bitcoin anchors via OpenTimestamps

**Flow:**
1. Query `anchors` WHERE `bitcoin_status = 'pending'`
2. Query OpenTimestamps calendar for completion
3. If confirmed (6+ blocks) → update `bitcoin_status = 'confirmed'`
4. If timeout (288 attempts × 5min = 24h) → mark `failed`
5. Send notification email

**Key Points:**
- ✅ 24h patience window (matches user promise)
- ✅ Alert threshold at 20h (240 attempts)
- ⚠️ Reads/writes `anchors` table (not `events[]`)

### 3. Database Triggers

#### `trigger_blockchain_anchoring()` ✅ AUTOMATIC
**File:** `20251221100000_blockchain_anchoring_trigger.sql`

**Trigger:** `AFTER INSERT ON user_documents`  
**Condition:** `NEW.polygon_status = 'pending' OR NEW.bitcoin_status = 'pending'`

**Action:**
1. Fetch `supabase_url` + `service_role_key` from app settings
2. Call `anchor-polygon` edge function via `pg_net.http_post`
3. Call `anchor-bitcoin` edge function via `pg_net.http_post`

**Key Points:**
- ✅ Server-side automatic anchoring
- ✅ No client involvement (closes browser = still works)
- ⚠️ Triggers on `user_documents` (legacy table)
- ⚠️ NOT integrated with `document_entities`

---

## 🎯 Gaps vs Canonical Architecture

### 1. **Anchors NOT in events[]**
**Current:** Anchors in separate `anchors` + `anchor_states` tables  
**Canonical:** Anchors should be `events[]` entries

**Impact:**
- Bifurcated truth (DB has two sources for anchor state)
- No temporal history (only "last confirmed")
- Inconsistent with TSA pattern

### 2. **Uses user_documents (legacy)**
**Current:** Trigger on `user_documents` table  
**Canonical:** Should use `document_entities`

**Impact:**
- Not aligned with canonical truth architecture
- Mixed FK references (`user_document_id` vs `document_entity_id`)

### 3. **project_id vs document_entity_id**
**Current:** `anchor_states` uses `project_id` (from ECO manifest)  
**Canonical:** Should use `document_entity_id`

**Impact:**
- Mapping complexity
- Not first-class document_entities citizen

### 4. **No witness_hash validation**
**Current:** Anchors use `document_hash` (unspecified context)  
**Canonical:** Should anchor `witness_hash` (canonical)

**Impact:**
- "Hash correcto en contexto equivocado" risk
- No consistency check with `document_entities.witness_hash`

---

## ✅ What Works Well

### 1. Server-Side Architecture ✅
- NO Metamask dependency
- System-controlled wallet (Polygon)
- OpenTimestamps (Bitcoin)
- Automatic retries

### 2. Background Processing ✅
- Cron workers (`process-*-anchors`)
- Non-blocking user flow
- Email notifications

### 3. Real Blockchain Operations ✅
- Polygon Mainnet (via Alchemy)
- Bitcoin (via OpenTimestamps)
- NOT simulated

### 4. Trigger Automation ✅
- DB trigger auto-invokes edge functions
- No client involvement needed

---

## 🚧 Migration Strategy

### Option A: FULL REWRITE (NOT RECOMMENDED)
❌ Discard all anchor code  
❌ Rebuild from scratch  
❌ High risk, no backward compat  

**Why NOT:** Código funcional, sistema estable, solo necesita integración canónica.

### Option B: CANONICAL INTEGRATION (RECOMMENDED)

**Approach:** Integrate existing anchor system with `document_entities.events[]`

#### Phase 1: Add events[] Support (2-3 days)
1. ✅ Keep existing `anchors` table (transactional detail)
2. ✅ Add event append to `anchor-polygon` edge function:
   ```typescript
   // After anchor tx confirmed
   await appendAnchorEvent(documentEntityId, {
     kind: 'anchor',
     network: 'polygon',
     txid: txHash,
     status: 'confirmed'
   });
   ```
3. ✅ Add event append to `anchor-bitcoin` edge function
4. ✅ Dual-write: `anchors` table + `events[]` (parallel)

#### Phase 2: Migrate Trigger (1 day)
1. Create trigger on `document_entities` (not `user_documents`)
2. Use `document_entity_id` (not `user_document_id`)
3. Anchor `witness_hash` (not generic `document_hash`)

#### Phase 3: Update UI (1 day)
1. Read anchors from `events[]` (canonical)
2. Fallback to `anchor_states` (legacy compat)
3. Show "Anchor presente: Polygon tx abc..." (descriptive)

#### Phase 4: Deprecate Legacy (future)
1. Stop writing to `anchor_states`
2. Mark `anchors` table as transactional detail only
3. All reads from `events[]`

---

## 📋 Recommended Actions

### Immediate (This Week)
- [x] Audit complete (this document)
- [ ] Design `ANCHOR_EVENT_RULES.md` contract (2-3h)
- [ ] Create anchor helper for edge functions (1h)

### Short-term (Next Sprint)
- [ ] Integrate `anchor-polygon` with `events[]` (1 day)
- [ ] Integrate `anchor-bitcoin` with `events[]` (1 day)
- [ ] Update trigger to use `document_entities` (1 day)
- [ ] Update UI to read from `events[]` (1 day)

### Medium-term (Post-MVP)
- [ ] Migrate historical anchors to `events[]`
- [ ] Deprecate `anchor_states` table
- [ ] Remove legacy FK references

---

## 🎯 Decision Matrix

| Criterion | Full Rewrite | Canonical Integration |
|-----------|--------------|----------------------|
| **Effort** | 2-3 weeks | 5-7 days |
| **Risk** | High (new code) | Low (proven code) |
| **Backward Compat** | ❌ Breaks existing | ✅ Maintains |
| **Canonical Alignment** | ✅ Perfect | ✅ Good enough |
| **Timeline** | Blocks MVP | ✅ Fits sprint |

**Winner:** **Canonical Integration** (Option B)

---

## ✅ Final Verdict

### **NO rehacer todo. Integrar con events[].**

**Rationale:**
1. Sistema actual **funciona** (Polygon + Bitcoin real)
2. Arquitectura server-side **correcta** (no wallets)
3. Solo falta **integración canónica** (events[])
4. Migración **no-blocker** (dual-write primero)

**Effort:** 5-7 días (vs 2-3 semanas reescribiendo)

**Timeline:**
- Diseño: 1 día
- Implementación: 3-4 días
- Testing: 1 día
- Deploy: 1 día

---

## 📚 References

**Edge Functions:**
- `supabase/functions/anchor-polygon/index.ts`
- `supabase/functions/anchor-bitcoin/index.ts`
- `supabase/functions/process-polygon-anchors/index.ts`
- `supabase/functions/process-bitcoin-anchors/index.ts`

**Migrations:**
- `20251224170000_add_anchor_states.sql`
- `20251221100000_blockchain_anchoring_trigger.sql`

**Client Libraries:**
- `client/src/lib/polygonAnchor.ts`
- `client/src/lib/opentimestamps.ts`

**Docs:**
- `docs/EDGE_CANON_MIGRATION_PLAN.md` (TODO comments reference this)

---

**Summary:**

Anchoring system is **functional and production-ready**, just needs **canonical integration** with `document_entities.events[]`. NOT a rewrite, just extension of proven code.

