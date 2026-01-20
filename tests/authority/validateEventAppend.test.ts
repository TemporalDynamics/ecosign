import { validateEventAppend } from '../../packages/authority/src/validateEventAppend.ts';

const baseDocument = { id: 'doc-1', events: [] };

Deno.test('validateEventAppend: accepts tsa.confirmed with witness_hash and token', () => {
  const result = validateEventAppend(baseDocument, {
    kind: 'tsa.confirmed',
    at: new Date().toISOString(),
    payload: {
      witness_hash: 'abc',
      token_b64: 'dGVzdA==',
    },
  }, { mode: 'strict' });

  if (!result.ok) {
    throw new Error('Expected ok result');
  }
});

Deno.test('validateEventAppend: rejects tsa.confirmed without witness_hash', () => {
  const result = validateEventAppend(baseDocument, {
    kind: 'tsa.confirmed',
    at: new Date().toISOString(),
    payload: {
      token_b64: 'dGVzdA==',
    },
  }, { mode: 'strict' });

  if (result.ok || result.reason !== 'event_witness_hash_required') {
    throw new Error(`Expected event_witness_hash_required, got ${JSON.stringify(result)}`);
  }
});

Deno.test('validateEventAppend: rejects tsa.confirmed without token_b64', () => {
  const result = validateEventAppend(baseDocument, {
    kind: 'tsa.confirmed',
    at: new Date().toISOString(),
    payload: {
      witness_hash: 'abc',
    },
  }, { mode: 'strict' });

  if (result.ok || result.reason !== 'event_tsa_token_required') {
    throw new Error(`Expected event_tsa_token_required, got ${JSON.stringify(result)}`);
  }
});

Deno.test('validateEventAppend: rejects duplicate tsa when existing TSA present', () => {
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

  if (result.ok || result.reason !== 'event_kind_duplicate') {
    throw new Error(`Expected event_kind_duplicate, got ${JSON.stringify(result)}`);
  }
});
