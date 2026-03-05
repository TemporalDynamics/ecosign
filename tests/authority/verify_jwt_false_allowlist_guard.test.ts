import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const CONFIG = path.join(ROOT, 'supabase/config.toml');

const ALLOWLIST = [
  'presential-verification-confirm-presence',
  'presential-verification-get-acta',
  'record-evidence-download',
  'signing-keys',
].sort();

test('verify_jwt=false surface must stay explicitly allowlisted', async () => {
  const toml = await fs.readFile(CONFIG, 'utf8');

  const matches = [...toml.matchAll(/\[functions\.([^\]]+)\]\s*\n\s*verify_jwt\s*=\s*false/gm)];
  const current = matches.map((m) => m[1]).sort();

  expect(
    current,
    `Unexpected verify_jwt=false functions. Expected allowlist: ${ALLOWLIST.join(', ')}`
  ).toEqual(ALLOWLIST);
});
