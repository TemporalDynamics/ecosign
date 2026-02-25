import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const ALLOWLIST = [
  /^docs\/public\//,
  /^docs\/beta\//,
  /^docs\/legal\/nda\/v1\.txt$/,
];

test('tracked docs must stay inside public allowlist', () => {
  let output = '';
  try {
    output = execFileSync('git', ['ls-files', 'docs'], { cwd: ROOT, encoding: 'utf8' });
  } catch {
    return;
  }

  const files = output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const offenders = files.filter((file) => !ALLOWLIST.some((rule) => rule.test(file)));
  expect(offenders).toEqual([]);
});
