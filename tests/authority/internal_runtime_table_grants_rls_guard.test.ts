import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const MIGRATION = path.join(
  ROOT,
  'supabase/migrations/20260305230000_harden_internal_runtime_table_grants_and_rls.sql'
);
const DIAG_SCRIPT = path.join(
  ROOT,
  'scripts/diagnostics/check-internal-runtime-table-hardening.sh'
);

test('internal runtime grant/rls hardening migration must include full internal table set', async () => {
  const sql = await fs.readFile(MIGRATION, 'utf8');

  const internalTables = [
    'domain_outbox',
    'executor_job_runs',
    'executor_jobs',
    'welcome_email_queue',
    'system_workers',
    'executor_decision_logs',
    'shadow_decision_logs',
  ];

  for (const tableName of internalTables) {
    expect(sql).toContain(`'${tableName}'`);
  }

  expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
  expect(sql).toContain('REVOKE ALL ON TABLE public.%I FROM PUBLIC');
  expect(sql).toContain('REVOKE ALL ON TABLE public.%I FROM anon, authenticated');
  expect(sql).toContain('GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.%I TO service_role');
  expect(sql).toContain('DROP POLICY IF EXISTS');
  expect(sql).toContain('CREATE POLICY');
  expect(sql).toContain("TO service_role USING (true) WITH CHECK (true)");
});

test('internal runtime hardening diagnostic must include rate-limit runtime tables', async () => {
  const script = await fs.readFile(DIAG_SCRIPT, 'utf8');
  expect(script).toContain("'rate_limits'");
  expect(script).toContain("'rate_limit_blocks'");
});
