# Diagnóstico por Eventos - Guía Operativa

**Fecha:** 2026-01-21  
**Versión:** v1.0

## Propósito

Guía para diagnosticar problemas en el flujo de protección de documentos basado en eventos canónicos.

## Script Mental de Diagnóstico

### "UI dice 'protected' pero no hay artifact finalizado"

**Buscar en `document_entities.events[]`:**
1. ¿Existe `tsa.confirmed`? → Sí: TSA completado, revisar anclajes
2. ¿Existen eventos `anchor.submitted`? → Sí: anclajes solicitados
3. ¿Existen eventos `anchor` (confirmados)? → Sí: anclajes confirmados
4. ¿Se requieren anclajes específicos en `protection`? → Verificar si están completos

**SQL de diagnóstico:**
```sql
SELECT 
  id,
  jsonb_path_query_array(events, '$[*] ? (@.kind == "tsa.confirmed")') as tsa,
  jsonb_path_query_array(events, '$[*] ? (@.kind == "anchor.submitted")') as anchor_submitted,
  jsonb_path_query_array(events, '$[*] ? (@.kind == "anchor")') as anchor_confirmed,
  jsonb_path_query_array(events, '$[*] ? (@.kind == "artifact.finalized")') as artifact
FROM document_entities 
WHERE id = 'DOCUMENT_ID';
```

### "Anclajes no confirman"

**Buscar:**
1. ¿Existen eventos `anchor.submitted`? → Sí: solicitud hecha
2. ¿Hay jobs `submit_anchor_*` en estado `succeeded`? → Verificar ejecución
3. ¿Hay errores en `process-*-anchors` logs? → Verificar confirmación blockchain

**SQL de diagnóstico:**
```sql
-- Verificar jobs de anclaje
SELECT 
  entity_id,
  type,
  status,
  created_at,
  last_error
FROM executor_jobs 
WHERE entity_id = 'DOCUMENT_ID' 
  AND type LIKE 'submit_anchor_%'
ORDER BY created_at DESC;

-- Verificar logs de anclaje
SELECT 
  event_type,
  metadata,
  timestamp
FROM events  -- tabla legacy de logs si existe
WHERE document_id = 'USER_DOCUMENT_ID' 
  AND event_type LIKE '%anchor%'
ORDER BY timestamp DESC;
```

### "Processing forever"

**Buscar:**
1. ¿Hay jobs pendientes en `executor_jobs`?
2. ¿Hay eventos faltantes para completar el nivel requerido?
3. ¿Hay jobs fallidos que no se reintentan?

**SQL de diagnóstico:**
```sql
-- Jobs pendientes para el documento
SELECT 
  id,
  type,
  status,
  attempts,
  last_error,
  created_at,
  run_at
FROM executor_jobs 
WHERE entity_id = 'DOCUMENT_ID' 
  AND status IN ('queued', 'running', 'retry_scheduled')
ORDER BY created_at DESC;

-- Eventos actuales vs requeridos
WITH doc AS (
  SELECT events FROM document_entities WHERE id = 'DOCUMENT_ID'
)
SELECT 
  EXISTS (SELECT 1 FROM jsonb_path_query(events, '$[*] ? (@.kind == "tsa.confirmed")')) as has_tsa,
  EXISTS (SELECT 1 FROM jsonb_path_query(events, '$[*] ? (@.kind == "anchor")')) as has_anchor_confirmed,
  EXISTS (SELECT 1 FROM jsonb_path_query(events, '$[*] ? (@.kind == "artifact.finalized")')) as has_artifact
FROM doc;
```

## Niveles de Evidencia - Chequeo Rápido

### `PROTECTED` (TSA confirmado)
- ✅ `tsa.confirmed` existe
- ❌ `tsa.confirmed` no existe

### `REINFORCED` (TSA + 1 anclaje)
- ✅ `tsa.confirmed` + al menos 1 evento `anchor` existe
- ❌ Falta evento `anchor`

### `MAXIMUM` (TSA + Polygon + Bitcoin)
- ✅ `tsa.confirmed` + evento `anchor` polygon + evento `anchor` bitcoin
- ❌ Falta alguno de los anclajes

## Errores Comunes y Soluciones

### Error: "artifact.finalized" duplicado
**Causa:** Reintento de job después de éxito
**Solución:** Idempotencia correcta - no es problema si el hash es el mismo

### Error: "anchor.submitted" sin confirmación
**Causa:** Problemas de red, RPC, o blockchain congestionado
**Solución:** Verificar logs de `process-*-anchors`, puede requerir reintento manual

### Error: Job "build_artifact" encolado pero no ejecuta
**Causa:** Condiciones de ejecución no cumplidas
**Solución:** Verificar que todos los eventos requeridos estén presentes

## Queries Útiles

### Documentos en estado específico
```sql
-- Documentos con TSA pero sin anclajes confirmados
SELECT id, events 
FROM document_entities 
WHERE events @? '$[*] ? (@.kind == "tsa.confirmed")'::jsonpath
  AND NOT events @? '$[*] ? (@.kind == "anchor")'::jsonpath;
```

### Verificar consistencia de jobs vs eventos
```sql
-- Jobs pendientes vs eventos faltantes
SELECT 
  j.entity_id,
  j.type,
  j.status,
  -- Verificar si el evento correspondiente ya existe
  CASE 
    WHEN j.type = 'submit_anchor_polygon' THEN 
      NOT EXISTS (SELECT 1 FROM jsonb_path_query(e.events, '$[*] ? (@.kind == "anchor" && @.anchor.network == "polygon")'))
    WHEN j.type = 'submit_anchor_bitcoin' THEN 
      NOT EXISTS (SELECT 1 FROM jsonb_path_query(e.events, '$[*] ? (@.kind == "anchor" && @.anchor.network == "bitcoin")'))
    ELSE true
  END as event_still_needed
FROM executor_jobs j
JOIN document_entities e ON e.id = j.entity_id
WHERE j.status = 'queued';
```