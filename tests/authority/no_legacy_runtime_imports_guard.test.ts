import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const FUNCTIONS_ROOT = path.join(ROOT, 'supabase/functions');

async function listTsFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listTsFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

test('runtime code outside _legacy must not import or reference _legacy modules', async () => {
  const allTsFiles = await listTsFiles(FUNCTIONS_ROOT);
  const nonLegacyFiles = allTsFiles.filter((file) => !file.includes(`${path.sep}_legacy${path.sep}`));

  const offenders: string[] = [];
  for (const filePath of nonLegacyFiles) {
    const content = await fs.readFile(filePath, 'utf8');
    if (content.includes('/_legacy/') || content.includes("'_legacy/") || content.includes('"_legacy/')) {
      offenders.push(path.relative(ROOT, filePath));
    }
  }

  expect(offenders, `Legacy runtime references found: ${offenders.join(', ')}`).toEqual([]);
});
