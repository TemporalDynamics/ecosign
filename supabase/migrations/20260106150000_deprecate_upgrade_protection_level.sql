-- Migration: Deprecate upgrade_protection_level Function
-- Created: 2026-01-06
-- Priority: P0.2 (CRÍTICO - Elimina doble fuente de verdad)
--
-- Purpose: Mark upgrade_protection_level as DEPRECATED
-- Contract: docs/contratos/PROTECTION_LEVEL_RULES.md
--
-- Gap cerrado: Function lee legacy (bitcoin_status, polygon_status) en lugar de events[]
-- Violación: "events[] is source of truth" + "protection level is derived, not stored"
--
-- Solución: DEPRECATE function completamente
-- Reason: UI already derives correctly via deriveProtectionLevel(events[])
--         Backend already derives correctly
--         Persisting levels is conceptual regression

-- ============================================================================
-- 1. MARK FUNCTION AS DEPRECATED
-- ============================================================================

-- Update comment to mark as DEPRECATED
COMMENT ON FUNCTION upgrade_protection_level(UUID) IS
  '❌ DEPRECATED (2026-01-06) - DO NOT USE

  Reason: Violates canonical contract "protection level is derived, not stored"

  This function:
  - Reads from legacy fields (bitcoin_status, polygon_status)
  - Writes to stored state (protection_level column)
  - Creates dual source of truth (events[] vs stored level)

  Replacement:
  - UI: deriveProtectionLevel(events[]) in client/src/lib/protectionLevel.ts
  - Backend: Read events[] directly and apply canonical algorithm

  Contract: docs/contratos/PROTECTION_LEVEL_RULES.md
  Migration: 20260106150000_deprecate_upgrade_protection_level.sql

  Status: Kept for historical compatibility only. Will be removed in future.';

-- ============================================================================
-- 2. REMOVE ALL CALLS (already done in workers)
-- ============================================================================

-- Calls removed from:
-- - supabase/functions/_legacy/process-polygon-anchors/index.ts (line 381)
-- - supabase/functions/_legacy/process-bitcoin-anchors/index.ts (line 729, 918)
--
-- Replaced with comments explaining deprecation

-- ============================================================================
-- 3. VALIDATION: Verify no active calls remain
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ upgrade_protection_level marked as DEPRECATED';
  RAISE NOTICE 'Workers updated to NOT call this function';
  RAISE NOTICE 'UI derives protection level from events[] (canonical)';
  RAISE NOTICE 'Contract: Protection level is DERIVED, not STORED';
END;
$$;

-- ============================================================================
-- 4. FUTURE CLEANUP (optional, not now)
-- ============================================================================

-- In future migration (after full legacy table deprecation):
-- DROP FUNCTION upgrade_protection_level(UUID);
-- DROP COLUMN user_documents.protection_level;
--
-- But NOT today - keep for backward compatibility during migration phase

-- ============================================================================
-- FINAL COMMENT
-- ============================================================================

COMMENT ON TABLE user_documents IS
  'User documents (legacy table).

  ⚠️ MIGRATION IN PROGRESS:
  - protection_level column: DEPRECATED (derive from document_entities.events[])
  - bitcoin_status, polygon_status: DEPRECATED (read from events[])
  - document_entity_id: PRIMARY reference to canonical source

  Future: This table will be phased out in favor of document_entities.';
