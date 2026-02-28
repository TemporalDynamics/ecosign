import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const CREATE_INVITE_FILE = path.join(ROOT, 'supabase/functions/create-invite/index.ts');
const ACCEPT_INVITE_NDA_FILE = path.join(ROOT, 'supabase/functions/accept-invite-nda/index.ts');
const CREATE_SIGNER_LINK_FILE = path.join(ROOT, 'supabase/functions/create-signer-link/index.ts');
const GENERATE_LINK_FILE = path.join(ROOT, 'supabase/functions/generate-link/index.ts');
const VERIFY_ACCESS_FILE = path.join(ROOT, 'supabase/functions/verify-access/index.ts');
const VERIFY_INVITE_ACCESS_FILE = path.join(ROOT, 'supabase/functions/verify-invite-access/index.ts');
const SHARED_SCHEMAS_FILE = path.join(ROOT, 'supabase/functions/_shared/schemas.ts');
const MIGRATION_FILE = path.join(
  ROOT,
  'supabase/migrations/20260301000800_invites_access_entity_canonical.sql',
);
const LINKS_RECIPIENTS_ENTITY_ONLY_MIGRATION_FILE = path.join(
  ROOT,
  'supabase/migrations/20260301001300_links_recipients_entity_only.sql',
);
const SIGNER_LINKS_ENTITY_ONLY_MIGRATION_FILE = path.join(
  ROOT,
  'supabase/migrations/20260301001400_signer_links_entity_only.sql',
);

