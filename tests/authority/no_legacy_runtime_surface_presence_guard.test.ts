import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

test('legacy runtime endpoints must not exist on filesystem', async () => {
  const legacyPaths = [
    'supabase/functions/append-tsa-event',
    'supabase/functions/auto-tsa',
    'supabase/functions/stamp-pdf',
    'supabase/functions/test-email',
    'supabase/functions/test-insert-notification',
    'supabase/functions/wake-authority',
  ];

  for (const relPath of legacyPaths) {
    await expect(fs.access(path.join(ROOT, relPath))).rejects.toBeDefined();
  }
});

