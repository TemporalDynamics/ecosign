import { describe, it } from 'https://deno.land/std@0.208.0/testing/bdd.ts';
import { expect } from 'https://deno.land/x/expect@v0.4.0/mod.ts';
import {
  shouldConfirmIdentity,
  type ConfirmIdentityInput,
} from '../src/decisions/confirmIdentity.ts';

describe('D11 - shouldConfirmIdentity', () => {
  // Test 1: Happy path - Primera confirmación
  it('should return true for first-time identity confirmation', () => {
    const input: ConfirmIdentityInput = {
      signer: {
        id: 'signer-uuid-123',
        email: 'test@example.com',
        name: null,
        status: 'invited',
        workflow_id: 'workflow-uuid-456',
      },
      identity: {
        firstName: 'Juan',
        lastName: 'Pérez',
        confirmedRecipient: true,
        acceptedLogging: true,
      },
    };

    expect(shouldConfirmIdentity(input)).toBe(true);
  });

  // Test 2: firstName vacío
  it('should return false when firstName is empty', () => {
    const input: ConfirmIdentityInput = {
      signer: {
        id: 'signer-uuid-123',
        email: 'test@example.com',
        name: null,
        status: 'invited',
        workflow_id: 'workflow-uuid-456',
      },
      identity: {
        firstName: '',
        lastName: 'Pérez',
        confirmedRecipient: true,
        acceptedLogging: true,
      },
    };

    expect(shouldConfirmIdentity(input)).toBe(false);
  });

  // Test 3: lastName vacío
  it('should return false when lastName is empty', () => {
    const input: ConfirmIdentityInput = {
      signer: {
        id: 'signer-uuid-123',
        email: 'test@example.com',
        name: null,
        status: 'invited',
        workflow_id: 'workflow-uuid-456',
      },
      identity: {
        firstName: 'Juan',
        lastName: '',
        confirmedRecipient: true,
        acceptedLogging: true,
      },
    };

    expect(shouldConfirmIdentity(input)).toBe(false);
  });

  // Test 4: confirmedRecipient = false
  it('should return false when confirmedRecipient is false', () => {
    const input: ConfirmIdentityInput = {
      signer: {
        id: 'signer-uuid-123',
        email: 'test@example.com',
        name: null,
        status: 'invited',
        workflow_id: 'workflow-uuid-456',
      },
      identity: {
        firstName: 'Juan',
        lastName: 'Pérez',
        confirmedRecipient: false,
        acceptedLogging: true,
      },
    };

    expect(shouldConfirmIdentity(input)).toBe(false);
  });

  // Test 5: acceptedLogging = false
  it('should return false when acceptedLogging is false', () => {
    const input: ConfirmIdentityInput = {
      signer: {
        id: 'signer-uuid-123',
        email: 'test@example.com',
        name: null,
        status: 'invited',
        workflow_id: 'workflow-uuid-456',
      },
      identity: {
        firstName: 'Juan',
        lastName: 'Pérez',
        confirmedRecipient: true,
        acceptedLogging: false,
      },
    };

    expect(shouldConfirmIdentity(input)).toBe(false);
  });

  // Test 6: Signer ya firmó (terminal)
  it('should return false when signer already signed', () => {
    const input: ConfirmIdentityInput = {
      signer: {
        id: 'signer-uuid-123',
        email: 'test@example.com',
        name: null,
        status: 'signed',
        workflow_id: 'workflow-uuid-456',
      },
      identity: {
        firstName: 'Juan',
        lastName: 'Pérez',
        confirmedRecipient: true,
        acceptedLogging: true,
      },
    };

    expect(shouldConfirmIdentity(input)).toBe(false);
  });

  // Test 7: Ya confirmado previamente
  it('should return false when identity already confirmed', () => {
    const input: ConfirmIdentityInput = {
      signer: {
        id: 'signer-uuid-123',
        email: 'test@example.com',
        name: 'Juan Pérez',
        status: 'ready_to_sign',
        workflow_id: 'workflow-uuid-456',
      },
      identity: {
        firstName: 'Juan',
        lastName: 'Pérez',
        confirmedRecipient: true,
        acceptedLogging: true,
      },
    };

    expect(shouldConfirmIdentity(input)).toBe(false);
  });

  // Test 8: Signer inexistente
  it('should return false when signer does not exist', () => {
    const input: ConfirmIdentityInput = {
      signer: null,
      identity: {
        firstName: 'Juan',
        lastName: 'Pérez',
        confirmedRecipient: true,
        acceptedLogging: true,
      },
    };

    expect(shouldConfirmIdentity(input)).toBe(false);
  });

  // Test 9: Whitespace en nombres
  it('should accept names with whitespace (trimmed)', () => {
    const input: ConfirmIdentityInput = {
      signer: {
        id: 'signer-uuid-123',
        email: 'test@example.com',
        name: null,
        status: 'invited',
        workflow_id: 'workflow-uuid-456',
      },
      identity: {
        firstName: '  Juan  ',
        lastName: '  Pérez  ',
        confirmedRecipient: true,
        acceptedLogging: true,
      },
    };

    expect(shouldConfirmIdentity(input)).toBe(true);
  });

  // Bonus test: Signer rejected (terminal)
  it('should return false when signer is rejected', () => {
    const input: ConfirmIdentityInput = {
      signer: {
        id: 'signer-uuid-123',
        email: 'test@example.com',
        name: null,
        status: 'rejected',
        workflow_id: 'workflow-uuid-456',
      },
      identity: {
        firstName: 'Juan',
        lastName: 'Pérez',
        confirmedRecipient: true,
        acceptedLogging: true,
      },
    };

    expect(shouldConfirmIdentity(input)).toBe(false);
  });

  // Bonus test: Signer cancelled (terminal)
  it('should return false when signer is cancelled', () => {
    const input: ConfirmIdentityInput = {
      signer: {
        id: 'signer-uuid-123',
        email: 'test@example.com',
        name: null,
        status: 'cancelled',
        workflow_id: 'workflow-uuid-456',
      },
      identity: {
        firstName: 'Juan',
        lastName: 'Pérez',
        confirmedRecipient: true,
        acceptedLogging: true,
      },
    };

    expect(shouldConfirmIdentity(input)).toBe(false);
  });

  // Bonus test: ready_to_sign puede confirmar
  it('should return true when signer is ready_to_sign and not confirmed', () => {
    const input: ConfirmIdentityInput = {
      signer: {
        id: 'signer-uuid-123',
        email: 'test@example.com',
        name: null,
        status: 'ready_to_sign',
        workflow_id: 'workflow-uuid-456',
      },
      identity: {
        firstName: 'Juan',
        lastName: 'Pérez',
        confirmedRecipient: true,
        acceptedLogging: true,
      },
    };

    expect(shouldConfirmIdentity(input)).toBe(true);
  });

  // Bonus test: Solo whitespace en firstName
  it('should return false when firstName is only whitespace', () => {
    const input: ConfirmIdentityInput = {
      signer: {
        id: 'signer-uuid-123',
        email: 'test@example.com',
        name: null,
        status: 'invited',
        workflow_id: 'workflow-uuid-456',
      },
      identity: {
        firstName: '   ',
        lastName: 'Pérez',
        confirmedRecipient: true,
        acceptedLogging: true,
      },
    };

    expect(shouldConfirmIdentity(input)).toBe(false);
  });
});
