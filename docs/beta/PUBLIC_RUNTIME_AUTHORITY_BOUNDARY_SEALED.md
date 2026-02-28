# Public Runtime Authority Boundary Sealed (Stage 2)

Fecha de cierre: 2026-02-27

## Objetivo
Sellar la frontera de autoridad del runtime público para que la identidad
canónica de documento sea `document_entity_id` y no exista reintroducción
silenciosa de `documentId` o lecturas a `documents` fuera de una allowlist
explícita.

## Invariantes de frontera
1. En endpoints públicos, la identidad primaria del documento es
   `document_entity_id`.
2. Los patrones `documentId` y `.from('documents')` están prohibidos por
   defecto en `supabase/functions/**/index.ts`.
3. Cualquier excepción debe estar en allowlist explícita y versionada en este
   documento y en su guard de autoridad.

## Allowlist explícita (excepciones actuales)
Estas funciones siguen permitidas de forma explícita por compatibilidad o por
integraciones externas:

1. `new-document-canonical-trigger` — trigger de proyección desde tabla `documents`.
2. `signer-access` — `documentId` refiere documento externo de SignNow.
3. `signnow` — `documentId` refiere documento externo de SignNow.
4. `signnow-webhook` — payload legado de integración usa `documentId`.
5. `submit-anchor-bitcoin` — forward de `document_id` legacy a anchor worker.
6. `submit-anchor-polygon` — forward de `document_id` legacy a anchor worker.
7. `anchor-bitcoin` — compatibilidad de payload legacy y puntero `documents`.
8. `anchor-polygon` — compatibilidad de payload legacy y puntero `documents`.

## Criterio de aceptación
1. Guard de frontera pública en verde.
2. Guard integrado en `prebeta_fire_drill.sh`.
3. Toda excepción está documentada en allowlist explícita.
