-- TSA VERIFICATION QUERIES
-- Use estas queries para verificar el estado de TSA events en document_entities
-- Reemplace 'd03545b7-e1e3-4124-9cd4-ddc7206c14f5' con su document_entity_id real

-- =============================================================================
-- 1. Ver estado actual del documento
-- =============================================================================
SELECT
  id,
  witness_hash,
  signed_hash,
  signed_authority,
  lifecycle_status,
  jsonb_array_length(events) as events_count,
  tsa_latest,
  updated_at
FROM public.document_entities
WHERE id = 'd03545b7-e1e3-4124-9cd4-ddc7206c14f5';

-- =============================================================================
-- 2. Ver si hay eventos TSA
-- =============================================================================
SELECT
  id,
  jsonb_path_exists(events, '$[*] ? (@.kind == "tsa")') as has_tsa_event,
  events -> 0 as first_event,
  tsa_latest
FROM public.document_entities
WHERE id = 'd03545b7-e1e3-4124-9cd4-ddc7206c14f5';

-- =============================================================================
-- 3. Ver todos los eventos del documento (si hay muchos, limitar)
-- =============================================================================
SELECT
  id,
  jsonb_pretty(events) as all_events
FROM public.document_entities
WHERE id = 'd03545b7-e1e3-4124-9cd4-ddc7206c14f5';

-- =============================================================================
-- 4. Ver triggers activos en document_entities
-- =============================================================================
SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  pg_get_triggerdef(t.oid) as definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'document_entities'
  AND NOT t.tgisinternal
ORDER BY tgname;

-- =============================================================================
-- 5. Ver funciones relacionadas con TSA/events
-- =============================================================================
SELECT
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (
    p.proname ILIKE '%tsa%'
    OR p.proname ILIKE '%events%'
    OR p.proname ILIKE '%document_entities%'
  )
ORDER BY p.proname;

-- =============================================================================
-- 6. Ver TODOS los documentos con TSA events (últimos 10)
-- =============================================================================
SELECT
  id,
  witness_hash,
  jsonb_path_exists(events, '$[*] ? (@.kind == "tsa")') as has_tsa,
  tsa_latest,
  lifecycle_status,
  created_at
FROM public.document_entities
WHERE jsonb_path_exists(events, '$[*] ? (@.kind == "tsa")')
ORDER BY created_at DESC
LIMIT 10;

-- =============================================================================
-- 7. Verificar si tsa_latest se deriva correctamente
-- =============================================================================
-- Esta query muestra si el trigger está derivando tsa_latest correctamente
SELECT
  id,
  (
    SELECT e.tsa
    FROM jsonb_array_elements(events) e
    WHERE e->>'kind' = 'tsa'
    ORDER BY e->>'at' DESC
    LIMIT 1
  ) as latest_tsa_event,
  tsa_latest
FROM public.document_entities
WHERE id = 'd03545b7-e1e3-4124-9cd4-ddc7206c14f5';

-- =============================================================================
-- 8. Ver estructura completa del documento (debug)
-- =============================================================================
SELECT jsonb_pretty(to_jsonb(d.*)) as full_document
FROM public.document_entities d
WHERE id = 'd03545b7-e1e3-4124-9cd4-ddc7206c14f5';

-- =============================================================================
-- 9. Contar documentos por lifecycle_status
-- =============================================================================
SELECT
  lifecycle_status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE jsonb_path_exists(events, '$[*] ? (@.kind == "tsa")')) as with_tsa
FROM public.document_entities
GROUP BY lifecycle_status
ORDER BY count DESC;

-- =============================================================================
-- 10. Ver eventos TSA recientes (últimos 5)
-- =============================================================================
SELECT
  de.id,
  de.witness_hash,
  e->>'kind' as event_kind,
  e->>'at' as event_timestamp,
  e->'tsa'->>'gen_time' as tsa_gen_time,
  e->'tsa'->>'digest_algo' as tsa_algo,
  length(e->'tsa'->>'token_b64') as token_length
FROM public.document_entities de,
     LATERAL jsonb_array_elements(de.events) e
WHERE e->>'kind' = 'tsa'
ORDER BY e->>'at' DESC
LIMIT 5;
