# Legacy Paths Map (EPI Enforcement)
**Estado:** Canónico
**Alcance:** Rutas legacy que pueden violar invariants EPI/ECO/PDF
**Fecha:** 2026-02-09

## Objetivo
Este mapa identifica rutas legacy que pueden romper invariants canónicos. Cada entrada declara:
- **path**: archivo o función
- **risk_level**: HIGH / MEDIUM / LOW
- **breaks_invariant**: IDs EPI afectados
- **reason**: por qué rompe la ley
- **action**: hard_block / migrate / keep_compat

## Nivel 1 — HIGH (bloqueo inmediato)
- **path:** `supabase/functions/process-signature/index.ts`
  - risk_level: **HIGH**
  - breaks_invariant: `EPI-INV-001`, `EPI-INV-002`, `EPI-INV-006`
  - reason: Firma/evidencia fuera del pipeline canónico, sin asserts.
  - action: **hard_block**

- **path:** `supabase/functions/store-signer-signature/index.ts`
  - risk_level: **HIGH**
  - breaks_invariant: `EPI-INV-001`, `EPI-INV-002`, `EPI-INV-006`
  - reason: Persistencia legacy de firma sin invariants EPI.
  - action: **hard_block**

- **path:** `supabase/functions/stamp-pdf/index.ts`
  - risk_level: **HIGH**
  - breaks_invariant: `EPI-INV-001`, `EPI-INV-006`, `EPI-INV-007`
  - reason: Genera PDF witness fuera del pipeline canónico.
  - action: **hard_block**

- **path:** `supabase/functions/append-tsa-event/index.ts`
  - risk_level: **HIGH**
  - breaks_invariant: `EPI-INV-001`, `EPI-INV-002`
  - reason: Puede escribir TSA sin asegurar el witness correcto.
  - action: **hard_block**

## Nivel 2 — MEDIUM (dual-write / legacy tables)
- **path:** `supabase/functions/process-polygon-anchors/index.ts`
  - risk_level: **MEDIUM**
  - breaks_invariant: `EPI-INV-001`, `EPI-INV-002`
  - reason: Dual-write con `user_document_id` (legacy) y mapping canónico.
  - action: **migrate**

- **path:** `supabase/functions/process-bitcoin-anchors/index.ts`
  - risk_level: **MEDIUM**
  - breaks_invariant: `EPI-INV-001`, `EPI-INV-002`
  - reason: Dual-write con `user_document_id` (legacy) y mapping canónico.
  - action: **migrate**

## Nivel 3 — LOW (compatibilidad)
- **path:** `supabase/functions/verify-ecox/index.ts`
  - risk_level: **LOW**
  - breaks_invariant: None
  - reason: Soporta formato legacy ZIP en verificación.
  - action: **keep_compat**

- **path:** `supabase/functions/_legacy/*`
  - risk_level: **LOW**
  - breaks_invariant: None
  - reason: Implementaciones antiguas, no usadas en flujo canónico.
  - action: **keep_compat**

- **path:** `supabase/functions/generate-link/index.ts`
  - risk_level: **LOW**
  - breaks_invariant: None
  - reason: Compatibilidad con tabla `documents` legacy.
  - action: **keep_compat**
