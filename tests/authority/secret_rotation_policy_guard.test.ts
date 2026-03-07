import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

test('secret/role rotation policy must exist and define required tracked items', async () => {
  const policyPath = path.join(ROOT, 'security', 'secret_rotation_policy.json');
  const scriptPath = path.join(ROOT, 'scripts', 'diagnostics', 'check-secret-rotation-policy.sh');
  const packagePath = path.join(ROOT, 'package.json');

  const [policyRaw, scriptRaw, packageRaw] = await Promise.all([
    fs.readFile(policyPath, 'utf8'),
    fs.readFile(scriptPath, 'utf8'),
    fs.readFile(packagePath, 'utf8'),
  ]);

  const policy = JSON.parse(policyRaw) as {
    version: string;
    default_max_age_days: number;
    items: Array<{ id: string; last_rotated_at: string; max_age_days?: number }>;
  };

  expect(policy.version).toBeTruthy();
  expect(Number(policy.default_max_age_days)).toBeGreaterThan(0);
  expect(Array.isArray(policy.items)).toBe(true);
  expect(policy.items.length).toBeGreaterThan(0);

  const ids = new Set(policy.items.map((item) => item.id));
  expect(ids.has('github.SUPABASE_ACCESS_TOKEN')).toBe(true);
  expect(ids.has('github.SUPABASE_DB_PASSWORD')).toBe(true);
  expect(ids.has('db.security_definer_exec_surface')).toBe(true);
  expect(ids.has('db.internal_runtime_table_grants_rls')).toBe(true);

  for (const item of policy.items) {
    expect(item.id).toBeTruthy();
    expect(item.last_rotated_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    if (item.max_age_days !== undefined) {
      expect(Number(item.max_age_days)).toBeGreaterThan(0);
    }
  }

  expect(scriptRaw).toContain('security/secret_rotation_policy.json');
  expect(scriptRaw).toContain('rotation violations detected');
  expect(packageRaw).toContain('"diag:secret-rotation-policy": "bash scripts/diagnostics/check-secret-rotation-policy.sh"');
});
