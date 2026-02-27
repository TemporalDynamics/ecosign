import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const MILESTONE_DOC = path.join(ROOT, 'docs/beta/LEGACY_COMPAT_DECOMMISSION_STAGE1.md');
const SHARED_SCHEMAS_FILE = path.join(ROOT, 'supabase/functions/_shared/schemas.ts');
const CREATE_SIGNER_LINK_FILE = path.join(ROOT, 'supabase/functions/create-signer-link/index.ts');
const VERIFY_INVITE_ACCESS_FILE = path.join(ROOT, 'supabase/functions/verify-invite-access/index.ts');
const PREBETA_FIRE_DRILL_FILE = path.join(ROOT, 'scripts/diagnostics/prebeta_fire_drill.sh');

test('legacy compat decommission stage1 doc must exist with strict entity-id scope', async () => {
  const content = await fs.readFile(MILESTONE_DOC, 'utf8');

  expect(content).toContain('Legacy Compatibility Decommission — Stage 1');
  expect(content).toContain('breaking change pre-launch');
  expect(content).toContain('No se ofrece compatibilidad legacy ni backfill obligatorio');
  expect(content).toContain('create-signer-link');
  expect(content).toContain('verify-invite-access');
  expect(content).toContain('document_entity_id');
  expect(content).toContain('legacy_invite_missing_document_entity_id');
  expect(content).toContain('invites sin `document_entity_id`');
});

test('create-signer-link schema and handler must require documentEntityId and avoid legacy resolver', async () => {
  const [schemas, createSignerLink] = await Promise.all([
    fs.readFile(SHARED_SCHEMAS_FILE, 'utf8'),
    fs.readFile(CREATE_SIGNER_LINK_FILE, 'utf8'),
  ]);

  expect(schemas).toContain('CreateSignerLinkSchema');
  expect(schemas).toContain('documentEntityId: z.string().uuid()');
  expect(schemas).toContain('}).strict();');
  expect(schemas).not.toContain('documentId: z.string().uuid().optional()');

  expect(createSignerLink).not.toContain('resolveDocumentRefs(');
  expect(createSignerLink).not.toContain('const { documentId,');
  expect(createSignerLink).toContain('const { documentEntityId, signerEmail, signerName } = parsed.data;');
  expect(createSignerLink).toContain(".eq('id', documentEntityId)");
});

test('verify-invite-access must reject legacy invites missing document_entity_id (no documents fallback)', async () => {
  const content = await fs.readFile(VERIFY_INVITE_ACCESS_FILE, 'utf8');

  expect(content).toContain('legacy_invite_missing_document_entity_id');
  expect(content).not.toContain(".from('documents')");
  expect(content).not.toContain(".select('document_entity_id')");
});

test('prebeta fire drill must include legacy compat decommission guard', async () => {
  const content = await fs.readFile(PREBETA_FIRE_DRILL_FILE, 'utf8');

  expect(content).toContain('Legacy compat decommission guard');
  expect(content).toContain('tests/authority/legacy_compat_decommission_guard.test.ts');
});
