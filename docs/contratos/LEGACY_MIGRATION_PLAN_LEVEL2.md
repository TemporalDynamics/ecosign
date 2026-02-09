# Nivel 2 — Migration Plan (Dual‑Write Anchors)
**Estado:** Canónico
**Alcance:** process‑polygon‑anchors / process‑bitcoin‑anchors
**Fecha:** 2026-02-09

## Objetivo
Eliminar dual‑write y consolidar **una sola autoridad canónica**.
El pipeline de anchors debe escribir **solo** en el modelo canónico.

## Principio Rector
**Write‑canonical, read‑compat.**
- Escritura: solo canónica
- Lectura: compatibilidad temporal con legacy (sin bloquear)

## A) Eliminar dual‑write
Funciones afectadas:
- `supabase/functions/process-polygon-anchors/index.ts`
- `supabase/functions/process-bitcoin-anchors/index.ts`

Acciones:
- ❌ Dejar de escribir en tablas legacy (`user_documents`, `documents`, etc.)
- ✅ Escribir únicamente en:
  - `document_entities`
  - `document_entities.events[]`
  - `anchors` canónicos (si aplica)

## B) Reglas nuevas (CAI‑friendly)
Cada anchor debe referenciar:
- `document_entity_id`
- `witness_hash` **exacto** (del PDF post‑acto vigente)

Nunca:
- `user_document_id`
- hashes recalculados fuera del pipeline
- “último PDF” ambiguo

## C) Transitional Safety (sin hard‑block)
- Si llega payload legacy, se **loggea** con motivo y se intenta mapear a `document_entity_id`.
- Si no se puede mapear, se **rechaza** con error explícito.

## No se hace en este nivel
- No tocar proofs tardías.
- No modificar ECO.
- No agregar asserts nuevos.

## Resultado esperado
- Una única fuente de verdad.
- Anchors trazables por `document_entity_id` + `witness_hash`.
- Base limpia para alinear proofs tardías.
