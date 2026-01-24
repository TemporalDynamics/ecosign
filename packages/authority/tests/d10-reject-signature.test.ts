import { describe, it } from 'https://deno.land/std@0.208.0/testing/bdd.ts';
import { expect } from 'https://deno.land/x/expect@v0.4.0/mod.ts';
import {
  shouldRejectSignature,
  type RejectSignatureInput,
} from '../src/decisions/rejectSignature.ts';

describe('D10 - shouldRejectSignature', () => {
  // Test 1: Happy path - Signer rechaza su propia firma
  it('should return true when signer rejects their own signature', () => {
    const input: RejectSignatureInput = {
      actor_id: 'signer@example.com',
      signer: {
        id: 'signer-uuid-123',
        email: 'signer@example.com',
        status: 'ready_to_sign',
        workflow_id: 'workflow-uuid-456',
      },
      workflow: {
        owner_id: 'owner-uuid-789',
        status: 'active',
      },
    };

    expect(shouldRejectSignature(input)).toBe(true);
  });

  // Test 2: Owner cancela a un signer
  it('should return true when owner cancels a signer', () => {
    const input: RejectSignatureInput = {
      actor_id: 'owner-uuid-789',
      signer: {
        id: 'signer-uuid-123',
        email: 'signer@example.com',
        status: 'invited',
        workflow_id: 'workflow-uuid-456',
      },
      workflow: {
        owner_id: 'owner-uuid-789',
        status: 'active',
      },
    };

    expect(shouldRejectSignature(input)).toBe(true);
  });

  // Test 3: Signer ya firmó (terminal)
  it('should return false when signer already signed', () => {
    const input: RejectSignatureInput = {
      actor_id: 'signer@example.com',
      signer: {
        id: 'signer-uuid-123',
        email: 'signer@example.com',
        status: 'signed',
        workflow_id: 'workflow-uuid-456',
      },
      workflow: {
        owner_id: 'owner-uuid-789',
        status: 'active',
      },
    };

    expect(shouldRejectSignature(input)).toBe(false);
  });

  // Test 4: Signer ya rechazado (idempotencia)
  it('should return false when signer already rejected', () => {
    const input: RejectSignatureInput = {
      actor_id: 'signer@example.com',
      signer: {
        id: 'signer-uuid-123',
        email: 'signer@example.com',
        status: 'rejected',
        workflow_id: 'workflow-uuid-456',
      },
      workflow: {
        owner_id: 'owner-uuid-789',
        status: 'active',
      },
    };

    expect(shouldRejectSignature(input)).toBe(false);
  });

  // Test 5: Workflow cancelado
  it('should return false when workflow is cancelled', () => {
    const input: RejectSignatureInput = {
      actor_id: 'signer@example.com',
      signer: {
        id: 'signer-uuid-123',
        email: 'signer@example.com',
        status: 'ready_to_sign',
        workflow_id: 'workflow-uuid-456',
      },
      workflow: {
        owner_id: 'owner-uuid-789',
        status: 'cancelled',
      },
    };

    expect(shouldRejectSignature(input)).toBe(false);
  });

  // Test 6: Actor no autorizado
  it('should return false when actor is not authorized', () => {
    const input: RejectSignatureInput = {
      actor_id: 'otro@example.com',
      signer: {
        id: 'signer-uuid-123',
        email: 'signer@example.com',
        status: 'ready_to_sign',
        workflow_id: 'workflow-uuid-456',
      },
      workflow: {
        owner_id: 'owner-uuid-789',
        status: 'active',
      },
    };

    expect(shouldRejectSignature(input)).toBe(false);
  });

  // Test 7: Signer inexistente
  it('should return false when signer does not exist', () => {
    const input: RejectSignatureInput = {
      actor_id: 'owner-uuid-789',
      signer: null,
      workflow: {
        owner_id: 'owner-uuid-789',
        status: 'active',
      },
    };

    expect(shouldRejectSignature(input)).toBe(false);
  });

  // Test 8: Workflow inexistente
  it('should return false when workflow does not exist', () => {
    const input: RejectSignatureInput = {
      actor_id: 'signer@example.com',
      signer: {
        id: 'signer-uuid-123',
        email: 'signer@example.com',
        status: 'ready_to_sign',
        workflow_id: 'workflow-uuid-456',
      },
      workflow: null,
    };

    expect(shouldRejectSignature(input)).toBe(false);
  });

  // Bonus test: Workflow en completed
  it('should return false when workflow is completed', () => {
    const input: RejectSignatureInput = {
      actor_id: 'signer@example.com',
      signer: {
        id: 'signer-uuid-123',
        email: 'signer@example.com',
        status: 'ready_to_sign',
        workflow_id: 'workflow-uuid-456',
      },
      workflow: {
        owner_id: 'owner-uuid-789',
        status: 'completed',
      },
    };

    expect(shouldRejectSignature(input)).toBe(false);
  });

  // Bonus test: Workflow en archived
  it('should return false when workflow is archived', () => {
    const input: RejectSignatureInput = {
      actor_id: 'signer@example.com',
      signer: {
        id: 'signer-uuid-123',
        email: 'signer@example.com',
        status: 'ready_to_sign',
        workflow_id: 'workflow-uuid-456',
      },
      workflow: {
        owner_id: 'owner-uuid-789',
        status: 'archived',
      },
    };

    expect(shouldRejectSignature(input)).toBe(false);
  });

  // Bonus test: Signer en estado 'awaiting' puede rechazar
  it('should return true when signer in awaiting status rejects', () => {
    const input: RejectSignatureInput = {
      actor_id: 'signer@example.com',
      signer: {
        id: 'signer-uuid-123',
        email: 'signer@example.com',
        status: 'awaiting',
        workflow_id: 'workflow-uuid-456',
      },
      workflow: {
        owner_id: 'owner-uuid-789',
        status: 'active',
      },
    };

    expect(shouldRejectSignature(input)).toBe(true);
  });

  // Bonus test: Actor no autenticado
  it('should return false when actor is not authenticated', () => {
    const input: RejectSignatureInput = {
      actor_id: null,
      signer: {
        id: 'signer-uuid-123',
        email: 'signer@example.com',
        status: 'ready_to_sign',
        workflow_id: 'workflow-uuid-456',
      },
      workflow: {
        owner_id: 'owner-uuid-789',
        status: 'active',
      },
    };

    expect(shouldRejectSignature(input)).toBe(false);
  });
});
