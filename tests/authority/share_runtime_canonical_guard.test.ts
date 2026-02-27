import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const VERIFY_SHARE_OTP_FILE = path.join(
  ROOT,
  'supabase/functions/verify-share-otp/index.ts',
);
const GET_SHARE_METADATA_FILE = path.join(
  ROOT,
  'supabase/functions/get-share-metadata/index.ts',
);
const ACCEPT_SHARE_NDA_FILE = path.join(
  ROOT,
  'supabase/functions/accept-share-nda/index.ts',
);
const LOG_SHARE_EVENT_FILE = path.join(
  ROOT,
  'supabase/functions/log-share-event/index.ts',
);
const CLIENT_DOCUMENT_SHARING_FILE = path.join(
  ROOT,
  'client/src/lib/storage/documentSharing.ts',
);
const SHARE_RUNTIME_MIGRATION_FILE = path.join(
  ROOT,
  'supabase/migrations/20260301000700_document_shares_entity_and_ecox_runtime.sql',
);
const SHARE_CANON_LOCK_MIGRATION_FILE = path.join(
  ROOT,
  'supabase/migrations/20260301001100_document_shares_canonical_lock.sql',
);

const expectNoLegacyUserDocumentsRead = (content: string) => {
  expect(content).not.toMatch(/user_documents!inner/);
  expect(content).not.toMatch(/\.from\(\s*['"]user_documents['"]\s*\)/);
};

test('share OTP endpoints must not read legacy user_documents projection', async () => {
  const [verifyContent, metadataContent] = await Promise.all([
    fs.readFile(VERIFY_SHARE_OTP_FILE, 'utf8'),
    fs.readFile(GET_SHARE_METADATA_FILE, 'utf8'),
  ]);

  expectNoLegacyUserDocumentsRead(verifyContent);
  expectNoLegacyUserDocumentsRead(metadataContent);

  expect(verifyContent).toContain('document_entity_id');
  expect(metadataContent).toContain('document_entity_id');
  expect(verifyContent).toContain('readEcoxRuntimeMetadata');

  expect(verifyContent).not.toContain('getDocumentEntityId(');
  expect(metadataContent).not.toContain('getDocumentEntityId(');
});

test('share event endpoints must not use user_document bridge helper', async () => {
  const [acceptNdaContent, logEventContent] = await Promise.all([
    fs.readFile(ACCEPT_SHARE_NDA_FILE, 'utf8'),
    fs.readFile(LOG_SHARE_EVENT_FILE, 'utf8'),
  ]);

  expectNoLegacyUserDocumentsRead(acceptNdaContent);
  expectNoLegacyUserDocumentsRead(logEventContent);

  expect(acceptNdaContent).toContain('document_entity_id');
  expect(logEventContent).toContain('document_entity_id');

  expect(acceptNdaContent).not.toContain('getDocumentEntityId(');
  expect(logEventContent).not.toContain('getDocumentEntityId(');
});

test('client sharing must persist canonical document_entity_id and ECOX runtime', async () => {
  const content = await fs.readFile(CLIENT_DOCUMENT_SHARING_FILE, 'utf8');

  expect(content).toContain('document_entity_id: doc.document_entity_id');
  expect(content).toContain('upsertEntityEcoxRuntime(');
  expect(content).toContain('ecox');
  expect(content).toContain('runtime');
  expect(content).toContain('encrypted_path');
  expect(content).toContain("throw new Error('missing_document_entity_id')");
});

test('migration must add share entity pointer and backfill ECOX runtime metadata', async () => {
  const content = await fs.readFile(SHARE_RUNTIME_MIGRATION_FILE, 'utf8');

  expect(content).toContain('ADD COLUMN IF NOT EXISTS document_entity_id UUID');
  expect(content).toContain('SET document_entity_id = ud.document_entity_id');
  expect(content).toContain('{ecox,runtime,encrypted_path}');
  expect(content).toContain('{ecox,runtime,wrapped_key}');
  expect(content).toContain('{ecox,runtime,wrap_iv}');
});

test('canonical lock migration must decouple document_shares from legacy user_documents', async () => {
  const content = await fs.readFile(SHARE_CANON_LOCK_MIGRATION_FILE, 'utf8');

  expect(content).toContain('DROP CONSTRAINT IF EXISTS document_shares_document_id_fkey');
  expect(content).toContain('document_shares_document_entity_required');
  expect(content).toContain('uniq_document_shares_pending_entity_recipient');
  expect(content).toContain('FROM public.document_entities de');
  expect(content).toContain("status = 'accessed'");
});
