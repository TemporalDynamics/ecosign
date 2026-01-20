import { walk } from 'https://deno.land/std@0.182.0/fs/walk.ts';

const ROOT = new URL('../..', import.meta.url);

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

Deno.test('authority: TSA/anchoring callers must be executor or guarded', async () => {
  const offenders: string[] = [];

  for await (const entry of walk(ROOT, {
    includeDirs: false,
    exts: ['.ts'],
    skip: [/node_modules/, /dist/, /supabase\/functions\/_legacy/],
  })) {
    const relPath = entry.path.replace(String(ROOT.pathname).replace(/\/$/, ''), '').replace(/^\/+/, '');

    if (!relPath.startsWith('supabase/functions') && !relPath.startsWith('client/src')) {
      continue;
    }

    const content = await Deno.readTextFile(entry.path);
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
