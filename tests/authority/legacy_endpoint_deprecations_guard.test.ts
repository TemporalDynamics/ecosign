import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

test('legacy endpoints must be physically removed from runtime surface', async () => {
  const files = [
    'supabase/functions/append-tsa-event/index.ts',
    'supabase/functions/auto-tsa/index.ts',
    'supabase/functions/test-email/index.ts',
    'supabase/functions/test-insert-notification/index.ts',
    'supabase/functions/wake-authority/index.ts',
    'supabase/functions/stamp-pdf/index.ts',
  ];

  for (const relPath of files) {
    await expect(fs.access(path.join(ROOT, relPath))).rejects.toBeDefined();
  }
});
