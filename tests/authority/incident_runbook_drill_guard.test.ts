import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

test('incident runbook + drill contract must stay wired and executable', async () => {
  const runbookPath = path.join(ROOT, 'docs', 'beta', 'CANONICAL_INCIDENT_RUNBOOK.md');
  const drillScriptPath = path.join(ROOT, 'scripts', 'diagnostics', 'run-incident-recovery-drill.sh');
  const packageJsonPath = path.join(ROOT, 'package.json');

  const [runbookRaw, drillRaw, packageRaw] = await Promise.all([
    fs.readFile(runbookPath, 'utf8'),
    fs.readFile(drillScriptPath, 'utf8'),
    fs.readFile(packageJsonPath, 'utf8'),
  ]);

  expect(runbookRaw).toContain('npm run diag:incident-recovery-drill');
  expect(runbookRaw).toContain('baseline:runtime');
  expect(runbookRaw).toContain('diag:invariant-observability');
  expect(runbookRaw).toContain('diag:schema-drift');

  expect(drillRaw).toContain('scripts/diagnostics/incident_recovery_projection_drill.sql');
  expect(drillRaw).toContain('npm run baseline:runtime');
  expect(drillRaw).toContain('npm run diag:invariant-observability');
  expect(drillRaw).toContain('npm run diag:schema-drift');
  expect(drillRaw).toContain('Incident recovery drill completed.');

  expect(packageRaw).toContain('"diag:incident-recovery-drill": "bash scripts/diagnostics/run-incident-recovery-drill.sh"');
});
