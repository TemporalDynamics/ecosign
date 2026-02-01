import { validateEventAppend } from '../../packages/authority/src/validateEventAppend.ts';
import { describe, expect, test } from 'vitest';

const baseDocument = { id: 'doc-1', events: [] };

describe('validateEventAppend', () => {
  test('accepts tsa.confirmed with witness_hash and token', () => {
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

  test('rejects tsa.confirmed without witness_hash', () => {
    const result = validateEventAppend(baseDocument, {
      kind: 'tsa.confirmed',
      at: new Date().toISOString(),
      payload: {
        token_b64: 'dGVzdA==',
      },
    }, { mode: 'strict' });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('event_witness_hash_required');
  });

  test('rejects tsa.confirmed without token_b64', () => {
    const result = validateEventAppend(baseDocument, {
      kind: 'tsa.confirmed',
      at: new Date().toISOString(),
      payload: {
        witness_hash: 'abc',
      },
    }, { mode: 'strict' });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('event_tsa_token_required');
  });

  test('rejects duplicate tsa when existing TSA present', () => {
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
    expect(result.reason).toBe('event_kind_duplicate');
  });
});
