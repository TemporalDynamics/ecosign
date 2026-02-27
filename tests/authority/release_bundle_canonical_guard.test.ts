import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const RELEASE_MANIFEST = path.join(
  ROOT,
  'scripts/diagnostics/release_beta_functions.txt',
);
const EVENT_HELPER_FILE = path.join(
  ROOT,
  'supabase/functions/_shared/eventHelper.ts',
);

const LEGACY_READ_PATTERNS = [
  /\.from\(\s*['"]user_documents['"]\s*\)/,
  /user_documents!inner/,
];

test('release bundle functions must not read user_documents or use legacy bridge', async () => {
  const manifest = await fs.readFile(RELEASE_MANIFEST, 'utf8');
  const functionNames = manifest
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  const offenders: string[] = [];

  for (const fnName of functionNames) {
    const file = path.join(ROOT, 'supabase/functions', fnName, 'index.ts');
    let content: string;
    try {
      content = await fs.readFile(file, 'utf8');
    } catch (error) {
      offenders.push(`${fnName}: missing file ${file}`);
      continue;
    }

    for (const pattern of LEGACY_READ_PATTERNS) {
      if (pattern.test(content)) {
        offenders.push(`${fnName}: matches forbidden legacy read pattern ${pattern}`);
      }
    }

    if (/getUserDocumentId\(/.test(content)) {
      offenders.push(`${fnName}: uses forbidden getUserDocumentId bridge`);
    }
  }

  expect(offenders).toEqual([]);
});

test('event helper must not expose document_entity_id to user_documents bridge', async () => {
  const content = await fs.readFile(EVENT_HELPER_FILE, 'utf8');
  expect(content).not.toContain('export async function getUserDocumentId');
});
