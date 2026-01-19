# Hito Core E2E (local)

Fecha: 2026-01-19
Estado: cerrado
Alcance: flujo TSA canónico sin executor

## Objetivo
Probar de punta a punta el core canónico:
documento -> witness_hash -> TSA -> events[] -> UI.

## Resultado
- `document_entities` nace válido (hash_only).
- `witness_hash` se deriva correctamente desde `source_hash`.
- `append_document_entity_event()` escribe evento TSA.
- `events[]` append-only con TSA.
- `tsa_latest` derivado correctamente.
- UI refleja "Protegido" al refrescar.

## Evidencia (queries)
```sql
select id, source_hash, witness_hash
from public.document_entities
order by created_at desc
limit 1;
```

```sql
select id, jsonb_array_length(events) as event_count, tsa_latest
from public.document_entities
order by created_at desc
limit 1;
```

## Notas
- El trigger `document_entities_hash_only_witness_hash` debe existir en local.
- Si la UI muestra "Procesando", revisar el payload de `document_entities` y forzar refresh.
