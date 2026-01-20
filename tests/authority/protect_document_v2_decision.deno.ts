import { decideProtectDocumentV2 } from '../../supabase/functions/_shared/protectDocumentV2Decision.ts';

Deno.test('protect_document_v2: noop when request missing', () => {
  const decision = decideProtectDocumentV2([]);
  if (decision !== 'noop_missing_request') {
    throw new Error(`Expected noop_missing_request, got ${decision}`);
  }
});

Deno.test('protect_document_v2: run_tsa when request present and no tsa', () => {
  const decision = decideProtectDocumentV2([{ kind: 'document.protected.requested' }]);
  if (decision !== 'run_tsa') {
    throw new Error(`Expected run_tsa, got ${decision}`);
  }
});

Deno.test('protect_document_v2: noop when tsa.confirmed exists', () => {
  const decision = decideProtectDocumentV2([
    { kind: 'document.protected.requested' },
    { kind: 'tsa.confirmed' },
  ]);
  if (decision !== 'noop_already_tsa') {
    throw new Error(`Expected noop_already_tsa, got ${decision}`);
  }
});
