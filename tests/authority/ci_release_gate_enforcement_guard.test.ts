import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

test('CI must enforce release gate for PRs/tags and before Supabase deploy', async () => {
  const [releaseGateWorkflow, deployWorkflow, hardeningWorkflow] = await Promise.all([
    fs.readFile(path.join(ROOT, '.github', 'workflows', 'release-gate.yml'), 'utf8'),
    fs.readFile(path.join(ROOT, '.github', 'workflows', 'deploy-supabase.yml'), 'utf8'),
    fs.readFile(path.join(ROOT, '.github', 'workflows', 'continuous-hardening-audit.yml'), 'utf8'),
  ]);

  expect(releaseGateWorkflow).toContain('pull_request:');
  expect(releaseGateWorkflow).toContain('push:');
  expect(releaseGateWorkflow).toContain('tags:');
  expect(releaseGateWorkflow).toContain("- 'v*'");
  expect(releaseGateWorkflow).toContain('supabase start');
  expect(releaseGateWorkflow).toContain('npm run release:gate');

  expect(deployWorkflow).toContain('release-gate:');
  expect(deployWorkflow).toContain('npm run release:gate');
  expect(deployWorkflow).toContain('needs: [release-gate]');
  expect(deployWorkflow).toContain('Verify remote schema drift contract');
  expect(deployWorkflow).toContain('check-schema-drift.sh');
  expect(deployWorkflow).toContain('Post-deploy contractual verification');
  expect(deployWorkflow).toContain('check-postdeploy-contract.sh');

  expect(hardeningWorkflow).toContain('schedule:');
  expect(hardeningWorkflow).toContain("cron: '30 4 * * *'");
  expect(hardeningWorkflow).toContain('workflow_dispatch:');
  expect(hardeningWorkflow).toContain('npm run diag:secret-rotation-policy');
  expect(hardeningWorkflow).toContain('npm run diag:internal-runtime-table-hardening');
  expect(hardeningWorkflow).toContain('npm run diag:security-definer-exec-allowlist');
});
