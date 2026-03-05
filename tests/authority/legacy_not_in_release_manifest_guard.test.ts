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

test('release manifest must exclude hard-deprecated legacy endpoints', async () => {
  const manifest = await fs.readFile(RELEASE_MANIFEST, 'utf8');
  const lines = manifest
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  const forbidden = [
    'append-tsa-event',
    'auto-tsa',
    'stamp-pdf',
    'test-email',
    'test-insert-notification',
    'wake-authority',
  ];

  for (const fnName of forbidden) {
    expect(lines).not.toContain(fnName);
  }
});
