import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const PROCESS_BITCOIN_FILE = path.join(ROOT, 'supabase/functions/process-bitcoin-anchors/index.ts');
const PROCESS_POLYGON_FILE = path.join(ROOT, 'supabase/functions/process-polygon-anchors/index.ts');

test('bitcoin worker must emit explicit timeout events and canonical confirmed event helper', async () => {
  const content = await fs.readFile(PROCESS_BITCOIN_FILE, 'utf8');

  expect(content).toContain('MAX_VERIFY_ATTEMPTS');
  expect(content).toContain('BITCOIN_TIMEOUT_HOURS');
  expect(content).toContain('emitAnchorTimeoutEvent(');
  expect(content).toContain("kind: 'anchor.timeout'");
  expect(content).toContain("failure_code: 'timeout'");
  expect(content).toContain('emitAnchorConfirmedEvent(');
});

test('polygon worker must enforce deterministic timeout and max-attempt terminal states', async () => {
  const content = await fs.readFile(PROCESS_POLYGON_FILE, 'utf8');

  expect(content).toContain('MAX_POLYGON_ATTEMPTS');
  expect(content).toContain('POLYGON_PENDING_TIMEOUT_MINUTES');
  expect(content).toContain('emitAnchorTimeoutEvent(');
  expect(content).toContain("kind: 'anchor.timeout'");
  expect(content).toMatch(/emitAnchorFailedEvent\(\s*anchor,\s*reason,\s*attempts,\s*true,\s*'timeout'\s*\)/s);
  expect(content).toContain('pendingAgeMinutes');
});
