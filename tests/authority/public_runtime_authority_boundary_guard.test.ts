import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const BOUNDARY_DOC = path.join(
  ROOT,
  'docs/beta/PUBLIC_RUNTIME_AUTHORITY_BOUNDARY_SEALED.md',
);
const PREBETA_FIRE_DRILL_FILE = path.join(
  ROOT,
  'scripts/diagnostics/prebeta_fire_drill.sh',
);
const FUNCTIONS_ROOT = path.join(ROOT, 'supabase/functions');

const ALLOWLIST = new Map<string, string>([
  ['new-document-canonical-trigger', 'canonical trigger reads documents projection'],
  ['signer-access', 'external SignNow documentId'],
  ['signnow', 'external SignNow documentId'],
  ['signnow-webhook', 'legacy integration payload'],
  ['submit-anchor-bitcoin', 'forwards legacy document_id to anchor'],
  ['submit-anchor-polygon', 'forwards legacy document_id to anchor'],
  ['anchor-bitcoin', 'legacy payload compatibility + documents pointer'],
  ['anchor-polygon', 'legacy payload compatibility + documents pointer'],
]);

const FORBIDDEN_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: 'documentId token', regex: /\bdocumentId\b/ },
  { label: "documents table read (.from('documents'))", regex: /\.from\(\s*['"]documents['"]\s*\)/ },
];

test('public runtime authority boundary doc must define invariants and explicit allowlist', async () => {
  const content = await fs.readFile(BOUNDARY_DOC, 'utf8');

  expect(content).toContain('Public Runtime Authority Boundary Sealed (Stage 2)');
  expect(content).toContain('document_entity_id');
  expect(content).toContain('allowlist explícita');
  expect(content).toContain('documentId');
  expect(content).toContain(".from('documents')");

  for (const fnName of ALLOWLIST.keys()) {
    expect(content).toContain(`\`${fnName}\``);
  }
});

test('public runtime functions must not use legacy authority markers outside allowlist', async () => {
  const entries = await fs.readdir(FUNCTIONS_ROOT, { withFileTypes: true });
  const offenders: string[] = [];
  const staleAllowlist: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('_')) continue;

    const indexFile = path.join(FUNCTIONS_ROOT, entry.name, 'index.ts');
    let content: string;
    try {
      content = await fs.readFile(indexFile, 'utf8');
    } catch {
      continue;
    }

    const matched = FORBIDDEN_PATTERNS
      .filter((pattern) => pattern.regex.test(content))
      .map((pattern) => pattern.label);

    if (matched.length === 0) {
      continue;
    }

    if (!ALLOWLIST.has(entry.name)) {
      offenders.push(`${entry.name}: ${matched.join(', ')}`);
      continue;
    }

    staleAllowlist.push(entry.name);
  }

  const unmatchedAllowlist = [...ALLOWLIST.keys()]
    .filter((fnName) => !staleAllowlist.includes(fnName));

  expect(offenders).toEqual([]);
  expect(unmatchedAllowlist).toEqual([]);
});

test('prebeta fire drill must include public runtime authority boundary guard', async () => {
  const content = await fs.readFile(PREBETA_FIRE_DRILL_FILE, 'utf8');
  expect(content).toContain('Public runtime authority boundary guard');
  expect(content).toContain('tests/authority/public_runtime_authority_boundary_guard.test.ts');
});
