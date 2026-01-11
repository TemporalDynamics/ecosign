-- =====================================================================
-- WORKSTREAM 3: Add Observable Anchoring Event Types
-- =====================================================================
-- Fecha: 2026-01-11
-- Propósito: Agregar anchor.attempt, anchor.confirmed, anchor.failed a events table
-- Filosofía: "UI refleja, no afirma" - eventos observables para auditoría
-- =====================================================================

-- Drop existing constraint
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;

-- Recreate constraint with new observable event types
ALTER TABLE public.events
  ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN (
    -- Existing events
    'created',          -- Documento creado
    'sent',             -- Link enviado a firmante
    'opened',           -- Link abierto por firmante
    'identified',       -- Firmante completó identificación
    'signed',           -- Firmante aplicó firma
    'anchored_polygon', -- Anclado en Polygon (legacy)
    'anchored_bitcoin', -- Anclado en Bitcoin (legacy)
    'verified',         -- Documento verificado
    'downloaded',       -- .ECO descargado
    'expired',          -- Link expirado
    -- NEW: Workstream 3 - Observable anchoring events
    'anchor.attempt',   -- Intento de anchoring (cada retry)
    'anchor.confirmed', -- Confirmación de anchoring (dual-write con canon)
    'anchor.failed'     -- Fallo terminal de anchoring
  ));

-- =====================================================================
-- NOTA: Eventos observables vs Canon
-- =====================================================================
-- - anchor.attempt/confirmed/failed → Tabla events (observabilidad)
-- - kind='anchor' → document_entities.events[] (canon legal)
--
-- Los eventos en tabla `events` son BEST-EFFORT para diagnóstico.
-- La verdad legal vive en document_entities.events[].
-- =====================================================================
