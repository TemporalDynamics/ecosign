import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const ANCHOR_BITCOIN_FILE = path.join(ROOT, 'supabase/functions/anchor-bitcoin/index.ts');
const ANCHOR_POLYGON_FILE = path.join(ROOT, 'supabase/functions/anchor-polygon/index.ts');
const PROCESS_BITCOIN_FILE = path.join(ROOT, 'supabase/functions/process-bitcoin-anchors/index.ts');
const PROCESS_POLYGON_FILE = path.join(ROOT, 'supabase/functions/process-polygon-anchors/index.ts');

const expectNoLegacyUserDocumentsReads = (content: string) => {
  expect(content).not.toMatch(/\.from\(\s*['"]user_documents['"]\s*\)/);
  expect(content).not.toMatch(/user_documents!inner/);
};

test('anchor submitters must not read user_documents and must keep document_entity_id context', async () => {
  const [bitcoinContent, polygonContent] = await Promise.all([
    fs.readFile(ANCHOR_BITCOIN_FILE, 'utf8'),
    fs.readFile(ANCHOR_POLYGON_FILE, 'utf8'),
  ]);

  expectNoLegacyUserDocumentsReads(bitcoinContent);
  expectNoLegacyUserDocumentsReads(polygonContent);

  expect(bitcoinContent).toContain('document_entity_id');
  expect(polygonContent).toContain('document_entity_id');
  expect(bitcoinContent).toContain('resolveAnchorContext(');
  expect(polygonContent).toContain('resolveAnchorContext(');
});

test('process-bitcoin-anchors must not fetch notification recipients from user_documents', async () => {
  const [bitcoinContent, polygonContent] = await Promise.all([
    fs.readFile(PROCESS_BITCOIN_FILE, 'utf8'),
    fs.readFile(PROCESS_POLYGON_FILE, 'utf8'),
  ]);

  expectNoLegacyUserDocumentsReads(bitcoinContent);
  expectNoLegacyUserDocumentsReads(polygonContent);
  expect(bitcoinContent).toContain('enqueueBitcoinNotifications(');
  expect(bitcoinContent).toContain("supabaseAdmin.auth.admin.getUserById(anchor.user_id)");
  expect(bitcoinContent).toContain("onConflict: 'workflow_id,recipient_email,notification_type'");
  expect(polygonContent).toContain("onConflict: 'workflow_id,recipient_email,notification_type'");
});
