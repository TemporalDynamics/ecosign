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
const MIGRATION_FILE = path.join(
  ROOT,
  'supabase/migrations/20260301000800_invites_access_entity_canonical.sql',
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
  const [createInvite, createSignerLink, generateLink, verifyAccess] = await Promise.all([
    fs.readFile(CREATE_INVITE_FILE, 'utf8'),
    fs.readFile(CREATE_SIGNER_LINK_FILE, 'utf8'),
    fs.readFile(GENERATE_LINK_FILE, 'utf8'),
    fs.readFile(VERIFY_ACCESS_FILE, 'utf8'),
  ]);

  for (const content of [createInvite, createSignerLink, generateLink]) {
    expect(content).not.toContain('getUserDocumentId(');
  }

  expect(verifyAccess).not.toContain('getDocumentEntityId(');
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
