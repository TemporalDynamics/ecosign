import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

test('residual anon-executable security definer mutators must be closed', async () => {
  const migrationPath = path.join(
    ROOT,
    'supabase/migrations/20260305153000_close_residual_anon_security_definer_grants.sql'
  );
  const content = await fs.readFile(migrationPath, 'utf8');

  const functionNames = [
    'insert_workflow_signer',
    'log_ecox_event',
    'upgrade_protection_level',
  ];

  expect(content).toContain("AND p.proname = ANY(ARRAY[");
  expect(content).toContain("EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn)");
  expect(content).toContain("EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn)");
  expect(content).toContain("EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn)");
  expect(content).toContain("EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn)");

  for (const fnName of functionNames) {
    expect(content).toContain(`'${fnName}'`);
  }
});
