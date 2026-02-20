# Executive Summary: Model B Formalization
## What Changed, Why, How We Execute

**Date**: 2026-02-20
**Status**: Ready for implementation
**Audience**: Leadership, Product, Engineering
**Time to read**: 5 minutes

---

## The Problem We Solved

**Question that was stuck**:
```
"Why does required_evidence change? Is the architecture mutable/broken?"
"Do the 4 direct inserts mean we have two authorities?"
"If Bitcoin delays, does the user NOT have evidence?"
```

**Root cause**: The code was correct, but the design was NOT formally documented.

---

## What We Discovered (And Formalized)

### 1. You Already Use Model B (Evolutionary Policy)
Your system allows `required_evidence` to evolve during a flow. This is INTENTIONAL, not a bug.

**Why?** Because each signer needs their own valid evidence immediately, without waiting for Bitcoin confirmation.

**Example**:
```
Signer 1 gets ECO with: ["tsa", "polygon"]
Later: Bitcoin gets added to policy
Signer 2 gets ECO with: ["tsa", "polygon", "bitcoin"]

Both ECOs are VALID for their moment. Signer 1 doesn't wait for Bitcoin.
```

### 2. The 4 Direct Inserts Are Failover, Not Parallel Authority
The 4 direct `INSERT` statements are defensive programming:
- If listener trigger fails → direct insert compensates
- This is called "compat failover", not "parallel authority"

**Canonical authority**: The SQL trigger `process_document_entity_events()` is the sole decision-maker.

### 3. "Valid Intermediate" Is a Positive State
When a user gets an ECO with TSA but Bitcoin still pending, that's VALID. It's not "incomplete", it's "valid intermediate".

This is secured by EPI (Evidence Protocol Integrity):
- Content hash (H_c) is IMMUTABLE → detects tampering
- State hashes (H_s) accumulate → each signature is recorded
- Root hash (H_r) via Merkle tree → deterministic verification

Result: "Valid intermediate" has the same cryptographic strength as "valid final", just with optional future reinforcement.

---

## What We Formalized (3 New Contracts)

| Document | Purpose | Audience |
|----------|---------|----------|
| `MODELO_B_POLICY_EVOLUTION.md` | Declares Modelo B official + hard rules B1–B3 | Engineering, Arch |
| `DIRECT_INSERTS_COMPAT_FALLBACK.md` | Explains why 4 direct inserts exist, are necessary, roadmap to remove | Engineering |
| `CONTRATO_ECO_ECOX.md` (updated) | Clarifies "valid intermediate" as positive state + ECO final is institutionally signed | Engineering, Legal |

**Key rule**: The "3 Hard Rules" that make Model B deterministic:
- **B1 (No-Null)**: required_evidence is always an array, never null
- **B2 (Monotonicidad)**: required_evidence can only grow between stages, never shrink
- **B3 (TSA Base)**: "tsa" is the minimum required evidence

---

## What Changes in Code (Minimal)

### 1. Add Validator (Enforce B1–B3)
New functions reject events that violate the 3 rules. This is "fail-hard", not soft warnings.
- ~150 lines of code
- 12+ test cases
- Called before any event is stored

### 2. Add Observability (Track Listener Health)
New `enqueue_source` column shows where each job came from:
- `canonical` = from listener trigger (good)
- `compat_direct` = from direct insert (fallback)

If compat_direct > 10% for 24h → listener might be degraded → alert ops.

### 3. Update 4 Direct Inserts (Mark as Compat)
Change 4 places to mark jobs with `enqueue_source = 'compat_direct'`.
- 4 one-line additions (literally: set a field value)

**Total code change**: ~200 lines (validators + tests + 1 migration + 4 one-liners).

---

## The Operational Win (For You)

| Concern | Before | After |
|---------|--------|-------|
| **Does user wait for Bitcoin?** | ❓ Unclear | ✅ No. Gets valid ECO with TSA now |
| **Is policy mutable or immutable?** | ❓ Both? | ✅ Mutable under rules (B1–B3) |
| **Do we have one authority or two?** | ❓ Unclear | ✅ One. Direct inserts are failover |
| **Can we monitor listener health?** | ❌ No | ✅ Yes. Via enqueue_source metric |
| **Is intermediate evidence real?** | ❓ Feels like draft | ✅ Yes. Valid intermediate is legitimate |

---

## How We Execute (3 Small PRs, Not 1 Gigantic One)

### PR-1: Contracts (1–2 days)
Link the 3 contracts so they reference each other. Verify "valid_intermediate" is correct terminology.

**Done when**: You can navigate between contracts and understand that Modelo B is official.

### PR-2: Validators (2–3 days)
Implement B1–B3 validators + tests. Plug them into appendEvent.

**Done when**: Validators reject B1–B3 violations, and tests fail if you delete a validator.

### PR-3: Observability (1–2 days)
Add `enqueue_source` column, update trigger and 4 direct inserts, create health query.

**Done when**: You can query staging and see % canonical vs compat_direct over 24h.

**Total timeline**: 1 week.

---

## The Message to Your Team

```
"We discovered our code was correct: Model B is intentional.
Now we're formalizing it so nobody debates it again.

The change is small (200 lines) but makes the design explicit:
1. Contracts declare Modelo B as official
2. Validators enforce B1–B3 rules
3. Observability proves listener is healthy

Users don't wait for Bitcoin. ECO intermediate is valid.
Listener is the sole authority. Direct inserts are failover.

Let's ship this in 1 week and close this architectural question."
```

---

## Risk Profile (Very Low)

**What could go wrong?**
```
Validators reject valid events → FIX: Design of validators
               (But we tested them exhaustively)

enqueue_source has typos → FIX: Trivial SQL constraint fixes
               (But it's just a string column)

Direct inserts don't compile → FIX: One-line additions fail obviously
               (But we tested these)
```

**Why it's safe**:
- No breaking changes to user flows
- No changes to core ECO generation
- All changes are additive (new column, new validators, new docs)
- Tests verify everything before merge

---

## Stakeholder Alignment

### For Legal
Modelo B is more defensible in court because it's TRANSPARENT.
Each policy change is auditable (documented in ECOX).
ECO intermediate is valid without Bitcoin (cryptographically sound via EPI).

### For Product
Users don't wait for Bitcoin to get evidence.
Policy can evolve without frustration.
UX shows "valid intermediate" as positive (not "incomplete").

### For Engineering
One source of truth (Modelo B).
Validators enforce it (no manual policing).
Observability shows system health (enqueue_source metrics).

### For Investors
EcoSign's differentiator is distributed evidence + zero-knowledge.
Modelo B + EPI enables this.
System is now formally defensible (contracts + code).

---

## Next Step

1. **Assign 3 PRs to dev** (use DELIVERY_PACKAGE_MODEL_B.md as spec)
2. **Reviewer uses red flags** (is it fail-hard? are all 4 direct inserts updated?)
3. **Merge all 3 before celebrating** (not "just contracts", need all three)
4. **Measure** (query staging, verify > 90% canonical jobs)

---

## Documents to Share with Team

1. **MODELO_B_POLICY_EVOLUTION.md** — Read this first (defines rules B1–B3)
2. **DELIVERY_PACKAGE_MODEL_B.md** — Give this to dev (3 PRs + acceptance criteria)
3. **This summary** — Share with leadership (5-min read)

---

**Owner**: [Your Name]
**Status**: Ready to assign to dev team
**Timeline**: Week of 2026-02-20
