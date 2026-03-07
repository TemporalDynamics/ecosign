import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

test('release gate must enforce fast+db tests and authority hardening checks', async () => {
  const [pkgRaw, gateScript, dbGateScript] = await Promise.all([
    fs.readFile(path.join(ROOT, 'package.json'), 'utf8'),
    fs.readFile(path.join(ROOT, 'scripts/release-gate.sh'), 'utf8'),
    fs.readFile(path.join(ROOT, 'scripts/test-db.sh'), 'utf8'),
  ]);

  expect(pkgRaw).toContain('"release:gate": "bash scripts/release-gate.sh"');

  expect(gateScript).toContain('npm test');
  expect(gateScript).toContain('npm run test:db');
  expect(gateScript).toContain('npm run diag:schema-drift');
  expect(gateScript).toContain('npm run diag:invariant-observability');
  expect(gateScript).toContain('npm run diag:secret-rotation-policy');
  expect(dbGateScript).toContain('tests/security/rls.test.ts');
  expect(dbGateScript).toContain('tests/security/storage.test.ts');
  expect(dbGateScript).toContain('tests/security/workflowCanvasAtomicity.test.ts');
  expect(dbGateScript).toContain('tests/security/workflowConcurrencyRace.test.ts');
  expect(dbGateScript).toContain('tests/integration/tsaEvents.test.ts');
  expect(dbGateScript).toContain('tests/canonical-only/complete-pipeline-proof.test.ts');
  expect(gateScript).toContain('tests/authority/workflow_signers_status_authority_guard.test.ts');
  expect(gateScript).toContain('tests/authority/internal_tables_service_only_guard.test.ts');
  expect(gateScript).toContain('tests/authority/internal_runtime_table_grants_rls_guard.test.ts');
  expect(gateScript).toContain('tests/authority/internal_rate_limit_table_grants_rls_guard.test.ts');
  expect(gateScript).toContain('tests/authority/workflow_canvas_fields_atomicity_guard.test.ts');
  expect(gateScript).toContain('tests/authority/no_pii_console_logs_guard.test.ts');
  expect(gateScript).toContain('tests/authority/no_raw_payload_logs_guard.test.ts');
  expect(gateScript).toContain('tests/authority/secret_rotation_policy_guard.test.ts');
  expect(gateScript).toContain('tests/authority/incident_runbook_drill_guard.test.ts');
  expect(gateScript).toContain('tests/authority/ci_release_gate_enforcement_guard.test.ts');
  expect(gateScript).toContain('tests/authority/invariant_observability_contract_guard.test.ts');
  expect(gateScript).toContain('tests/authority/security_definer_exec_allowlist_closure_guard.test.ts');
  expect(gateScript).toContain('tests/authority/verify_jwt_false_allowlist_guard.test.ts');
  expect(gateScript).toContain('tests/authority/legacy_endpoint_deprecations_guard.test.ts');
  expect(gateScript).toContain('tests/authority/no_legacy_runtime_surface_presence_guard.test.ts');
  expect(gateScript).toContain('tests/authority/legacy_not_in_release_manifest_guard.test.ts');
  expect(gateScript).toContain('npm run diag:internal-runtime-table-hardening');
  expect(gateScript).toContain('npm run diag:security-definer-exec-allowlist');
  expect(gateScript).toContain('npm run diag:prelaunch-legacy-null-check');
});
