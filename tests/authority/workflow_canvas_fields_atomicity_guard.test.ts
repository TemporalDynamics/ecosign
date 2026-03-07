import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

test('start-signature-workflow must persist canvas+fields through atomic RPC', async () => {
  const sourcePath = path.join(ROOT, 'supabase/functions/start-signature-workflow/index.ts');
  const migrationPath = path.join(
    ROOT,
    'supabase/migrations/20260306220500_persist_workflow_canvas_fields_atomic.sql'
  );
  const hardeningMigrationPath = path.join(
    ROOT,
    'supabase/migrations/20260307004500_harden_persist_workflow_canvas_fields_atomic_exec.sql'
  );

  const [source, migration, hardeningMigration] = await Promise.all([
    fs.readFile(sourcePath, 'utf8'),
    fs.readFile(migrationPath, 'utf8'),
    fs.readFile(hardeningMigrationPath, 'utf8'),
  ]);

  expect(source).toContain(".rpc(\n        'persist_workflow_canvas_fields_atomic'");
  expect(source).toContain('failed_to_persist_canvas_and_fields_atomically');
  expect(source).not.toContain('...(canvasSnapshot ? { canvas_snapshot: canvasSnapshot } : {}),');
  expect(source).not.toContain('failed_to_create_batches');
  expect(source).not.toContain('failed_to_create_workflow_fields');

  expect(migration).toContain('CREATE OR REPLACE FUNCTION public.persist_workflow_canvas_fields_atomic(');
  expect(hardeningMigration).toContain('REVOKE ALL ON FUNCTION public.persist_workflow_canvas_fields_atomic(uuid, uuid, jsonb, jsonb, jsonb) FROM PUBLIC');
  expect(hardeningMigration).toContain('REVOKE ALL ON FUNCTION public.persist_workflow_canvas_fields_atomic(uuid, uuid, jsonb, jsonb, jsonb) FROM anon');
  expect(hardeningMigration).toContain('REVOKE ALL ON FUNCTION public.persist_workflow_canvas_fields_atomic(uuid, uuid, jsonb, jsonb, jsonb) FROM authenticated');
  expect(hardeningMigration).toContain('GRANT EXECUTE ON FUNCTION public.persist_workflow_canvas_fields_atomic(uuid, uuid, jsonb, jsonb, jsonb) TO service_role');
});
