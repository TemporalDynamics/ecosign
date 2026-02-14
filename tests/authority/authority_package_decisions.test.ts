import { describe, expect, it } from 'vitest';

import { shouldNotifySignerLink } from '../../packages/authority/src/decisions/notifySignerLink';
import { shouldNotifySignatureCompleted } from '../../packages/authority/src/decisions/notifySignatureCompleted';
import { shouldNotifyWorkflowCompleted } from '../../packages/authority/src/decisions/notifyWorkflowCompleted';
import { shouldNotifyCreatorDetailed } from '../../packages/authority/src/decisions/notifyCreatorDetailed';
import { shouldCancelWorkflow } from '../../packages/authority/src/decisions/cancelWorkflow';
import { shouldRejectSignature } from '../../packages/authority/src/decisions/rejectSignature';
import { shouldConfirmIdentity } from '../../packages/authority/src/decisions/confirmIdentity';

describe('Authority package decisions (Vitest mirror)', () => {
  it('D5 notify signer link: only INSERT + valid status + no previous notification', () => {
    expect(
      shouldNotifySignerLink({
        operation: 'INSERT',
        signer_status: 'invited',
        signer_id: 's1',
        workflow_id: 'w1',
        has_previous_notification: false,
      })
    ).toBe(true);

    expect(
      shouldNotifySignerLink({
        operation: 'UPDATE',
        signer_status: 'invited',
        signer_id: 's1',
        workflow_id: 'w1',
        has_previous_notification: false,
      })
    ).toBe(false);

    expect(
      shouldNotifySignerLink({
        operation: 'INSERT',
        signer_status: 'signed',
        signer_id: 's1',
        workflow_id: 'w1',
        has_previous_notification: false,
      })
    ).toBe(false);
  });

  it('D6 notify signature completed: only UPDATE transition to signed', () => {
    expect(
      shouldNotifySignatureCompleted({
        operation: 'UPDATE',
        old_status: 'ready_to_sign',
        new_status: 'signed',
        signer_id: 's1',
        workflow_id: 'w1',
      })
    ).toBe(true);

    expect(
      shouldNotifySignatureCompleted({
        operation: 'UPDATE',
        old_status: 'signed',
        new_status: 'signed',
        signer_id: 's1',
        workflow_id: 'w1',
      })
    ).toBe(false);

    expect(
      shouldNotifySignatureCompleted({
        operation: 'INSERT',
        old_status: null,
        new_status: 'signed',
        signer_id: 's1',
        workflow_id: 'w1',
      })
    ).toBe(false);
  });

  it('D7 notify workflow completed: only UPDATE transition to completed', () => {
    expect(
      shouldNotifyWorkflowCompleted({
        operation: 'UPDATE',
        old_status: 'active',
        new_status: 'completed',
        workflow_id: 'w1',
      })
    ).toBe(true);

    expect(
      shouldNotifyWorkflowCompleted({
        operation: 'UPDATE',
        old_status: 'completed',
        new_status: 'completed',
        workflow_id: 'w1',
      })
    ).toBe(false);
  });

  it('D8 notify creator detailed: mirror of signed transition rule', () => {
    expect(
      shouldNotifyCreatorDetailed({
        operation: 'UPDATE',
        old_status: 'invited',
        new_status: 'signed',
        signer_id: 's1',
        workflow_id: 'w1',
      })
    ).toBe(true);

    expect(
      shouldNotifyCreatorDetailed({
        operation: 'UPDATE',
        old_status: 'signed',
        new_status: 'signed',
        signer_id: 's1',
        workflow_id: 'w1',
      })
    ).toBe(false);
  });

  it('D9 cancel workflow: only owner and ready/active states', () => {
    expect(
      shouldCancelWorkflow({
        actor_id: 'owner-1',
        workflow: { owner_id: 'owner-1', status: 'active' },
      })
    ).toBe(true);

    expect(
      shouldCancelWorkflow({
        actor_id: 'other',
        workflow: { owner_id: 'owner-1', status: 'active' },
      })
    ).toBe(false);

    expect(
      shouldCancelWorkflow({
        actor_id: 'owner-1',
        workflow: { owner_id: 'owner-1', status: 'completed' },
      })
    ).toBe(false);
  });

  it('D10 reject signature: signer/owner can reject while non-terminal', () => {
    expect(
      shouldRejectSignature({
        actor_id: 'signer@example.com',
        signer: {
          id: 's1',
          email: 'signer@example.com',
          status: 'ready_to_sign',
          workflow_id: 'w1',
        },
        workflow: { owner_id: 'owner-1', status: 'active' },
      })
    ).toBe(true);

    expect(
      shouldRejectSignature({
        actor_id: 'owner-1',
        signer: {
          id: 's1',
          email: 'signer@example.com',
          status: 'invited',
          workflow_id: 'w1',
        },
        workflow: { owner_id: 'owner-1', status: 'active' },
      })
    ).toBe(true);

    expect(
      shouldRejectSignature({
        actor_id: 'signer@example.com',
        signer: {
          id: 's1',
          email: 'signer@example.com',
          status: 'signed',
          workflow_id: 'w1',
        },
        workflow: { owner_id: 'owner-1', status: 'active' },
      })
    ).toBe(false);
  });

  it('D11 confirm identity: requires non-empty identity and non-terminal signer', () => {
    expect(
      shouldConfirmIdentity({
        signer: {
          id: 's1',
          email: 'signer@example.com',
          name: null,
          status: 'invited',
          workflow_id: 'w1',
        },
        identity: {
          firstName: 'Juan',
          lastName: 'Perez',
          confirmedRecipient: true,
          acceptedLogging: true,
        },
      })
    ).toBe(true);

    expect(
      shouldConfirmIdentity({
        signer: {
          id: 's1',
          email: 'signer@example.com',
          name: null,
          status: 'signed',
          workflow_id: 'w1',
        },
        identity: {
          firstName: 'Juan',
          lastName: 'Perez',
          confirmedRecipient: true,
          acceptedLogging: true,
        },
      })
    ).toBe(false);

    expect(
      shouldConfirmIdentity({
        signer: {
          id: 's1',
          email: 'signer@example.com',
          name: 'Juan Perez',
          status: 'ready_to_sign',
          workflow_id: 'w1',
        },
        identity: {
          firstName: 'Juan',
          lastName: 'Perez',
          confirmedRecipient: true,
          acceptedLogging: true,
        },
      })
    ).toBe(false);
  });
});
