# 🚀 Deployment Guide - Anchoring System Hardening

> **Quick reference para deployar los fixes de anchoring**  
> **Tiempo estimado:** 30 minutos  
> **Risk level:** Low (cambios quirúrgicos, backward compatible)

---

## 📋 Pre-requisitos

- [ ] Acceso a Supabase Dashboard (SQL Editor)
- [ ] Supabase CLI instalado (`npm install -g supabase`)
- [ ] Credenciales configuradas (`supabase login`)
- [ ] Access to staging y prod projects

---

## 🎯 Quick Deploy (Staging)

### Paso 1: Apply Database Migration (5 min)

```bash
cd /home/manu/dev/ecosign

# Connect to staging project
supabase link --project-ref <staging-ref>

# Apply migration
supabase db push

# O manualmente en SQL Editor:
# Copiar contenido de: supabase/migrations/20251213000000_polygon_atomic_tx.sql
# Ejecutar en Supabase Dashboard → SQL Editor
```

**Verificar:**
```sql
-- Verificar que la función existe
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'anchor_polygon_atomic_tx';

-- Debe retornar: anchor_polygon_atomic_tx
```

---

### Paso 2: Deploy Edge Functions (10 min)

```bash
# Deploy todas las funciones modificadas
supabase functions deploy anchor-polygon --project-ref <staging-ref>
supabase functions deploy process-polygon-anchors --project-ref <staging-ref>
supabase functions deploy process-bitcoin-anchors --project-ref <staging-ref>
supabase functions deploy anchoring-health-check --project-ref <staging-ref>
```

**Verificar deployment:**
```bash
# Check logs
supabase functions logs process-polygon-anchors --project-ref <staging-ref> | tail -20

# Should see structured JSON logs like:
# {"timestamp":"...","level":"INFO","message":"process_polygon_anchors_started",...}
```

---

### Paso 3: Test Health Check (2 min)

```bash
# Get service key from Supabase Dashboard → Settings → API
export SUPABASE_SERVICE_KEY="your-service-role-key"

# Test health check endpoint
curl -X POST https://<staging-ref>.supabase.co/functions/v1/anchoring-health-check \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  | jq

# Should return:
# {
#   "overall": "healthy",
#   "timestamp": "...",
#   "checks": { ... }
# }
```

---

### Paso 4: Configure Health Check Cron (3 min)

En Supabase Dashboard → SQL Editor:

```sql
-- Schedule health check every 5 minutes
SELECT cron.schedule(
  'anchoring-health-check',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://<staging-ref>.supabase.co/functions/v1/anchoring-health-check',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )
    );
  $$
);

-- Verify cron job created
SELECT * FROM cron.job WHERE jobname = 'anchoring-health-check';
```

---

### Paso 5: Monitor Staging (24 horas)

```bash
# Watch logs en tiempo real
supabase functions logs process-polygon-anchors --project-ref <staging-ref> --follow

# Filter only errors
supabase functions logs process-polygon-anchors --project-ref <staging-ref> | jq 'select(.level == "ERROR")'

# Check anchoring success rate
psql "postgresql://..." -c "
  SELECT 
    anchor_type,
    COUNT(*) FILTER (WHERE anchor_status = 'confirmed') as confirmed,
    COUNT(*) FILTER (WHERE anchor_status = 'failed') as failed,
    COUNT(*) FILTER (WHERE anchor_status IN ('pending', 'processing')) as pending
  FROM anchors 
  WHERE created_at > now() - interval '24 hours'
  GROUP BY anchor_type;
"
```

**Criteria de éxito:**
- ✅ Health check retorna `"overall": "healthy"`
- ✅ No hay errores `atomic_transaction_failed`
- ✅ Logs en formato JSON estructurado
- ✅ Tasa de confirmación Polygon > 95%
- ✅ Tasa de confirmación Bitcoin > 80% (es lenta por naturaleza)
- ✅ No hay `documentHash undefined` errors