const expectNoLegacyUserDocumentsRead = (content: string) => {
  expect(content).not.toMatch(/user_documents!inner/);
  expect(content).not.toMatch(/\.from\(\s*['"]user_documents['"]\s*\)/);
};

test('invites/access endpoints must not read legacy user_documents', async () => {
  const [createInvite, acceptInviteNda, createSignerLink, generateLink, verifyAccess, verifyInviteAccess] =
    await Promise.all([
      fs.readFile(CREATE_INVITE_FILE, 'utf8'),
      fs.readFile(ACCEPT_INVITE_NDA_FILE, 'utf8'),
      fs.readFile(CREATE_SIGNER_LINK_FILE, 'utf8'),
      fs.readFile(GENERATE_LINK_FILE, 'utf8'),
      fs.readFile(VERIFY_ACCESS_FILE, 'utf8'),
      fs.readFile(VERIFY_INVITE_ACCESS_FILE, 'utf8'),
    ]);

  for (const content of [
    createInvite,
    acceptInviteNda,
    createSignerLink,
    generateLink,
    verifyAccess,
    verifyInviteAccess,
  ]) {
    expectNoLegacyUserDocumentsRead(content);
  }
});

test('invites/access endpoints must not use user_document bridge helpers', async () => {
  const [createInvite, createSignerLink, generateLink, verifyAccess, verifyInviteAccess] = await Promise.all([
    fs.readFile(CREATE_INVITE_FILE, 'utf8'),
    fs.readFile(CREATE_SIGNER_LINK_FILE, 'utf8'),
    fs.readFile(GENERATE_LINK_FILE, 'utf8'),
    fs.readFile(VERIFY_ACCESS_FILE, 'utf8'),
    fs.readFile(VERIFY_INVITE_ACCESS_FILE, 'utf8'),
  ]);

  for (const content of [createInvite, createSignerLink, generateLink]) {
    expect(content).not.toContain('getUserDocumentId(');
  }

  expect(verifyAccess).not.toContain('getDocumentEntityId(');
  expect(verifyInviteAccess).not.toContain(".from('documents')");
  expect(verifyInviteAccess).toContain('legacy_invite_missing_document_entity_id');
});

test('invites/access endpoints must use document_entity_id references', async () => {
  const [createInvite, createSignerLink, generateLink, verifyAccess, verifyInviteAccess] = await Promise.all([
    fs.readFile(CREATE_INVITE_FILE, 'utf8'),
    fs.readFile(CREATE_SIGNER_LINK_FILE, 'utf8'),
    fs.readFile(GENERATE_LINK_FILE, 'utf8'),
    fs.readFile(VERIFY_ACCESS_FILE, 'utf8'),
    fs.readFile(VERIFY_INVITE_ACCESS_FILE, 'utf8'),
  ]);

  expect(createInvite).toContain('document_entity_id');
  expect(createSignerLink).toContain('document_entity_id');
  expect(generateLink).toContain('document_entity_id');
  expect(verifyAccess).toContain('document_entity_id');
  expect(verifyInviteAccess).toContain('document_entity_id');
  expect(verifyAccess).toContain('getLatestEcoStoragePath');
});

test('public invite/link/access endpoints must enforce document_entity_id strict mode', async () => {
  const [schemasContent, createInvite, generateLink, verifyAccess] = await Promise.all([
    fs.readFile(SHARED_SCHEMAS_FILE, 'utf8'),
    fs.readFile(CREATE_INVITE_FILE, 'utf8'),
    fs.readFile(GENERATE_LINK_FILE, 'utf8'),
    fs.readFile(VERIFY_ACCESS_FILE, 'utf8'),
  ]);

  expect(schemasContent).toContain('document_entity_id: z.string().uuid()');
  expect(schemasContent).toContain('CreateSignerLinkSchema');
  expect(schemasContent).toContain('documentEntityId: z.string().uuid()');
  expect(schemasContent).toContain('GenerateLinkSchema');
  expect(schemasContent).toContain('}).strict();');

  expect(createInvite).not.toContain('documentId');
  expect(createInvite).not.toContain(".from('documents')");
  expect(schemasContent).not.toContain('documentId: z.string().uuid().optional()');

  expect(generateLink).not.toContain('resolveDocumentRefs(');
  expect(generateLink).not.toContain(".from('documents')");
  expect(generateLink).not.toContain('document_id,');

  expect(verifyAccess).toContain('legacy_link_missing_document_entity_id');
  expect(verifyAccess).toContain('legacy_link_missing_recipient_id');
  expect(verifyAccess).not.toContain(".from('documents')");
  expect(verifyAccess).not.toContain(".eq('document_id', link.document_id)");
});

test('create-signer-link must require documentEntityId and avoid legacy resolver fallback', async () => {
  const [createSignerLink, schemasContent] = await Promise.all([
    fs.readFile(CREATE_SIGNER_LINK_FILE, 'utf8'),
    fs.readFile(SHARED_SCHEMAS_FILE, 'utf8'),
  ]);

  expect(createSignerLink).not.toContain('resolveDocumentRefs(');
  expect(createSignerLink).not.toContain('documentId');
  expect(createSignerLink).toContain('documentEntityId');
  expect(createSignerLink).toContain(".eq('id', documentEntityId)");

  expect(schemasContent).toContain('CreateSignerLinkSchema');
  expect(schemasContent).toContain('documentEntityId: z.string().uuid()');
  expect(schemasContent).toContain('}).strict();');
});

test('migration must add canonical document_entity_id pointers for invites/access tables', async () => {
  const content = await fs.readFile(MIGRATION_FILE, 'utf8');

  expect(content).toContain('ALTER TABLE public.documents');
  expect(content).toContain('ADD COLUMN IF NOT EXISTS document_entity_id UUID');
  expect(content).toContain('ALTER TABLE public.invites');
  expect(content).toContain('ALTER COLUMN document_id DROP NOT NULL');
  expect(content).toContain('ALTER TABLE public.signer_links');
  expect(content).toContain('UPDATE public.links l');
  expect(content).toContain('UPDATE public.recipients r');
});

test('links/recipients migration must allow entity-only records without document_id', async () => {
  const content = await fs.readFile(LINKS_RECIPIENTS_ENTITY_ONLY_MIGRATION_FILE, 'utf8');

  expect(content).toContain('ALTER TABLE public.links');
  expect(content).toContain('ALTER COLUMN document_id DROP NOT NULL');
  expect(content).toContain('ALTER TABLE public.recipients');
  expect(content).toContain('ALTER COLUMN document_id DROP NOT NULL');
});

test('signer_links migration must allow entity-only records without document_id', async () => {
  const content = await fs.readFile(SIGNER_LINKS_ENTITY_ONLY_MIGRATION_FILE, 'utf8');

  expect(content).toContain('ALTER TABLE public.signer_links');
  expect(content).toContain('ALTER COLUMN document_id DROP NOT NULL');
});
