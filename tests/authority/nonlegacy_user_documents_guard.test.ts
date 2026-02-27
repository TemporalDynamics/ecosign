import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const FUNCTIONS_ROOT = path.join(ROOT, 'supabase/functions');

const FORBIDDEN_PATTERNS = [
  /\.from\(\s*['"]user_documents['"]\s*\)/,
  /user_documents!inner/,
];

test('non-legacy edge functions must not read user_documents projection', async () => {
  const entries = await fs.readdir(FUNCTIONS_ROOT, { withFileTypes: true });
  const offenders: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('_')) continue; // ignore _legacy and _shared helpers

    const file = path.join(FUNCTIONS_ROOT, entry.name, 'index.ts');
    let content: string;
    try {
      content = await fs.readFile(file, 'utf8');
    } catch {
      continue;
    }

    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(content)) {
        offenders.push(`${entry.name}: matches ${pattern}`);
      }
    }
  }

  expect(offenders).toEqual([]);
});