---

## 🎯 Production Deploy

**Solo ejecutar si staging pasó 24h sin issues!**

### Paso 1: Database Migration

```bash
# Connect to prod
supabase link --project-ref <prod-ref>

# Apply migration
supabase db push
```

### Paso 2: Deploy Functions (Canary)

```bash
# Deploy uno por uno con pausa entre cada uno
supabase functions deploy anchor-polygon --project-ref <prod-ref>
sleep 300  # Wait 5 min, monitor logs

supabase functions deploy process-polygon-anchors --project-ref <prod-ref>
sleep 300

supabase functions deploy process-bitcoin-anchors --project-ref <prod-ref>
sleep 300

supabase functions deploy anchoring-health-check --project-ref <prod-ref>
```

### Paso 3: Configure Cron

```sql
-- Same as staging, but with prod URL
SELECT cron.schedule(
  'anchoring-health-check',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://<prod-ref>.supabase.co/functions/v1/anchoring-health-check',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )
    );
  $$
);
```

### Paso 4: Monitor Production

```bash
# Watch logs closely for first hour
supabase functions logs process-polygon-anchors --project-ref <prod-ref> --follow | jq

# Check health
curl https://<prod-ref>.supabase.co/functions/v1/anchoring-health-check \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  | jq '.overall'
# Should return: "healthy"
```

---

## 🧪 Manual Testing (Optional pero recomendado)

### Test 1: Validation (debe fallar)

```bash
# Test undefined hash (should return 400)
curl -X POST https://<staging-ref>.supabase.co/functions/v1/anchor-polygon \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "documentHash": null
  }' | jq

# Expected: {"error": "documentHash is required and must be a string"}

# Test invalid format (should return 400)
curl -X POST https://<staging-ref>.supabase.co/functions/v1/anchor-polygon \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "documentHash": "not-a-valid-hash"
  }' | jq

# Expected: {"error": "Invalid documentHash. Must be 64 hex characters (SHA-256)"}
```

### Test 2: Valid Submission (debe funcionar)

```bash
# Generate a test hash (SHA-256 of "test")
TEST_HASH="9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"

# Submit to Polygon
curl -X POST https://<staging-ref>.supabase.co/functions/v1/anchor-polygon \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"documentHash\": \"$TEST_HASH\",
    \"metadata\": {\"test\": true}
  }" | jq

# Expected: {"success": true, "status": "pending", "txHash": "0x..."}

# Wait 2 minutes, then check status
sleep 120

# Query database
psql "postgresql://..." -c "
  SELECT 
    id,
    anchor_status,
    polygon_status,
    polygon_tx_hash,
    created_at,
    updated_at
  FROM anchors 
  WHERE document_hash = '$TEST_HASH'
  ORDER BY created_at DESC
  LIMIT 1;
"

# Expected status: 'confirmed' (o 'processing' si aún no confirmó)
```

### Test 3: Health Check

```bash
# Test all endpoints
curl https://<staging-ref>.supabase.co/functions/v1/anchoring-health-check \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  | jq

# Expected:
# {
#   "overall": "healthy" | "degraded",
#   "checks": {
#     "database": { "status": "healthy", "latencyMs": 45 },
#     "polygonRpc": { "status": "healthy", "latencyMs": 120 },
#     "bitcoinCalendars": { "status": "healthy", "healthyCount": 3 },
#     "mempoolApi": { "status": "healthy", "latencyMs": 230 }
#   }
# }
```

---

## 🔧 Troubleshooting

### Issue: "Function not found"
```bash
# Re-deploy function
supabase functions deploy <function-name> --project-ref <ref>

# Check deployment status
supabase functions list --project-ref <ref>
```

### Issue: "anchor_polygon_atomic_tx does not exist"
```bash
# Check if migration was applied
psql "postgresql://..." -c "
  SELECT routine_name 
  FROM information_schema.routines 
  WHERE routine_name = 'anchor_polygon_atomic_tx';
"

# If empty, re-apply migration
supabase db push --project-ref <ref>
```

