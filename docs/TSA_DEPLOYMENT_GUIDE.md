# TSA Implementation - Deployment Guide

## Pre-deployment Checklist

- [ ] Review all migrations in `supabase/migrations/`
- [ ] Backup production database
- [ ] Run tests locally: `npm run test -- tests/unit/tsaEvents.test.ts`
- [ ] Verify TypeScript compilation (expected pre-existing errors are OK)

---

## Deployment Steps

### 1. Apply Migrations (Local Dev)

```bash
# Start Supabase local dev (if not already running)
supabase start

# Apply migrations
supabase db reset  # This applies all migrations from scratch

# OR apply specific migrations:
supabase migration up 20260106090005_document_entities_events
supabase migration up 20260106090006_migrate_legacy_tsa
```

### 2. Verify Migrations

```bash
# Check that events column exists
psql $DATABASE_URL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'document_entities' AND column_name IN ('events', 'tsa_latest');"

# Should return:
#  column_name | data_type
# -------------+-----------
#  events      | jsonb
#  tsa_latest  | jsonb

# Check triggers exist
psql $DATABASE_URL -c "SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'document_entities';"

# Should include:
# - document_entities_events_append_only_guard
# - document_entities_update_tsa_latest
```

### 3. Run Integration Tests

```bash
# Requires Supabase local dev running
npm run test -- tests/integration/tsaEvents.test.ts
```

**Expected output:**
```
✓ tests/integration/tsaEvents.test.ts (6 tests)
  ✓ appends TSA event successfully
  ✓ auto-updates tsa_latest on TSA append
  ✓ rejects TSA event with mismatched witness_hash
  ✓ rejects TSA event without token_b64
  ✓ enforces events append-only (cannot shrink)
  ✓ allows multiple TSA events
```

### 4. Deploy to Production

#### Option A: Supabase CLI (Recommended)

```bash
# Link to production project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

#### Option B: Manual SQL (if CLI unavailable)

1. Connect to production DB
2. Execute migrations in order:
   - `20260106090005_document_entities_events.sql`
   - `20260106090006_migrate_legacy_tsa.sql` (if legacy data exists)

### 5. Post-Deployment Verification

```bash
# Check one document has events column
psql $PROD_DATABASE_URL -c "SELECT id, jsonb_array_length(events) AS event_count, tsa_latest IS NOT NULL AS has_tsa FROM document_entities LIMIT 5;"

# Test append TSA (via app or direct SQL):
# UPDATE document_entities
# SET events = events || '...'::jsonb
# WHERE id = '...'
```

---

## Rollback Plan

If issues arise, rollback is **safe** because:

1. **No destructive changes** (additive only)
2. **No data loss** (events[] starts empty)
3. **Old code still works** (doesn't read events[] yet)

### Rollback Steps

```bash
# Remove columns (if needed)
ALTER TABLE document_entities DROP COLUMN events;
ALTER TABLE document_entities DROP COLUMN tsa_latest;

# Remove triggers
DROP TRIGGER document_entities_events_append_only_guard ON document_entities;
DROP TRIGGER document_entities_update_tsa_latest ON document_entities;

# Remove functions
DROP FUNCTION enforce_events_append_only();
DROP FUNCTION update_tsa_latest();
DROP FUNCTION validate_tsa_event(jsonb);
```

**Note:** Rollback is **NOT necessary** unless DB performance issues occur (unlikely).

---

## Post-Deployment Tasks

### Short-term (This Week)

1. **Monitor DB Performance**
   - Check query times on `document_entities`
   - Ensure GIN index on `events` is used

2. **UI Adaptation**
   - Show TSA status in DocumentsPage
   - Add TSA badge in VerificationComponent

3. **Edge Functions Update**
   - Migrate `verify-ecox` to read from `events[]`
   - Update `process-signature` to check TSA

### Medium-term (Next Sprint)

1. **Anchors Migration**
   - Move Polygon/Bitcoin anchors to `events[]`
   - Follow same pattern as TSA

2. **External Signatures**
   - Add `kind:"external_signature"` events
   - SignNow/DocuSign integration

---

## Troubleshooting

### Issue: Migration fails with "relation already exists"

**Cause:** Migration already applied

**Solution:**
```bash
# Check migration status
supabase migration list

# Skip if already applied
```

### Issue: Trigger validation fails on TSA append

**Cause:** `witness_hash` mismatch or missing `token_b64`

**Solution:**
```sql
-- Check current witness_hash
SELECT id, witness_hash FROM document_entities WHERE id = '...';

-- Ensure TSA payload has matching witness_hash
```

### Issue: `tsa_latest` not updating

**Cause:** Trigger not firing (unlikely)

**Solution:**
```sql
-- Check trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'document_entities_update_tsa_latest';

-- Manually trigger update (if needed)
UPDATE document_entities SET events = events WHERE id = '...';
```

---

## Performance Considerations

### JSONB Array Performance

- **Small arrays (<100 events):** No performance impact
- **Large arrays (>1000 events):** GIN index prevents slowdown
- **Query optimization:** Use `tsa_latest` cache for reads

### Index Usage

```sql
-- Verify GIN index is created
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'document_entities';

-- Should include:
-- idx_document_entities_events_kind (GIN index on events)
```

---

## Monitoring Queries

```sql
-- Count documents with TSA
SELECT COUNT(*) FROM document_entities WHERE tsa_latest IS NOT NULL;

-- Average events per document
SELECT AVG(jsonb_array_length(events)) FROM document_entities;

-- Documents with multiple TSA
SELECT id, jsonb_array_length(events) AS tsa_count
FROM document_entities
WHERE (
  SELECT COUNT(*)
  FROM jsonb_array_elements(events) e
  WHERE e->>'kind' = 'tsa'
) > 1;
```

---

## Success Criteria

- [ ] Migrations applied without errors
- [ ] All triggers active and firing
- [ ] 7/7 unit tests passing
- [ ] 6/6 integration tests passing
- [ ] No performance degradation (<10ms query time increase)
- [ ] TSA can be appended via `appendTsaEvent()`
- [ ] ECO v2 exports include `events[]`
- [ ] Verifier v2 validates TSA correctly

---

## Contact

If issues arise during deployment:

1. Check logs: `supabase db logs`
2. Review migration status: `supabase migration list`
3. Rollback if critical (see Rollback Plan above)

---

**Deployment estimated time:** 15-30 minutes  
**Risk level:** LOW (additive changes only)  
**Rollback time:** 5 minutes (if needed)
