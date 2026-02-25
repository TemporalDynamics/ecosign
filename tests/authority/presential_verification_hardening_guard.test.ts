import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const START_FILE = path.join(
  ROOT,
  'supabase/functions/presential-verification-start-session/index.ts',
);
const CONFIRM_FILE = path.join(
  ROOT,
  'supabase/functions/presential-verification-confirm-presence/index.ts',
);
const CLOSE_FILE = path.join(
  ROOT,
  'supabase/functions/presential-verification-close-session/index.ts',
);
const RELEASE_MANIFEST = path.join(
  ROOT,
  'scripts/diagnostics/release_beta_functions.txt',
);
const VERIFIER_NORMALIZE_EVENTS_FILE = path.join(
  ROOT,
  'client/src/lib/verifier/normalizeEvents.ts',
);

test('presential confirm must use persisted OTP and canonical append helper', async () => {
  const content = await fs.readFile(CONFIRM_FILE, 'utf8');

  expect(content).toContain(".from('presential_verification_otps')");
  expect(content).toContain('appendEvent(');
  expect(content).toContain('presential-verification-confirm-presence');
  expect(content).not.toMatch(/For now, accept any 6-digit OTP/i);
  expect(content).not.toContain('return /^\\\\d{6}$/.test(otp)');
  expect(content).not.toMatch(
    /\.from\(\s*['"]document_entities['"]\s*\)\s*\.update\(\s*\{\s*events\s*:/s,
  );
});

test('presential start must create expiring session and OTP challenges', async () => {
  const content = await fs.readFile(START_FILE, 'utf8');

  expect(content).toContain('expires_at');
  expect(content).toContain(".from('presential_verification_otps')");
  expect(content).toContain('buildSignerOtpEmail');
  expect(content).toContain('sendEmail');
});

test('presential close must append canonical event (no direct events array update)', async () => {
  const content = await fs.readFile(CLOSE_FILE, 'utf8');

  expect(content).toContain('appendEvent(');
  expect(content).toContain('presential-verification-close-session');
  expect(content).toContain('acta_payload');
  expect(content).toContain('acta_hash');
  expect(content).toContain('acta_timestamps');
  expect(content).toContain('legal-timestamp');
  expect(content).toContain('identity.session.presence.closed');
  expect(content).not.toMatch(
    /\.from\(\s*['"]document_entities['"]\s*\)\s*\.update\(\s*\{\s*events\s*:/s,
  );
});

test('release bundle must include presential verification functions', async () => {
  const manifest = await fs.readFile(RELEASE_MANIFEST, 'utf8');
  expect(manifest).toContain('presential-verification-start-session');
  expect(manifest).toContain('presential-verification-confirm-presence');
  expect(manifest).toContain('presential-verification-close-session');
});

test('verifier must label presential trenza events', async () => {
  const content = await fs.readFile(VERIFIER_NORMALIZE_EVENTS_FILE, 'utf8');

  expect(content).toContain('identity.session.presence.confirmed');
  expect(content).toContain('identity.session.presence.witnessed');
  expect(content).toContain('identity.session.presence.closed');
  expect(content).toContain('Trenza:');
  expect(content).toContain('Acta:');
});
