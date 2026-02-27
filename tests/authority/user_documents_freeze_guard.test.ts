import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const MIGRATION_FILE = path.join(
  ROOT,
  'supabase/migrations/20260301001000_freeze_user_documents_writes.sql',
);

test('migration must freeze direct writes to user_documents with explicit allowlist', async () => {
  const content = await fs.readFile(MIGRATION_FILE, 'utf8');

  expect(content).toContain('CREATE OR REPLACE FUNCTION public.guard_user_documents_writes()');
  expect(content).toContain('CREATE TRIGGER trg_user_documents_write_guard');
  expect(content).toContain('BEFORE INSERT OR UPDATE OR DELETE ON public.user_documents');
  expect(content).toContain("current_setting('ecosign.user_documents_write_context'");
  expect(content).toMatch(/pg_trigger_depth\(\)\s*>\s*1/);
  expect(content).toContain("v_ctx IN ('projection', 'legacy', 'maintenance')");
  expect(content).toContain('user_documents is frozen: direct writes are disabled');
});
