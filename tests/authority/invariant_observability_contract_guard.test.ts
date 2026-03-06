import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

test('invariant observability contract must stay sealed in DB + internal auth layer', async () => {
  const migrationPath = path.join(
    ROOT,
    'supabase/migrations/20260306235000_add_invariant_violations_observability.sql',
  );
  const internalAuthPath = path.join(ROOT, 'supabase/functions/_shared/internalAuth.ts');
  const functionsRoot = path.join(ROOT, 'supabase/functions');

  const [migration, internalAuth] = await Promise.all([
    fs.readFile(migrationPath, 'utf8'),
    fs.readFile(internalAuthPath, 'utf8'),
  ]);

  expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.invariant_violations');
  expect(migration).toContain('CREATE OR REPLACE FUNCTION public.log_invariant_violation(');
  expect(migration).toContain('CREATE OR REPLACE FUNCTION public.scan_runtime_invariant_violations(');
  expect(migration).toContain('projection.workflow_signers_status.direct_write_blocked');
  expect(migration).toContain('projection.user_documents.direct_write_blocked');
  expect(migration).toContain('executor.jobs.stuck');
  expect(migration).toContain('executor.jobs.high_attempts');
  expect(migration).toContain('executor.jobs.queue_stale');

  expect(internalAuth).toContain('export async function requireInternalAuthLogged(');
  expect(internalAuth).toContain("p_code: 'internal.auth.out_of_channel'");
  expect(internalAuth).toContain("await supabase.rpc('log_invariant_violation'");

  const files = await fs.readdir(functionsRoot, { recursive: true });
  const offenders: string[] = [];
  for (const entry of files) {
    if (typeof entry !== 'string' || !entry.endsWith('.ts')) continue;
    const rel = entry.replaceAll('\\', '/');
    if (rel.startsWith('_shared/internalAuth.ts')) continue;
    const abs = path.join(functionsRoot, entry);
    const source = await fs.readFile(abs, 'utf8');
    if (source.includes('requireInternalAuth(req')) {
      offenders.push(rel);
    }
  }

  expect(offenders).toEqual([]);
});
