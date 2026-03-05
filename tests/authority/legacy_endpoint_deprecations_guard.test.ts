import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

test('legacy endpoints must stay hard-deprecated (410) with no side-effects', async () => {
  const files = [
    'supabase/functions/auto-tsa/index.ts',
    'supabase/functions/test-email/index.ts',
    'supabase/functions/test-insert-notification/index.ts',
    'supabase/functions/wake-authority/index.ts',
    'supabase/functions/stamp-pdf/index.ts',
  ];

  for (const relPath of files) {
    const content = await fs.readFile(path.join(ROOT, relPath), 'utf8');
    expect(content).toContain('410');
    expect(content.toLowerCase()).toContain('deprecated');
  }
});
