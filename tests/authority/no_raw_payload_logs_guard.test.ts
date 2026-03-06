import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const read = async (relativePath: string) =>
  fs.readFile(path.join(ROOT, relativePath), 'utf8');

describe('sensitive runtime logs must not include raw payload/body dumps', () => {
  test('signnow invite flow never logs full invite payload', async () => {
    const source = await read('supabase/functions/signnow/index.ts');
    expect(source).not.toMatch(/Invite payload:/);
    expect(source).not.toMatch(/console\.(?:log|info|warn|error)\([^)]*invitePayload/);
  });

  test('signnow webhook never logs raw payload object', async () => {
    const source = await read('supabase/functions/signnow-webhook/index.ts');
    expect(source).not.toMatch(/webhook received',\s*payload/);
  });

  test('record-protection-event never logs raw request body', async () => {
    const source = await read('supabase/functions/record-protection-event/index.ts');
    expect(source).not.toMatch(/raw body:/i);
    expect(source).not.toMatch(/req\.clone\(\)\.text\(\)/);
  });
});
