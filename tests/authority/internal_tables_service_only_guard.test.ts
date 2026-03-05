import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const MIGRATION = path.join(
  ROOT,
  'supabase/migrations/20260305191500_harden_internal_runtime_tables_service_only.sql'
);

test('internal runtime tables hardening migration must enforce service-role-only access', async () => {
  const sql = await fs.readFile(MIGRATION, 'utf8');

  expect(sql).toContain('ALTER TABLE IF EXISTS public.domain_outbox ENABLE ROW LEVEL SECURITY;');
  expect(sql).toContain('ALTER TABLE IF EXISTS public.executor_job_runs ENABLE ROW LEVEL SECURITY;');
  expect(sql).toContain('ALTER TABLE IF EXISTS public.welcome_email_queue ENABLE ROW LEVEL SECURITY;');
  expect(sql).toContain('ALTER TABLE IF EXISTS public.executor_jobs ENABLE ROW LEVEL SECURITY;');

  expect(sql).toContain('ON TABLE public.domain_outbox FROM anon, authenticated;');
  expect(sql).toContain('ON TABLE public.executor_job_runs FROM anon, authenticated;');
  expect(sql).toContain('ON TABLE public.welcome_email_queue FROM anon, authenticated;');
  expect(sql).toContain('ON TABLE public.executor_jobs FROM anon, authenticated;');

  expect(sql).toContain('CREATE POLICY domain_outbox_service_role_only');
  expect(sql).toContain('CREATE POLICY executor_job_runs_service_role_only');
  expect(sql).toContain('CREATE POLICY welcome_email_queue_service_role_only');
  expect(sql).toContain('TO service_role');
});
