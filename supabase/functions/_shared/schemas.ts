import { z } from 'https://esm.sh/zod@3.23.8';

export const VerifyAccessSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid token format'),
  event_type: z.enum(['view', 'download', 'forward']).optional(),
});

export const GenerateLinkSchema = z.object({
  document_id: z.string().uuid().optional(),
  document_entity_id: z.string().uuid().optional(),
  recipient_email: z.string().email(),
  expires_in_hours: z.coerce.number().int().min(1).max(720).optional(),
  require_nda: z.boolean().optional(),
  nda_text: z.string().max(10000).nullable().optional(),
}).refine(
  (data) => Boolean(data.document_id || data.document_entity_id),
  { message: 'document_id or document_entity_id is required', path: ['document_id'] }
);

export const CreateSignerLinkSchema = z.object({
  documentId: z.string().uuid().optional(),
  documentEntityId: z.string().uuid().optional(),
  signerEmail: z.string().email(),
  signerName: z.string().min(1).max(200).optional(),
}).refine(
  (data) => Boolean(data.documentId || data.documentEntityId),
  { message: 'documentId or documentEntityId is required', path: ['documentId'] }
);

export const AcceptNdaSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid token format'),
  signer_name: z.string().min(1).max(200),
  signer_email: z.string().email(),
  nda_version: z.string().max(50).optional(),
  browser_fingerprint: z.string().max(256).optional(),
});

export const AcceptInviteNdaSchema = z.object({
  token: z.string().min(1).max(200),
  accepted: z.literal(true),
});

export const AcceptShareNdaSchema = z.object({
  share_id: z.string().uuid(),
  signer_email: z.string().email(),
  signer_name: z.string().min(1).max(200).optional(),
  browser_fingerprint: z.string().max(256).optional(),
});

export const AcceptWorkflowNdaSchema = z.object({
  signer_id: z.string().uuid(),
  signer_email: z.string().email(),
  nda_version: z.string().max(50).optional(),
});
