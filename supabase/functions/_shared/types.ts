/**
 * Shared DTOs and canonical types for EcoSign workflows.
 * This file is the single source of truth for states and event types.
 */

// F0.1: Canonical Workflow States
// Mirrors the CHECK constraint in migration 20260112130000_workflow_states_v2.sql
export const WORKFLOW_STATUSES = [
  'draft',
  'ready',
  'active',
  'completed',
  'cancelled',
  'rejected',
  'archived',
] as const;

export type WorkflowStatus = typeof WORKFLOW_STATUSES[number];

// F0.1: Canonical Signer States
// Mirrors the CHECK constraint in migration 20260112130000_workflow_states_v2.sql
export const SIGNER_STATUSES = [
  'created',
  'invited',
  'accessed',
  'verified',
  'ready_to_sign',
  'signed',
  'cancelled',
  'rejected',
  'expired',
] as const;

export type SignerStatus = typeof SIGNER_STATUSES[number];

// ... (resto del archivo)

// F0.3: Delivery Mode
export const DELIVERY_MODES = ['email', 'link'] as const;
export type DeliveryMode = typeof DELIVERY_MODES[number];

// F0.1: Canonical Event Types
// Mirrors the Set in _shared/canonicalEventHelper.ts
export const CANONICAL_EVENT_TYPES = [
  'workflow.created',
  'workflow.activated',
  'workflow.completed',
  'workflow.cancelled',
  'signer.invited',
  'signer.accessed',
  'signer.identity_confirmed',
  'signer.ready_to_sign',
  'signer.signed',
  'signer.cancelled',
  'signer.rejected',
  'otp.sent',
  'otp.verified',
  'document.change_requested',
  'document.change_resolved',
  'document.decrypted',
  'signature.applied',
  'signature.capture.consent',
  'fields.schema.committed',
  'signature.state.committed',
  'eco.snapshot.issued',
  'notification.skipped', // Added for F0.3 observability
  'token.expired',        // Added for F0.4 lifecycle
  'token.revoked',        // Added for F0.4 lifecycle
  'token.reissued',       // Added for F0.4 lifecycle
] as const;

export type CanonicalEventType = typeof CANONICAL_EVENT_TYPES[number];

// P2.2: Signature Instances and Application Events
export interface SignatureInstance {
  id: string;
  workflow_id: string;
  document_entity_id: string;
  batch_id: string;
  signer_id: string;
  signature_payload: {
    strokes?: unknown;
    vector?: unknown;
    crypto_proof?: unknown;
    metadata?: Record<string, unknown>;
  };
  created_at: string;
}

export interface SignatureApplicationEvent {
  id: string;
  workflow_id: string;
  signature_instance_id: string;
  field_id: string;
  applied_at: string;
}
