import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const SQL_SMOKE_FILE = path.join(
  ROOT,
  'scripts/diagnostics/smoke_user_documents_freeze.sql',
);
const SHELL_WRAPPER_FILE = path.join(
  ROOT,
  'scripts/diagnostics/smoke-user-documents-freeze.sh',
);

test('freeze smoke SQL must validate direct deny + maintenance allow + projection path', async () => {
  const content = await fs.readFile(SQL_SMOKE_FILE, 'utf8');

  expect(content).toContain('trg_user_documents_write_guard');
  expect(content).toContain('trg_project_events_to_user_document');
  expect(content).toContain('Direct write unexpectedly succeeded');
  expect(content).toContain("set_config('ecosign.user_documents_write_context', 'maintenance'");
  expect(content).toContain("UPDATE public.document_entities");
  expect(content).toContain('ROLLBACK;');
});

test('freeze smoke shell wrapper must resolve DB_URL and call psql script', async () => {
  const content = await fs.readFile(SHELL_WRAPPER_FILE, 'utf8');

  expect(content).toContain('DATABASE_URL');
  expect(content).toContain('SUPABASE_DB_URL');
  expect(content).toContain('supabase status --output json');
  expect(content).toContain('psql "${DB_URL}"');
  expect(content).toContain('smoke_user_documents_freeze.sql');
});
