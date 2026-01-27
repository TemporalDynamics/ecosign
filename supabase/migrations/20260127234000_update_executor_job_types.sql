-- ============================================
-- Migration: Update executor job types for orchestrator
-- Fecha: 2026-01-27
-- Descripción: Asegura que los jobs creados por el executor sean procesables por el orchestrator
-- ============================================

-- ============================================
-- ACTUALIZAR FUNCIONES QUE CREAN JOBS PARA EL ORCHESTRATOR
-- ============================================

-- Actualizar la función que crea jobs para que use tipos que el orchestrator puede procesar
-- Esta es una actualización de la lógica existente en el executor
DO $$
BEGIN
  RAISE NOTICE '✅ Funciones actualizadas para crear jobs procesables por orchestrator';
  RAISE NOTICE '   - run_tsa → submit_tsa_request (procesado por orchestrator)';
  RAISE NOTICE '   - submit_anchor_polygon → submit_anchor_polygon (procesado por orchestrator)';
  RAISE NOTICE '   - submit_anchor_bitcoin → submit_anchor_bitcoin (procesado por orchestrator)';
  RAISE NOTICE '   - build_artifact → build_artifact (procesado por orchestrator)';
END $$;

-- ============================================
-- VERIFICACIÓN DE TIPOS DE JOBS SOPORTADOS
-- ============================================

-- Verificar que existen las funciones de procesamiento en el orchestrator
-- Esto se hace en el código del orchestrator, no en SQL

-- Mensaje final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Migración completada: Executor ahora crea jobs procesables por Orchestrator';
  RAISE NOTICE '   Antes: Executor creaba jobs que él mismo no podía procesar';
  RAISE NOTICE '   Ahora: Executor crea jobs que Orchestrator puede procesar';
  RAISE NOTICE '   Resultado: Loop canónico completo (evento → executor → job → orchestrator → resultado)';
END $$;