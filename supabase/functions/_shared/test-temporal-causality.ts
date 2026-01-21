// Test para validar la causalidad temporal en hasAnchorConfirmed
// Este archivo es solo para pruebas de validación

import { hasAnchorConfirmed } from './protectDocumentV2PipelineDecision.ts';

// Test para verificar que anchor con confirmed_at < at no se considere confirmado
function testTemporalCausality() {
  console.log('Testing temporal causality...');

  // Evento anchor con confirmed_at < at (rompe causalidad)
  const eventsWithInvalidCausality = [
    {
      kind: 'anchor',
      at: '2026-01-21T12:10:00.000Z', // 12:10:00
      anchor: {
        network: 'polygon',
        witness_hash: 'test',
        txid: '0x123456789',
        confirmed_at: '2026-01-21T11:00:00.000Z', // 11:00:00 (antes de at!)
      }
    }
  ];

  // Evento anchor con confirmed_at >= at (cumple causalidad)
  const eventsWithValidCausality = [
    {
      kind: 'anchor',
      at: '2026-01-21T12:10:00.000Z', // 12:10:00
      anchor: {
        network: 'polygon',
        witness_hash: 'test',
        txid: '0x123456789',
        confirmed_at: '2026-01-21T12:10:00.000Z', // 12:10:00 (igual a at)
      }
    },
    {
      kind: 'anchor',
      at: '2026-01-21T12:10:00.000Z', // 12:10:00
      anchor: {
        network: 'bitcoin',
        witness_hash: 'test',
        txid: '0x987654321',
        confirmed_at: '2026-01-21T12:15:00.000Z', // 12:15:00 (después de at)
      }
    }
  ];

  // Test 1: anchor con confirmed_at < at NO debería contar como confirmado
  const resultInvalid = hasAnchorConfirmed(eventsWithInvalidCausality, 'polygon');
  console.log('Anchor with invalid causality result:', resultInvalid);
  if (!resultInvalid) {
    console.log('✅ Correctly rejected anchor with invalid temporal causality');
  } else {
    console.log('❌ Incorrectly accepted anchor with invalid temporal causality');
  }

  // Test 2: anchor con confirmed_at >= at SÍ debería contar como confirmado
  const resultValid = hasAnchorConfirmed(eventsWithValidCausality, 'polygon');
  console.log('Anchor with valid causality (equal) result:', resultValid);
  if (resultValid) {
    console.log('✅ Correctly accepted anchor with valid temporal causality (equal)');
  } else {
    console.log('❌ Incorrectly rejected anchor with valid temporal causality (equal)');
  }

  // Test 3: anchor con confirmed_at > at SÍ debería contar como confirmado
  const resultValidGreater = hasAnchorConfirmed(eventsWithValidCausality, 'bitcoin');
  console.log('Anchor with valid causality (greater) result:', resultValidGreater);
  if (resultValidGreater) {
    console.log('✅ Correctly accepted anchor with valid temporal causality (greater)');
  } else {
    console.log('❌ Incorrectly rejected anchor with valid temporal causality (greater)');
  }

  console.log('Temporal causality tests completed.');
}

// Ejecutar el test si este archivo es el módulo principal
if (import.meta.main) {
  testTemporalCausality();
}