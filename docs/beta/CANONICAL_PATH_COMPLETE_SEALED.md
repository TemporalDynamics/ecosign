# Canonical Path Complete Sealed (Milestone)

Fecha de cierre: 2026-02-27

## Objetivo
Formalizar el cierre del camino canónico operativo end-to-end para:
1. Share de documento (link + NDA + OTP).
2. Flujo de firma con OTP de firmante.

Este milestone asegura contrato determinista de identidad documental
(`document_entity_id`), eventos canónicos y consumo one-time de capacidades.

## Alcance (path sellado)
1. Share path
- `generate-link`
- `verify-access`
- `accept-share-nda`
- `get-share-metadata`
- `verify-share-otp`

2. Signature OTP path
- `start-signature-workflow`
- `send-signer-otp`
- `verify-signer-otp`
- `apply-signer-signature`

## Invariantes de cierre
1. Identidad canónica
- `document_entity_id` como puntero autoritativo de documento en runtime.
- Rechazo explícito de links legacy incompletos en verificación de acceso.

2. Share OTP one-time
- `verify-share-otp` consume la capacidad una sola vez:
  `pending -> accessed` en transición atómica.

3. NDA/Share probatorio sobre entidad canónica
- Eventos de share/NDA se apendean en `document_entities.events[]`
  mediante helper canónico.

4. OTP de firmante con token validado
- `send-signer-otp` y `verify-signer-otp` validan `signer access token`.
- `verify-signer-otp` emite `otp.verified` (ledger de documento + workflow).

5. Firma condicionada a vínculo canónico
- `apply-signer-signature` exige `workflow.document_entity_id`.
- Sin vínculo de entidad, la firma responde `missing_document_entity_id`.

## Evidencia de cierre
1. Endpoints:
- `supabase/functions/verify-share-otp/index.ts`
- `supabase/functions/verify-access/index.ts`
- `supabase/functions/accept-share-nda/index.ts`
- `supabase/functions/start-signature-workflow/index.ts`
- `supabase/functions/send-signer-otp/index.ts`
- `supabase/functions/verify-signer-otp/index.ts`
- `supabase/functions/apply-signer-signature/index.ts`

2. Esquemas:
- `supabase/functions/_shared/schemas.ts`

3. Guard de milestone:
- `tests/authority/canonical_path_complete_sealed_guard.test.ts`

## Criterio de aceptación
El milestone se considera sellado si:
1. El guard del milestone y la suite `tests/authority` están en verde.
2. El gate `prebeta_fire_drill` ejecuta el guard del milestone.
3. No se rompe la transición one-time de OTP share ni el contrato de firma
   ligado a `document_entity_id`.

## Fuera de alcance
1. Compatibilidad de endpoints legacy fuera del path v2 activo.
2. SLA comercial de colas/cron.
3. Optimización de copy UX no estructural.
