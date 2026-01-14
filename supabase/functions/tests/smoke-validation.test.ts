import { assert } from 'https://deno.land/std@0.204.0/assert/mod.ts';
import {
  AcceptNdaSchema,
  GenerateLinkSchema,
  VerifyAccessSchema,
} from '../_shared/schemas.ts';

Deno.test('generate-link schema: happy path and invalid payload', () => {
  const happy = GenerateLinkSchema.safeParse({
    document_id: '11111111-1111-1111-1111-111111111111',
    recipient_email: 'tester@example.com',
    expires_in_hours: 24,
    require_nda: true,
  });
  assert(happy.success);

  const invalid = GenerateLinkSchema.safeParse({
    recipient_email: 'tester@example.com',
  });
  assert(!invalid.success);
});

Deno.test('accept-nda schema: happy path and invalid email', () => {
  const happy = AcceptNdaSchema.safeParse({
    token: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    signer_name: 'Test User',
    signer_email: 'signer@example.com',
    nda_version: '1.0',
  });
  assert(happy.success);

  const invalid = AcceptNdaSchema.safeParse({
    token: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    signer_name: 'Test User',
    signer_email: 'not-an-email',
  });
  assert(!invalid.success);
});

Deno.test('verify-access schema: invalid token', () => {
  const invalid = VerifyAccessSchema.safeParse({
    token: 'bad-token',
  });
  assert(!invalid.success);
});
