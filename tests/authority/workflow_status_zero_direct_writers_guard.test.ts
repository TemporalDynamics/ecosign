import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const FUNCTIONS_ROOT = path.join(ROOT, 'supabase/functions');

const WORKFLOW_UPDATE_OBJECT_PATTERN =
  /from\(['"]signature_workflows['"]\)\s*\.update\(\{([\s\S]*?)\}\)/gm;
const STATUS_FIELD_PATTERN = /\bstatus\b\s*:/m;

async function listFunctionEntryFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name.startsWith('_')) {
        continue;
      }
      files.push(...(await listFunctionEntryFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name === 'index.ts') {
      files.push(fullPath);
    }
  }

  return files;
}

test('active functions must not mutate signature_workflows.status directly', async () => {
  const files = await listFunctionEntryFiles(FUNCTIONS_ROOT);
  const offenders: string[] = [];

  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf8');
    const matches = [...content.matchAll(WORKFLOW_UPDATE_OBJECT_PATTERN)];
    const hasDirectStatusWrite = matches.some((match) => STATUS_FIELD_PATTERN.test(match[1] ?? ''));

    if (hasDirectStatusWrite) {
      offenders.push(path.relative(ROOT, filePath));
    }
  }

  expect(
    offenders,
    `Direct signature_workflows.status writers found: ${offenders.join(', ')}`
  ).toEqual([]);
});
