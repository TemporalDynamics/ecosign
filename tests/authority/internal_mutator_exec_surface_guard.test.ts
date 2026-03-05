import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

test('internal mutator RPC surfaces must be sealed to service_role/postgres only', async () => {
  const migrationPath = path.join(
    ROOT,
    'supabase/migrations/20260305133000_close_remaining_internal_mutator_exec_grants.sql'
  );

  const content = await fs.readFile(migrationPath, 'utf8');

  const functionNames = [
    'reclaim_stale_jobs',
    'update_job_heartbeat',
    'anchor_atomic_tx',
    'anchor_polygon_atomic_tx',
    'detect_and_recover_orphan_anchors',
    'project_document_entity_to_user_document',
    'claim_anchor_batch',
  ];

  expect(content).toContain("AND p.proname = ANY(ARRAY[");
  expect(content).toContain("EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn)");
  expect(content).toContain("EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn)");
  expect(content).toContain("EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn)");
  expect(content).toContain("EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn)");
  expect(content).toContain("EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO postgres', fn)");

  for (const fnName of functionNames) {
    expect(content).toContain(`'${fnName}'`);
  }
});
