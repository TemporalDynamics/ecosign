// Test para validar el guardrail de autoridad de eventos
// Este archivo es solo para pruebas, no se usa en producción

import { appendEvent } from './eventHelper.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Este test verifica que solo funciones autorizadas puedan emitir eventos de evidencia fuerte
async function testAuthorityGuardrail() {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log('Testing authority guardrail...');

  // Test 1: Intentar emitir tsa.confirmed con fuente no autorizada
  const unauthorizedResult = await appendEvent(
    supabase,
    'test-document-id',
    {
      kind: 'tsa.confirmed',
      at: new Date().toISOString(),
      payload: { witness_hash: 'test', token_b64: 'test' }
    },
    'malicious-function' // Fuente no autorizada
  );

  console.log('Unauthorized source result:', unauthorizedResult);
  if (!unauthorizedResult.success) {
    console.log('✅ Guardrail correctly blocked unauthorized source');
  } else {
    console.log('❌ Guardrail failed - unauthorized source was allowed');
  }

  // Test 2: Intentar emitir tsa.confirmed con fuente autorizada
  const authorizedResult = await appendEvent(
    supabase,
    'test-document-id',
    {
      kind: 'tsa.confirmed',
      at: new Date().toISOString(),
      payload: { witness_hash: 'test', token_b64: 'test' }
    },
    'process-signature' // Fuente autorizada
  );

  console.log('Authorized source result:', authorizedResult);
  if (authorizedResult.success || authorizedResult.error?.includes('document_entity not found')) {
    console.log('✅ Authorized source was allowed (or failed for unrelated reason)');
  } else {
    console.log('❌ Authorized source was incorrectly blocked');
  }

  // Test 3: Intentar emitir anchor.submitted con fuente no autorizada
  const anchorUnauthorizedResult = await appendEvent(
    supabase,
    'test-document-id',
    {
      kind: 'anchor.submitted',
      at: new Date().toISOString(),
    },
    'random-function' // Fuente no autorizada
  );

  console.log('Anchor unauthorized source result:', anchorUnauthorizedResult);
  if (!anchorUnauthorizedResult.success) {
    console.log('✅ Guardrail correctly blocked unauthorized anchor source');
  } else {
    console.log('❌ Guardrail failed - unauthorized anchor source was allowed');
  }

  // Test 4: Intentar emitir evento sin _source (debería fallar para eventos protegidos)
  const noSourceResult = await appendEvent(
    supabase,
    'test-document-id',
    {
      kind: 'tsa.confirmed',
      at: new Date().toISOString(),
      payload: { witness_hash: 'test', token_b64: 'test' }
    },
    undefined // Sin source
  );

  console.log('No source result:', noSourceResult);
  if (!noSourceResult.success && noSourceResult.error?.includes('Missing _source')) {
    console.log('✅ Guardrail correctly blocked missing source for protected event');
  } else {
    console.log('❌ Guardrail failed - missing source was allowed for protected event');
  }

  // Test 5: Verificar que el error sea explícito
  if (!authorizedResult.success && authorizedResult.error) {
    console.log('Reason:', authorizedResult.error);
  }

  console.log('Authority guardrail tests completed.');
}

// Ejecutar el test si este archivo es el módulo principal
if (import.meta.main) {
  testAuthorityGuardrail().catch(console.error);
}