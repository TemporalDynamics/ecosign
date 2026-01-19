import { describe, expect, it } from 'vitest';
import { validateEventAppend } from '../../packages/authority/src/validateEventAppend';

describe('validateEventAppend', () => {
  const baseDocument = { id: 'doc-1', events: [] };

  it('accepts tsa.confirmed with witness_hash and token in payload', () => {
    const result = validateEventAppend(baseDocument, {
      kind: 'tsa.confirmed',
      at: new Date().toISOString(),
      payload: {
        witness_hash: 'abc',
        token_b64: 'dGVzdA==',
      },
    }, { mode: 'strict' });

    expect(result.ok).toBe(true);
  });

  it('rejects tsa.confirmed without witness_hash', () => {
    const result = validateEventAppend(baseDocument, {
      kind: 'tsa.confirmed',
      at: new Date().toISOString(),
      payload: {
        token_b64: 'dGVzdA==',
      },
    }, { mode: 'strict' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('event_witness_hash_required');
    }
  });

  it('rejects tsa.confirmed without token_b64', () => {
    const result = validateEventAppend(baseDocument, {
      kind: 'tsa.confirmed',
      at: new Date().toISOString(),
      payload: {
        witness_hash: 'abc',
      },
    }, { mode: 'strict' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('event_tsa_token_required');
    }
  });

  it('rejects duplicate tsa when existing TSA present', () => {
    const documentWithTsa = {
      id: 'doc-1',
      events: [{ kind: 'tsa' }],
    };
    const result = validateEventAppend(documentWithTsa, {
      kind: 'tsa.confirmed',
      at: new Date().toISOString(),
      payload: {
        witness_hash: 'abc',
        token_b64: 'dGVzdA==',
      },
    }, { mode: 'strict' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('event_kind_duplicate');
    }
  });
});
