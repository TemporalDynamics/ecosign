import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

test('post-deploy contractual verification must enforce runtime/auth/grants/canonical checks', async () => {
  const scriptPath = path.join(ROOT, 'scripts', 'diagnostics', 'check-postdeploy-contract.sh');
  const pkgPath = path.join(ROOT, 'package.json');
  const workflowPath = path.join(ROOT, '.github', 'workflows', 'deploy-supabase.yml');

  const [script, pkgRaw, workflow] = await Promise.all([
    fs.readFile(scriptPath, 'utf8'),
    fs.readFile(pkgPath, 'utf8'),
    fs.readFile(workflowPath, 'utf8'),
  ]);

  expect(script).toContain('SUPABASE_PROJECT_REF');
  expect(script).toContain('SUPABASE_ACCESS_TOKEN');
  expect(script).toContain('SUPABASE_DB_PASSWORD');
  expect(script).toContain('supabase projects api-keys');

  expect(script).toContain('/functions/v1/health-check');
  expect(script).toContain('/functions/v1/signing-keys');
  expect(script).toContain('/functions/v1/presential-verification-get-acta');
  expect(script).toContain('/functions/v1/process-signer-signed');

  expect(script).toContain('check-internal-runtime-table-hardening.sh');
  expect(script).toContain('check-security-definer-exec-allowlist.sh');
  expect(script).toContain('incident_recovery_projection_drill.sql');
  expect(script).toContain('check-schema-drift.sh');
  expect(script).toContain('Post-deploy contractual verification PASSED');

  expect(pkgRaw).toContain('"diag:postdeploy-contract": "bash scripts/diagnostics/check-postdeploy-contract.sh"');
  expect(workflow).toContain('Post-deploy contractual verification');
  expect(workflow).toContain('check-postdeploy-contract.sh');
});
