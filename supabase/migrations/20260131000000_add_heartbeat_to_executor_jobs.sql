-- Migration: Add heartbeat_at column to executor_jobs
-- Purpose: Track last heartbeat from worker to detect stale jobs
-- Part of: TTL Reclaim + Heartbeat (Fase 1.2)

-- Add heartbeat_at column
ALTER TABLE public.executor_jobs
  ADD COLUMN IF NOT EXISTS heartbeat_at timestamptz;

COMMENT ON COLUMN public.executor_jobs.heartbeat_at IS
  'Last heartbeat timestamp from worker. Used with locked_at to detect stale jobs that exceed TTL.';

-- Index for efficient reclaim queries
-- Covers: status, type (for TTL lookup), locked_at, heartbeat_at
CREATE INDEX IF NOT EXISTS executor_jobs_reclaim_idx
  ON public.executor_jobs (status, type, locked_at, heartbeat_at)
  WHERE status IN ('running', 'processing');

COMMENT ON INDEX public.executor_jobs_reclaim_idx IS
  'Optimizes reclaim_stale_jobs() queries. Partial index on running/processing jobs only.';
