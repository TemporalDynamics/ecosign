# Legacy Compatibility Decommission — Stage 1

Fecha de cierre: 2026-02-27

## Objetivo
Cerrar fallback legacy en endpoints públicos de invite/link para evitar
resolución ambigua por `document_id` y forzar contrato estricto por
`document_entity_id`.

## Alcance Stage 1
1. `create-signer-link`
- Request schema estricto: `documentEntityId` obligatorio.
- Se elimina fallback `documentId -> document_entity_id`.
- Se mantiene `document_id` solo como puntero opcional de compatibilidad en DB
  (no como autoridad).

2. `verify-invite-access`
- Se elimina fallback por `documents`.
- Si falta `document_entity_id` en invite: error explícito
  `legacy_invite_missing_document_entity_id` (409).

## Invariantes
1. Identidad canónica en runtime público
- No resolver autoridad de documento desde `document_id`.
- No resolver autoridad de documento via fallback `documents` en estos endpoints.

2. Errores explícitos para payload/link legacy
- En lugar de fallback silencioso, se devuelve código de error contractual.

## Evidencia
1. `supabase/functions/_shared/schemas.ts`
2. `supabase/functions/create-signer-link/index.ts`
3. `supabase/functions/verify-invite-access/index.ts`
4. `tests/authority/legacy_compat_decommission_guard.test.ts`

## Criterio de aceptación
1. Guard de decommission en verde.
2. Suite `tests/authority` en verde.
3. `prebeta_fire_drill` ejecuta el guard de decommission.
