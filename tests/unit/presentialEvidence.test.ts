import { describe, expect, test } from 'vitest';
import { getLatestPresenceClosedSummary } from '../../client/src/lib/verifier/presentialEvidence';

describe('presentialEvidence parser', () => {
  test('returns null when no close event exists', () => {
    const summary = getLatestPresenceClosedSummary([
      { kind: 'signature.completed', at: '2026-03-01T10:00:00.000Z' },
    ]);

    expect(summary).toBeNull();
  });

  test('extracts trenza strands and embedded acta payload', () => {
    const summary = getLatestPresenceClosedSummary([
      {
        kind: 'identity.session.presence.closed',
        at: '2026-03-01T10:30:00.000Z',
        payload: {
          acta_hash:
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          closed_at: '2026-03-01T10:30:00.000Z',
          trenza: {
            status: 'strong',
            confirmed_strands: 3,
            required_strands: 3,
            strands: {
              signer: { required: true, ok: true },
              witness: { required: true, ok: true },
              ecosign: { required: true, ok: true, reason: null },
            },
          },
          timestamp_evidence: {
            tsa: 'confirmed',
            tsa_provider: 'freetsa',
            tsa_token_hash:
              'abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          },
          acta_payload: {
            version: 'ecosign.nonrep.acta.v1',
            session: { session_id: 'PSV-AAAAAA' },
          },
        },
      },
    ]);

    expect(summary).not.toBeNull();
    expect(summary?.trenzaStatus).toBe('strong');
    expect(summary?.confirmedStrands).toBe(3);
    expect(summary?.requiredStrands).toBe(3);
    expect(summary?.strands).toHaveLength(3);
    expect(summary?.strands[0]).toMatchObject({ key: 'signer', ok: true, required: true });
    expect(summary?.actaPayload).toMatchObject({ version: 'ecosign.nonrep.acta.v1' });
    expect(summary?.tsaStatus).toBe('confirmed');
  });

  test('picks the latest close event by timestamp', () => {
    const summary = getLatestPresenceClosedSummary([
      {
        kind: 'identity.session.presence.closed',
        at: '2026-03-01T10:00:00.000Z',
        payload: { acta_hash: 'a'.repeat(64), trenza: { status: 'partial' } },
      },
      {
        kind: 'identity.session.presence.closed',
        at: '2026-03-01T11:00:00.000Z',
        payload: { acta_hash: 'b'.repeat(64), trenza: { status: 'strong' } },
      },
    ]);

    expect(summary?.actaHash).toBe('b'.repeat(64));
    expect(summary?.trenzaStatus).toBe('strong');
  });
});
