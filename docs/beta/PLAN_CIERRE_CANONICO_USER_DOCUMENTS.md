# PLAN_CIERRE_CANONICO_USER_DOCUMENTS

Fecha: 2026-02-27  
Estado: En ejecucion (slice share/OTP iniciado)

## Decision unica (congelada)
El runtime operativo de custodia cifrada se guarda en:

- `document_entities.metadata.ecox.runtime.encrypted_path`
- `document_entities.metadata.ecox.runtime.wrapped_key`
- `document_entities.metadata.ecox.runtime.wrap_iv`
- `document_entities.metadata.ecox.runtime.storage_bucket`

Regla: esto es runtime ECOX. No forma parte del ECO final.

## Criterio de cierre canonico
Un endpoint queda "canonico" cuando cumple todo:

1. No lee `user_documents` ni via join ni via helper inverso.
2. Resuelve documento por `document_entity_id`.
3. Lee runtime cifrado desde `document_entities.metadata.ecox.runtime.*`.
4. Emite/lee estado probatorio por `document_entity_id`.

## Slice 1 (critico externo): share/OTP
Objetivo: eliminar incendios de producto cuando `user_documents` esta vacia.

### Endpoints incluidos
- `verify-share-otp`
- `get-share-metadata`
- `accept-share-nda`
- `log-share-event`

### Base de datos
- Migration: `20260301000700_document_shares_entity_and_ecox_runtime.sql`
  - agrega `document_shares.document_entity_id`
  - backfill desde `user_documents.document_entity_id`
  - backfill de `metadata.ecox.runtime` en `document_entities`

### Cliente
- `client/src/lib/storage/documentSharing.ts`
  - inserta `document_entity_id` al crear share
  - sincroniza runtime canonico en `document_entities.metadata.ecox.runtime`

## Fases siguientes (orden recomendado)

1. PR2 - Invites/NDA/access canonicos  
   `create-invite`, `verify-access`, `accept-invite-nda`, `create-signer-link`, `generate-link`

2. PR3 - Anchors canonicos  
   `anchor-bitcoin`, `anchor-polygon`, `process-bitcoin-anchors`, `process-polygon-anchors`

3. PR4 - Endpoints operativos/diagnostico  
   `health-check`, `notify-document-certified`, `log-event`, `record-protection-event`, `repair-missing-anchor-events`

4. PR5 - Kill bridge y congelamiento legacy  
   `_shared/eventHelper.ts` (`getUserDocumentId`), gate CI anti reintroduccion, freeze RLS legacy

## Gate de no regresion
- Test: `tests/authority/share_runtime_canonical_guard.test.ts`
- Fire drill: `scripts/diagnostics/prebeta_fire_drill.sh`

Objetivo del gate:
- fallar si vuelve `.from('user_documents')` en endpoints de share/OTP.
- fallar si se pierde `document_shares.document_entity_id` o el runtime `ecox.runtime`.

## Nota de compatibilidad
Durante migracion, puede existir data legacy historica. El criterio del plan no usa fallback inverso a `user_documents`; si falta `document_entity_id`, se considera inconsistencia de migracion/backfill y se corrige en DB.