### Issue: Logs show "error" level
```bash
# Get detailed error
supabase functions logs <function-name> --project-ref <ref> | jq 'select(.level == "ERROR")'

# Common fixes:
# 1. Check environment variables (POLYGON_RPC_URL, etc)
# 2. Verify database connection
# 3. Check RPC provider status
```

### Issue: Health check returns "unhealthy"
```bash
# Check which component is unhealthy
curl https://<ref>.supabase.co/functions/v1/anchoring-health-check \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  | jq '.checks | to_entries | map(select(.value.status != "healthy"))'

# Fix based on component:
# - database: Check Supabase status page
# - polygonRpc: Check POLYGON_RPC_URL in Supabase secrets
# - bitcoinCalendars: OpenTimestamps servers might be down (expected degradation)
# - mempoolApi: mempool.space might be rate limiting
```

---

## 📊 Success Metrics

Monitor estas métricas post-deployment:

### Immediate (first hour)
- [ ] No errors en logs
- [ ] Health check retorna "healthy"
- [ ] Al menos 1 Polygon anchor confirmado correctamente
- [ ] Logs en formato JSON estructurado

### Short-term (24 hours)
- [ ] Tasa de confirmación Polygon > 95%
- [ ] Tasa de confirmación Bitcoin > 80%
- [ ] No hay `atomic_transaction_failed` errors
- [ ] No hay `documentHash undefined` errors
- [ ] Exponential backoff working (ver `anchor_backoff_skip` logs)

### Long-term (1 week)
- [ ] Zero data corruption incidents
- [ ] Zero race condition incidents
- [ ] Average confirmation time Polygon < 2 min
- [ ] Average confirmation time Bitcoin < 12 hours
- [ ] Health check availability > 99%

---

## 🔄 Rollback Plan

Si algo sale mal:

### Rollback Edge Functions
```bash
# List previous deployments
supabase functions list --project-ref <ref>

# Deploy previous version (si tienes el código)
git checkout <previous-commit>
supabase functions deploy <function-name> --project-ref <ref>
```

### Rollback Database Migration
```sql
-- Drop new function
DROP FUNCTION IF EXISTS anchor_polygon_atomic_tx(
  UUID, UUID, TEXT, BIGINT, TEXT, TIMESTAMPTZ, JSONB, JSONB, INTEGER
);

-- Old code will continue to work (uses separate UPDATEs)
-- Warning: Will have race condition risk again
```

**Nota:** Rollback no recomendado. Los fixes son backward compatible y mejoran estabilidad.

---

## 📞 Support

**Issues durante deployment:**
- Check logs: `supabase functions logs <name> --project-ref <ref>`
- Check health: `curl .../anchoring-health-check`
- Review docs: `docs/ANCHORING_FLOW.md`

**Emergency contacts:**
- DEV 4 (Forense/Infra)
- Platform team

---

## ✅ Post-Deployment Checklist

- [ ] Migration applied successfully
- [ ] All functions deployed
- [ ] Health check cron configured
- [ ] Manual tests passed
- [ ] Logs verified (JSON format)
- [ ] Metrics baseline captured
- [ ] Team notified
- [ ] Documentation updated (if needed)
- [ ] Monitoring alerts configured (optional)

---

**Status después de deployment:**
```
┌────────────────────────────────────────┐
│  ANCHORING SYSTEM STATUS               │
├────────────────────────────────────────┤
│  ✅ Validation: Robust                 │
│  ✅ Atomic TX: Enabled                 │
│  ✅ Backoff: Exponential               │
│  ✅ Logging: Structured JSON           │
│  ✅ Health: Monitored                  │
│  ✅ Docs: Complete                     │
└────────────────────────────────────────┘

Ready for production! 🚀
```

---

*Última actualización: 2025-12-13*
