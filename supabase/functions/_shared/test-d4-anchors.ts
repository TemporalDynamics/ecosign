#!/usr/bin/env -S deno run

/**
 * Test D4 - Decisiones de anchors (Polygon / Bitcoin)
 *
 * Valida que shouldEnqueuePolygon() y shouldEnqueueBitcoin()
 * coincidan con la lógica actual del executor
 */

import { shouldEnqueuePolygon, shouldEnqueueBitcoin } from './decisionEngineCanonical.ts';

console.log('=== Test D4 - Decisiones de anchors ===\n');

// Test 1: Sin TSA → no encolar nada
const test1Events = [{ kind: 'document.protected.requested' }];
const test1Protection = ['polygon', 'bitcoin'];
const poly1 = shouldEnqueuePolygon(test1Events, test1Protection);
const btc1 = shouldEnqueueBitcoin(test1Events, test1Protection);
console.log('Test 1 - Sin TSA:');
console.log('  shouldEnqueuePolygon:', poly1, '(esperado: false)');
console.log('  shouldEnqueueBitcoin:', btc1, '(esperado: false)');
console.log('  Match:', (!poly1 && !btc1) ? '✅' : '❌');

// Test 2: Con TSA, sin anchors, con protection
const test2Events = [
  { kind: 'document.protected.requested' },
  { kind: 'tsa.confirmed' }
];
const test2Protection = ['polygon', 'bitcoin'];
const poly2 = shouldEnqueuePolygon(test2Events, test2Protection);
const btc2 = shouldEnqueueBitcoin(test2Events, test2Protection);
console.log('\nTest 2 - Con TSA, sin anchors, ambos solicitados:');
console.log('  shouldEnqueuePolygon:', poly2, '(esperado: true)');
console.log('  shouldEnqueueBitcoin:', btc2, '(esperado: true)');
console.log('  Match:', (poly2 && btc2) ? '✅' : '❌');

// Test 3: Con TSA, solo polygon solicitado
const test3Events = [
  { kind: 'document.protected.requested' },
  { kind: 'tsa.confirmed' }
];
const test3Protection = ['polygon'];
const poly3 = shouldEnqueuePolygon(test3Events, test3Protection);
const btc3 = shouldEnqueueBitcoin(test3Events, test3Protection);
console.log('\nTest 3 - Con TSA, solo polygon solicitado:');
console.log('  shouldEnqueuePolygon:', poly3, '(esperado: true)');
console.log('  shouldEnqueueBitcoin:', btc3, '(esperado: false)');
console.log('  Match:', (poly3 && !btc3) ? '✅' : '❌');

// Test 4: Con TSA y polygon confirmado
const test4Events = [
  { kind: 'document.protected.requested' },
  { kind: 'tsa.confirmed' },
  {
    kind: 'anchor',
    at: '2026-01-22T10:00:00Z',
    anchor: {
      network: 'polygon',
      txid: '0x123',
      confirmed_at: '2026-01-22T10:00:00Z'
    }
  }
];
const test4Protection = ['polygon', 'bitcoin'];
const poly4 = shouldEnqueuePolygon(test4Events, test4Protection);
const btc4 = shouldEnqueueBitcoin(test4Events, test4Protection);
console.log('\nTest 4 - Con TSA y polygon confirmado:');
console.log('  shouldEnqueuePolygon:', poly4, '(esperado: false - ya confirmado)');
console.log('  shouldEnqueueBitcoin:', btc4, '(esperado: true - falta bitcoin)');
console.log('  Match:', (!poly4 && btc4) ? '✅' : '❌');

// Test 5: Con TSA y ambos anchors confirmados
const test5Events = [
  { kind: 'document.protected.requested' },
  { kind: 'tsa.confirmed' },
  {
    kind: 'anchor',
    at: '2026-01-22T10:00:00Z',
    anchor: {
      network: 'polygon',
      txid: '0x123',
      confirmed_at: '2026-01-22T10:00:00Z'
    }
  },
  {
    kind: 'anchor',
    at: '2026-01-22T10:05:00Z',
    anchor: {
      network: 'bitcoin',
      txid: 'abc123',
      confirmed_at: '2026-01-22T10:05:00Z'
    }
  }
];
const test5Protection = ['polygon', 'bitcoin'];
const poly5 = shouldEnqueuePolygon(test5Events, test5Protection);
const btc5 = shouldEnqueueBitcoin(test5Events, test5Protection);
console.log('\nTest 5 - Con TSA y ambos anchors confirmados:');
console.log('  shouldEnqueuePolygon:', poly5, '(esperado: false)');
console.log('  shouldEnqueueBitcoin:', btc5, '(esperado: false)');
console.log('  Match:', (!poly5 && !btc5) ? '✅' : '❌');

// Test 6: Causalidad temporal inválida (confirmed_at < at)
const test6Events = [
  { kind: 'document.protected.requested' },
  { kind: 'tsa.confirmed' },
  {
    kind: 'anchor',
    at: '2026-01-22T12:00:00Z',
    anchor: {
      network: 'polygon',
      txid: '0x123',
      confirmed_at: '2026-01-22T11:00:00Z'  // ANTES del evento (inválido)
    }
  }
];
const test6Protection = ['polygon'];
const poly6 = shouldEnqueuePolygon(test6Events, test6Protection);
console.log('\nTest 6 - Causalidad temporal inválida:');
console.log('  shouldEnqueuePolygon:', poly6, '(esperado: true - anchor inválido)');
console.log('  Match:', poly6 ? '✅' : '❌');

console.log('\n=== Resumen ===');
const allPassed =
  !poly1 && !btc1 &&
  poly2 && btc2 &&
  poly3 && !btc3 &&
  !poly4 && btc4 &&
  !poly5 && !btc5 &&
  poly6;

if (allPassed) {
  console.log('✅ Todos los tests pasaron');
  console.log('✅ shouldEnqueuePolygon() y shouldEnqueueBitcoin() correctas');
  console.log('\n📋 Listo para shadow mode en executor');
} else {
  console.log('❌ Algunos tests fallaron');
}
