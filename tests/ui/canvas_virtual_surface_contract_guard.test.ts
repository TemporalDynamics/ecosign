import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const CONTRACT_FILE = path.join(ROOT, 'docs/ui/CANVAS_VIRTUAL_CONTRACT.md');
const SURFACES_FILE = path.join(ROOT, 'docs/ui/CANVAS_VIRTUAL_SURFACES.md');
const EXCEPTION_FILE = 'client/src/centro-legal/modules/flow/SignerFieldsWizard.tsx';
const CLIENT_SRC = path.join(ROOT, 'client/src');
const TEXT_CANVAS_SURFACES = [
  'client/src/components/LegalCenterModalV2.tsx',
  'client/src/pages/DocumentsPage.tsx',
] as const;

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...await walkFiles(full));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!full.endsWith('.ts') && !full.endsWith('.tsx') && !full.endsWith('.jsx')) continue;
    out.push(full);
  }
  return out;
}

async function listPdfViewerSurfaces(): Promise<string[]> {
  const files = await walkFiles(CLIENT_SRC);
  const matches: string[] = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    if (content.includes('<PdfEditViewer')) {
      matches.push(path.relative(ROOT, file).replaceAll('\\', '/'));
    }
  }

  return [...new Set(matches)].sort();
}

test('canvas virtual contract doc must declare canonical invariants', async () => {
  const content = await fs.readFile(CONTRACT_FILE, 'utf8');

  expect(content).toContain('Invariantes Canónicos');
  expect(content).toContain('Autofit horizontal');
  expect(content).toContain('Sin scroll horizontal');
  expect(content).toContain('Scroll vertical permitido');
  expect(content).toContain('Texto sin reflow destructivo');
  expect(content).toContain('Excepción explícita');
  expect(content).toContain('SignerFieldsWizard');
});

test('all PdfEditViewer surfaces must be documented in canonical surfaces map (except explicit exception)', async () => {
  const surfacesDoc = await fs.readFile(SURFACES_FILE, 'utf8');
  const usageFiles = await listPdfViewerSurfaces();
  const missing: string[] = [];

  for (const file of usageFiles) {
    if (file === EXCEPTION_FILE) continue;
    if (!surfacesDoc.includes(file)) {
      missing.push(file);
    }
  }

  expect(missing).toEqual([]);
  expect(surfacesDoc).toContain(EXCEPTION_FILE);
});

test('text preview surfaces must use VirtualTextCanvas canonical renderer', async () => {
  const surfacesDoc = await fs.readFile(SURFACES_FILE, 'utf8');

  for (const file of TEXT_CANVAS_SURFACES) {
    const content = await fs.readFile(path.join(ROOT, file), 'utf8');
    expect(surfacesDoc).toContain(file);
    expect(content).toContain('VirtualTextCanvas');
  }

  const documentsPage = await fs.readFile(path.join(ROOT, 'client/src/pages/DocumentsPage.tsx'), 'utf8');
  expect(documentsPage).not.toContain('whitespace-pre-wrap">{previewText}');
  expect(documentsPage).not.toContain('whitespace-pre-wrap">{previewDraftText}');
});
