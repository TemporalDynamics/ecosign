import { decideProtectDocumentV2 } from '../../supabase/functions/_shared/protectDocumentV2Decision.ts';
import { describe, expect, test } from 'vitest';

describe('protect_document_v2 decision', () => {
  test('noop when request missing', () => {
    const decision = decideProtectDocumentV2([]);
    expect(decision).toBe('noop_missing_request');
  });

  test('run_tsa when request present and no tsa', () => {
    const decision = decideProtectDocumentV2([{ kind: 'document.protected.requested' }]);
    expect(decision).toBe('run_tsa');
  });

  test('noop when tsa.confirmed exists', () => {
    const decision = decideProtectDocumentV2([
      { kind: 'document.protected.requested' },
      { kind: 'tsa.confirmed' },
    ]);
    expect(decision).toBe('noop_already_tsa');
  });
});
