import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const LOG_EVENT_FILE = path.join(ROOT, 'supabase/functions/log-event/index.ts');
const NOTIFY_CERTIFIED_FILE = path.join(
  ROOT,
  'supabase/functions/notify-document-certified/index.ts',
);
const RECORD_PROTECTION_FILE = path.join(
  ROOT,
  'supabase/functions/record-protection-event/index.ts',
);
const REPAIR_ANCHORS_FILE = path.join(
  ROOT,
  'supabase/functions/repair-missing-anchor-events/index.ts',
);
const NEW_DOC_TRIGGER_FILE = path.join(
  ROOT,
  'supabase/functions/new-document-canonical-trigger/index.ts',
);

const expectNoLegacyUserDocumentsRead = (content: string) => {
  expect(content).not.toMatch(/\.from\(\s*['"]user_documents['"]\s*\)/);
  expect(content).not.toMatch(/user_documents!inner/);
};

test('non-critical edge endpoints must not read user_documents', async () => {
  const [
    logEventContent,
    notifyContent,
    recordProtectionContent,
    repairContent,
    newDocContent,
  ] = await Promise.all([
    fs.readFile(LOG_EVENT_FILE, 'utf8'),
    fs.readFile(NOTIFY_CERTIFIED_FILE, 'utf8'),
    fs.readFile(RECORD_PROTECTION_FILE, 'utf8'),
    fs.readFile(REPAIR_ANCHORS_FILE, 'utf8'),
    fs.readFile(NEW_DOC_TRIGGER_FILE, 'utf8'),
  ]);

  for (const content of [
    logEventContent,
    notifyContent,
    recordProtectionContent,
    repairContent,
    newDocContent,
  ]) {
    expectNoLegacyUserDocumentsRead(content);
  }
});

test('log-event must append canonical events to document_entities', async () => {
  const content = await fs.readFile(LOG_EVENT_FILE, 'utf8');

  expect(content).toContain('appendEvent(');
  expect(content).toContain('documentEntityId');
  expect(content).toContain(".from('document_entities')");
  expect(content).not.toMatch(
    /\.from\(\s*['"]events['"]\s*\)\s*\.insert\(/s,
  );
  expect(content).not.toContain('getDocumentEntityId(');
  expect(content).not.toContain('documentId');
});

test('notify-document-certified must derive evidence from canonical entity/events', async () => {
  const content = await fs.readFile(NOTIFY_CERTIFIED_FILE, 'utf8');

  expect(content).toContain(".from('document_entities')");
  expect(content).toContain('document.protected.requested');
  expect(content).toContain('anchor.confirmed');
  expect(content).toContain('tsa.confirmed');
});

test('record-protection-event must stay canonical-only by document_entity_id', async () => {
  const content = await fs.readFile(RECORD_PROTECTION_FILE, 'utf8');

  expect(content).toContain(".from('document_entities')");
  expect(content).toContain('document_entity_id');
  expect(content).toContain('document_id is no longer accepted; use document_entity_id');
  expect(content).toContain('appendEvent(');
  expect(content).not.toContain(".from('documents')");
  expect(content).not.toContain('getDocumentEntityId(');
  expect(content).not.toContain('getUserDocumentId(');
});

test('repair-missing-anchor-events must scope anchor lookup by document_entity_id', async () => {
  const content = await fs.readFile(REPAIR_ANCHORS_FILE, 'utf8');

  expect(content).toContain(".eq('document_entity_id', documentEntityId)");
  expect(content).toContain(".from('anchors')");
  expect(content).toContain('appendAnchorEventFromEdge(');
});

test('new-document-canonical-trigger must read canonical pointer from documents', async () => {
  const content = await fs.readFile(NEW_DOC_TRIGGER_FILE, 'utf8');

  expect(content).toContain(".from('documents')");
  expect(content).toContain('documents.document_entity_id');
  expect(content).toContain('appendEvent(');
});
