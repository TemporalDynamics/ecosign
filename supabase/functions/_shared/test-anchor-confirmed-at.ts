// Test para verificar que anchor sin confirmed_at no cuente como confirmado
// Este archivo es solo para pruebas de validación

import { hasAnchorConfirmed } from './protectDocumentV2PipelineDecision.ts';

// Test para verificar que un evento anchor sin confirmed_at no se considere confirmado
function testAnchorWithoutConfirmedAt() {
  console.log('Testing anchor without confirmed_at...');

  // Evento anchor con network pero SIN confirmed_at
  const eventsWithoutConfirmedAt = [
    {
      kind: 'anchor',
      at: '2026-01-21T12:00:00.000Z',
      anchor: {
        network: 'polygon',
        witness_hash: 'test',
        txid: '0x123456789',
        // FALTA: confirmed_at
      }
    }
  ];

  // Evento anchor con network Y confirmed_at
  const eventsWithConfirmedAt = [
    {
      kind: 'anchor',
      at: '2026-01-21T12:00:00.000Z',
      anchor: {
        network: 'polygon',
        witness_hash: 'test',
        txid: '0x123456789',
        confirmed_at: '2026-01-21T12:00:00.000Z', // ESTÁ AQUÍ
      }
    }
  ];

  // Test 1: anchor sin confirmed_at NO debería contar como confirmado
  const resultWithout = hasAnchorConfirmed(eventsWithoutConfirmedAt, 'polygon');
  console.log('Anchor without confirmed_at result:', resultWithout);
  if (!resultWithout) {
    console.log('✅ Correctly rejected anchor without confirmed_at');
  } else {
    console.log('❌ Incorrectly accepted anchor without confirmed_at');
  }

  // Test 2: anchor con confirmed_at SÍ debería contar como confirmado
  const resultWith = hasAnchorConfirmed(eventsWithConfirmedAt, 'polygon');
  console.log('Anchor with confirmed_at result:', resultWith);
  if (resultWith) {
    console.log('✅ Correctly accepted anchor with confirmed_at');
  } else {
    console.log('❌ Incorrectly rejected anchor with confirmed_at');
  }

  console.log('Anchor confirmed_at tests completed.');
}

// Ejecutar el test si este archivo es el módulo principal
if (import.meta.main) {
  testAnchorWithoutConfirmedAt();
}