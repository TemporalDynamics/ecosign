import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

test('release gate must enforce fast+db tests and authority hardening checks', async () => {
  const [pkgRaw, gateScript] = await Promise.all([
    fs.readFile(path.join(ROOT, 'package.json'), 'utf8'),
    fs.readFile(path.join(ROOT, 'scripts/release-gate.sh'), 'utf8'),
  ]);

  expect(pkgRaw).toContain('"release:gate": "bash scripts/release-gate.sh"');

  expect(gateScript).toContain('npm test');
  expect(gateScript).toContain('npm run test:db');
  expect(gateScript).toContain('tests/authority/workflow_signers_status_authority_guard.test.ts');
  expect(gateScript).toContain('tests/authority/internal_tables_service_only_guard.test.ts');
  expect(gateScript).toContain('tests/authority/verify_jwt_false_allowlist_guard.test.ts');
  expect(gateScript).toContain('tests/authority/legacy_endpoint_deprecations_guard.test.ts');
  expect(gateScript).toContain('tests/authority/legacy_not_in_release_manifest_guard.test.ts');
  expect(gateScript).toContain('npm run diag:prelaunch-legacy-null-check');
});
