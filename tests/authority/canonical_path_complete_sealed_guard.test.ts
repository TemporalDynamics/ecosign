import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const MILESTONE_DOC = path.join(ROOT, 'docs/beta/CANONICAL_PATH_COMPLETE_SEALED.md');
const SHARED_SCHEMAS_FILE = path.join(ROOT, 'supabase/functions/_shared/schemas.ts');
const GENERATE_LINK_FILE = path.join(ROOT, 'supabase/functions/generate-link/index.ts');
const VERIFY_ACCESS_FILE = path.join(ROOT, 'supabase/functions/verify-access/index.ts');
const ACCEPT_SHARE_NDA_FILE = path.join(ROOT, 'supabase/functions/accept-share-nda/index.ts');
const GET_SHARE_METADATA_FILE = path.join(ROOT, 'supabase/functions/get-share-metadata/index.ts');
const VERIFY_SHARE_OTP_FILE = path.join(ROOT, 'supabase/functions/verify-share-otp/index.ts');
const START_SIGNATURE_WORKFLOW_FILE = path.join(ROOT, 'supabase/functions/start-signature-workflow/index.ts');
const SEND_SIGNER_OTP_FILE = path.join(ROOT, 'supabase/functions/send-signer-otp/index.ts');
const VERIFY_SIGNER_OTP_FILE = path.join(ROOT, 'supabase/functions/verify-signer-otp/index.ts');
const APPLY_SIGNER_SIGNATURE_FILE = path.join(ROOT, 'supabase/functions/apply-signer-signature/index.ts');
const PREBETA_FIRE_DRILL_FILE = path.join(ROOT, 'scripts/diagnostics/prebeta_fire_drill.sh');

test('canonical path complete milestone doc must exist with share/otp/flow scope', async () => {
  const content = await fs.readFile(MILESTONE_DOC, 'utf8');

  expect(content).toContain('Canonical Path Complete Sealed (Milestone)');
  expect(content).toContain('Share path');
  expect(content).toContain('Signature OTP path');
  expect(content).toContain('Share OTP one-time');
  expect(content).toContain('workflow.document_entity_id');
  expect(content).toContain('Criterio de aceptación');
});

test('share path must enforce canonical entity id and one-time OTP claim', async () => {
  const [schemas, generateLink, verifyAccess, acceptShareNda, getShareMetadata, verifyShareOtp] =
    await Promise.all([
      fs.readFile(SHARED_SCHEMAS_FILE, 'utf8'),
      fs.readFile(GENERATE_LINK_FILE, 'utf8'),
      fs.readFile(VERIFY_ACCESS_FILE, 'utf8'),
      fs.readFile(ACCEPT_SHARE_NDA_FILE, 'utf8'),
      fs.readFile(GET_SHARE_METADATA_FILE, 'utf8'),
      fs.readFile(VERIFY_SHARE_OTP_FILE, 'utf8'),
    ]);

  expect(schemas).toContain('GenerateLinkSchema');
  expect(schemas).toContain('document_entity_id: z.string().uuid()');
  expect(schemas).toContain('VerifyAccessSchema');

  expect(generateLink).toContain('document_entity_id');
  expect(generateLink).toContain('appendEvent(');

  expect(verifyAccess).toContain('legacy_link_missing_document_entity_id');
  expect(verifyAccess).toContain('legacy_link_missing_recipient_id');
  expect(verifyAccess).toContain('document_entity_id: documentEntityId');

  expect(acceptShareNda).toContain('document_entity_id');
  expect(acceptShareNda).toContain("kind: 'nda.accepted'");

  expect(getShareMetadata).toContain('missing_document_entity_id');
  expect(getShareMetadata).toContain('document_entity_id');

  expect(verifyShareOtp).toContain("status: 'accessed'");
  expect(verifyShareOtp).toContain(".eq('status', 'pending')");
  expect(verifyShareOtp).toContain('share_claim_failed');
  expect(verifyShareOtp).toContain("kind: 'otp.verified'");
});

test('signature otp flow must stay bound to document_entity_id and canonical otp events', async () => {
  const [startWorkflow, sendOtp, verifyOtp, applySignature] = await Promise.all([
    fs.readFile(START_SIGNATURE_WORKFLOW_FILE, 'utf8'),
    fs.readFile(SEND_SIGNER_OTP_FILE, 'utf8'),
    fs.readFile(VERIFY_SIGNER_OTP_FILE, 'utf8'),
    fs.readFile(APPLY_SIGNER_SIGNATURE_FILE, 'utf8'),
  ]);

  expect(startWorkflow).toContain('missing_document_entity_id');
  expect(startWorkflow).toContain(".eq('document_entity_id', workflow.document_entity_id)");

  expect(sendOtp).toContain('validateSignerAccessToken');
  expect(sendOtp).toContain('appendCanonicalEvent(');
  expect(sendOtp).toContain("event_type: 'otp.sent'");

  expect(verifyOtp).toContain('validateSignerAccessToken');
  expect(verifyOtp).toContain("kind: 'otp.verified'");
  expect(verifyOtp).toContain('appendCanonicalEvent(');
  expect(verifyOtp).toContain("event_type: 'otp.verified'");

  expect(applySignature).toContain('missing_document_entity_id');
  expect(applySignature).toContain(".eq('document_entity_id', workflow.document_entity_id)");
  expect(applySignature).toContain('ready_to_sign');
});

test('prebeta fire drill must include canonical path complete sealed guard', async () => {
  const content = await fs.readFile(PREBETA_FIRE_DRILL_FILE, 'utf8');
  expect(content).toContain('Canonical path complete sealed guard');
  expect(content).toContain('tests/authority/canonical_path_complete_sealed_guard.test.ts');
});
