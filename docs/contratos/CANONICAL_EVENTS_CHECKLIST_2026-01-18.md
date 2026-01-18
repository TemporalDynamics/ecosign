Checklist de discrepancias detectadas (2026-01-18T13:47:12.826Z)

Contexto
--------
Se revisaron los siguientes artefactos fuente: docs/contratos/CANONICAL_EVENTS_LIST.md, docs/contratos/ANCHOR_EVENT_RULES.md, docs/contratos/OPERATIONS_EVENTS_CONTRACT.md y el código: supabase/functions/_shared/fase1Events.ts. A continuación se listan las diferencias y riesgos a resolver antes de normalizar eventos en la base de código.

Discrepancias y acciones recomendadas
------------------------------------
1) Nombre TSA: docs vs código
   - Docs (CANONICAL_EVENTS_LIST.md): 'tsa.appended'
   - Código (fase1Events.ts): 'tsa.confirmed'
   - Riesgo: workers/executor pueden esperar "confirmed" mientras frontend escribe "appended" → jobs no se disparan.
   - Acción: elegir una forma canonical (recomendar: 'tsa.appended' + events payload con token/confirmed_at) y añadir alias en fase1Events.ts temporalmente.

2) Anchor naming: 'anchor' (object-kind) vs 'anchor.confirmed' (dot-suffix)
   - Anchor contract (ANCHOR_EVENT_RULES.md) define kind: 'anchor' con payload que contiene network y confirmed_at.
   - CANONICAL_EVENTS_LIST.md y otros lugares usan 'anchor.confirmed' y 'anchor.failed'.
   - Riesgo: mismatch de parsers que filtran por kind exacto.
   - Acción: acordar que el canonical 'kind' sea 'anchor' y que estados (pending/confirmed/failed) sean derivables por campos dentro del payload; actualizar constants / consumers para normalizar.

3) Evento 'document.protected' está en código (fase1Events.ts) pero NO aparece en CANONICAL_EVENTS_LIST.md
   - Riesgo: UI no generará evento esperado o validaciones fallarán.
   - Acción: añadir 'document.protected' a la lista canónica o mapearlo desde otro evento existente; documentar claramente su payload.

4) 'anchor.pending' existe en fase1Events.ts pero no en las reglas estrictas de ANCHOR_EVENT_RULES.md
   - Riesgo: workers pueden publicar pending, pero validadores podrían ignorarlo.
   - Acción: permitir 'anchor.pending' como alias operativo (no canónico) o convertirlo en un evento canónico con reglas de validación.

5) Estructura inconsistente: algunos documentos esperan "kind" == 'anchor' mientras código usa strings planos como 'anchor.confirmed'
   - Riesgo: parsing divergente en funciones serverless y UI.
   - Acción: implementar una capa de normalización (appendEvent wrapper) que acepte aliases y escriba el canonical shape en events[].

6) Verificar uso en UI
   - Archivos relevantes: client/src/lib/deriveHumanState.ts, client/src/lib/verifier/normalizeEvents.ts, client/src/lib/polygonAnchor.ts
   - Acción: crear tests que confirmen que la UI deriva estados desde events[] tras la normalización propuesta.

7) Migraciones / DB
   - Revisión rápida: existen migraciones que añaden anchor event types y anchor_states. Confirmar que la DB contiene los tipos/constraints esperados (supabase/migrations/*).
   - Acción: ejecutar migraciones en entorno de staging y comprobar que events[] acepta las nuevas shapes.

Prioridad inmediata
-------------------
- Unificar naming TSA y Anchor (items 1 y 2) y añadir adaptador de normalización en appendEvent.
- Asegurar que document.protected esté definido en la lista canónica (item 3).

Comentarios finales
-------------------
- Muchas de las reglas ya están bien documentadas (ANCHORED rules). Las acciones propuestas son principalmente de normalización y adaptación en una capa de compatibilidad para evitar romper workers/exec.
- Recomendación: tras aprobar esta checklist, proceder a cambios incrementales en código (constantes + adaptador appendEvent) y desplegar en staging para validar end-to-end Fase 1.
