import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const FUNCTIONS_ROOT = path.join(ROOT, 'supabase/functions');

const PII_TOKEN_RE =
  /\b(?:recipient_email|signer_email|recipientEmail|signerEmail|ownerEmail|userEmail)\b|\b(?:owner|user|signer|recipient)\??\.email\b/;

const CONSOLE_CALL_START_RE = /console\.(?:log|info|warn|error)\(/;

function parenDelta(input: string): number {
  let delta = 0;
  for (const char of input) {
    if (char === '(') delta += 1;
    if (char === ')') delta -= 1;
  }
  return delta;
}

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

test('runtime logs must not include direct email identifiers (PII)', async () => {
  const files = await listTsFiles(FUNCTIONS_ROOT);
  const offenders: string[] = [];

  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf8');
    const relativePath = path.relative(ROOT, filePath);
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i += 1) {
      if (!CONSOLE_CALL_START_RE.test(lines[i])) continue;

      let snippet = lines[i];
      let balance = parenDelta(lines[i]);
      let j = i + 1;
      while (balance > 0 && j < lines.length && j <= i + 20) {
        snippet += `\n${lines[j]}`;
        balance += parenDelta(lines[j]);
        j += 1;
      }

      if (PII_TOKEN_RE.test(snippet)) {
        offenders.push(relativePath);
        break;
      }

      i = j - 1;
    }
  }

  expect(
    offenders,
    `PII-like email identifiers found in console logs: ${offenders.join(', ')}`
  ).toEqual([]);
});
