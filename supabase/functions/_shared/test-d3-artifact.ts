#!/usr/bin/env -S deno run

/**
 * Test D3 - Decisión de artifact (build_artifact)
 *
 * Valida que shouldEnqueueArtifact() coincida con la lógica actual del executor
 */

import { shouldEnqueueArtifact } from './decisionEngineCanonical.ts';

console.log('=== Test D3 - Decisión de artifact ===\n');

// Test 1: Sin TSA → no encolar artifact
const test1Events = [{ kind: 'document.protected.requested' }];
const test1Protection = ['polygon', 'bitcoin'];
const result1 = shouldEnqueueArtifact(test1Events);
console.log('Test 1 - Sin TSA:');
console.log('  shouldEnqueueArtifact:', result1, '(esperado: false)');
console.log('  Match:', !result1 ? '✅' : '❌');

// Test 2: Con TSA pero sin anchors (aún pendientes)
const test2Events = [
  { kind: 'document.protected.requested' },
  { kind: 'tsa.confirmed' }
];
const test2Protection = ['polygon', 'bitcoin'];
const result2 = shouldEnqueueArtifact(test2Events);
console.log('\nTest 2 - Con TSA pero sin anchors:');
console.log('  shouldEnqueueArtifact:', result2, '(esperado: false - faltan anchors)');
console.log('  Match:', !result2 ? '✅' : '❌');

// Test 3: Con TSA y solo polygon confirmado (falta bitcoin)
const test3Events = [
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
const test3Protection = ['polygon', 'bitcoin'];
const result3 = shouldEnqueueArtifact(test3Events);
console.log('\nTest 3 - Con TSA y polygon, falta bitcoin:');
console.log('  shouldEnqueueArtifact:', result3, '(esperado: false - falta bitcoin)');
console.log('  Match:', !result3 ? '✅' : '❌');

// Test 4: Con TSA y TODOS los anchors solicitados
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
const test4Protection = ['polygon', 'bitcoin'];
const result4 = shouldEnqueueArtifact(test4Events);
console.log('\nTest 4 - Con TSA y TODOS los anchors solicitados:');
console.log('  shouldEnqueueArtifact:', result4, '(esperado: true - listo para artifact)');
console.log('  Match:', result4 ? '✅' : '❌');

// Test 5: Con TSA, solo polygon solicitado y confirmado
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
  }
];
const test5Protection = ['polygon'];  // Solo polygon
const result5 = shouldEnqueueArtifact(test5Events);
console.log('\nTest 5 - Con TSA y solo polygon (no se pidió bitcoin):');
console.log('  shouldEnqueueArtifact:', result5, '(esperado: true - listo)');
console.log('  Match:', result5 ? '✅' : '❌');

// Test 6: TSA-only (sin anchors solicitados)
const test6Events = [
  { kind: 'document.protected.requested' },
  { kind: 'tsa.confirmed' }
];
const test6Protection: string[] = [];  // Sin anchors
const result6 = shouldEnqueueArtifact(test6Events);
console.log('\nTest 6 - TSA-only (sin anchors solicitados):');
console.log('  shouldEnqueueArtifact:', result6, '(esperado: true - solo TSA)');
console.log('  Match:', result6 ? '✅' : '❌');

// Test 7: Con artifact ya finalizado (no regenerar)
const test7Events = [
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
  { kind: 'artifact.finalized', at: '2026-01-22T10:10:00Z' }
];
const test7Protection = ['polygon'];
const result7 = shouldEnqueueArtifact(test7Events);
console.log('\nTest 7 - Con artifact ya finalizado:');
console.log('  shouldEnqueueArtifact:', result7, '(esperado: false - ya existe)');
console.log('  Match:', !result7 ? '✅' : '❌');

console.log('\n=== Resumen ===');
const allPassed =
  !result1 &&  // Sin TSA
  !result2 &&  // TSA pero sin anchors
  !result3 &&  // Falta bitcoin
  result4 &&   // Todos los anchors
  result5 &&   // Solo polygon
  result6 &&   // TSA-only
  !result7;    // Ya existe artifact

if (allPassed) {
  console.log('✅ Todos los tests pasaron');
  console.log('✅ shouldEnqueueArtifact() implementado correctamente');
  console.log('\n📋 Listo para shadow mode en executor');
} else {
  console.log('❌ Algunos tests fallaron');
}
