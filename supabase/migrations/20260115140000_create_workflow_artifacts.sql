-- FASE B1: Tabla workflow_artifacts
-- Purpose: Control de idempotencia y trazabilidad del artefacto final
-- Ref: FINAL_ARTIFACT_CONTRACT.md
-- Date: 2026-01-15

-- Table: workflow_artifacts
-- Garantiza que un workflow solo produzca un artefacto final canónico
CREATE TABLE IF NOT EXISTS public.workflow_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identidad
  workflow_id UUID NOT NULL,
  
  -- Estado del proceso de construcción
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'building', 'ready', 'failed')
  ) DEFAULT 'pending',

  -- Resultado (solo cuando status = ready)
  artifact_id UUID,
  artifact_hash TEXT,
  artifact_url TEXT,

  -- Control de idempotencia y reintentos
  build_attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalized_at TIMESTAMPTZ,

  -- Constraint: un workflow → un solo artefacto (idempotencia)
  CONSTRAINT workflow_artifacts_unique_workflow
    UNIQUE (workflow_id),

  -- FK: si el workflow se elimina, el artefacto también
  CONSTRAINT workflow_artifacts_workflow_fk
    FOREIGN KEY (workflow_id)
    REFERENCES public.signature_workflows(id)
    ON DELETE CASCADE
);

-- Índices para queries comunes
CREATE INDEX IF NOT EXISTS idx_workflow_artifacts_workflow 
  ON public.workflow_artifacts(workflow_id);

CREATE INDEX IF NOT EXISTS idx_workflow_artifacts_status 
  ON public.workflow_artifacts(status);

-- Comentarios canónicos
COMMENT ON TABLE public.workflow_artifacts IS 
  'Control plane para artefacto final del workflow. No almacena el artefacto, solo controla su proceso de construcción y referencia.';

COMMENT ON COLUMN public.workflow_artifacts.status IS 
  'Estado del proceso: pending (detectado), building (en construcción), ready (finalizado), failed (error reintentable)';

COMMENT ON COLUMN public.workflow_artifacts.artifact_hash IS 
  'Hash criptográfico del artefacto final. Solo poblado cuando status = ready. Garantiza idempotencia.';

COMMENT ON CONSTRAINT workflow_artifacts_unique_workflow ON public.workflow_artifacts IS 
  'Garantía de idempotencia: un workflow solo puede producir un artefacto final canónico.';
