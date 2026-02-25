import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const CRITICAL_FILES = [
  'supabase/functions/record-protection-event/index.ts',
  'supabase/functions/apply-signer-signature/index.ts',
  'supabase/functions/run-tsa/index.ts',
];

test('critical paths must not enqueue executor_jobs via compat_direct', async () => {
  const offenders: string[] = [];

  for (const relPath of CRITICAL_FILES) {
    const absPath = path.join(ROOT, relPath);
    const content = await fs.readFile(absPath, 'utf8');

    if (/enqueue_source\s*:\s*['"]compat_direct['"]/.test(content)) {
      offenders.push(`${relPath} uses compat_direct`);
    }

    if (/\.from\(\s*['"]executor_jobs['"]\s*\)\s*\.insert\(/.test(content)) {
      offenders.push(`${relPath} performs direct executor_jobs insert`);
    }
  }

  if (offenders.length > 0) {
    throw new Error(`Critical-path queue bypass detected:\n${offenders.join('\n')}`);
  }
});
