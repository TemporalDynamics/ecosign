import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const patterns: Array<{ label: string; re: RegExp }> = [
  { label: 'anchor-polygon', re: /functions\.invoke\(['"]anchor-polygon['"]/ },
  { label: 'anchor-bitcoin', re: /functions\.invoke\(['"]anchor-bitcoin['"]/ },
  { label: 'legal-timestamp', re: /functions\.invoke\(['"]legal-timestamp['"]/ },
  { label: 'anchor-polygon', re: /callFunction\(['"]anchor-polygon['"]/ },
  { label: 'anchor-bitcoin', re: /callFunction\(['"]anchor-bitcoin['"]/ },
  { label: 'legal-timestamp', re: /callFunction\(['"]legal-timestamp['"]/ },
];

const allowedWithoutGuard = new Set([
  'supabase/functions/fase1-executor/index.ts',
  'supabase/functions/run-tsa/index.ts',
  'supabase/functions/submit-anchor-polygon/index.ts',
  'supabase/functions/submit-anchor-bitcoin/index.ts',
  // This function invokes legal-timestamp for rejection receipt TSA proof,
  // not for canonical TSA/anchoring pipeline dispatch.
  'supabase/functions/reject-signature/index.ts',
]);

const guardTokens = [
  'V2_AUTHORITY_ONLY',
  'DISABLE_SIGNNOW_EXECUTION',
  'DISABLE_PROCESS_SIGNATURE_EXECUTION',
  'DISABLE_AUTO_TSA',
  'DISABLE_DB_ANCHOR_TRIGGERS',
  'VITE_V2_AUTHORITY_ONLY',
  'VITE_DISABLE_CLIENT_ANCHOR_EXECUTION',
];

const usesGuard = (text: string) => guardTokens.some((token) => text.includes(token));

const collectTsFiles = async (dir: string, out: string[]): Promise<void> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const rel = path.relative(ROOT, fullPath).replaceAll(path.sep, '/');

    if (entry.isDirectory()) {
      if (rel.startsWith('node_modules/') || rel === 'node_modules') continue;
      if (rel.startsWith('dist/') || rel === 'dist') continue;
      if (rel.startsWith('supabase/functions/_legacy/')) continue;
      await collectTsFiles(fullPath, out);
      continue;
    }

    if (entry.isFile() && fullPath.endsWith('.ts')) {
      out.push(fullPath);
    }
  }
};

test('authority: TSA/anchoring callers must be executor or guarded', { timeout: 20000 }, async () => {
  const offenders: string[] = [];

  const files: string[] = [];
  await collectTsFiles(ROOT, files);

  for (const filePath of files) {
    const relPath = path.relative(ROOT, filePath).replaceAll(path.sep, '/');

    if (!relPath.startsWith('supabase/functions') && !relPath.startsWith('client/src')) {
      continue;
    }

    const content = await fs.readFile(filePath, 'utf8');
    const matches = patterns.filter((pattern) => pattern.re.test(content));
    if (matches.length === 0) continue;

    if (allowedWithoutGuard.has(relPath)) {
      continue;
    }

    if (!usesGuard(content)) {
      offenders.push(`${relPath} (${matches.map((m) => m.label).join(', ')})`);
    }
  }

  if (offenders.length > 0) {
    throw new Error(`Missing authority guard in:\n${offenders.join('\n')}`);
  }
});
