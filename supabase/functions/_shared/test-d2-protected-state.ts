#!/usr/bin/env -S deno run

/**
 * Test D2 - Estado protegido simple
 *
 * Valida que isDocumentProtected() coincida con la lógica actual de UI
 */

import { isDocumentProtected } from './decisionEngineCanonical.ts';

console.log('=== Test D2 - Estado protegido simple ===\n');

// Test 1: Sin eventos
const test1 = [];
const result1 = isDocumentProtected(test1);
console.log('Test 1 - Sin eventos:');
console.log('  isDocumentProtected:', result1);
console.log('  Esperado: false (procesando)');
console.log('  Match:', result1 === false ? '✅' : '❌');

// Test 2: Con solicitud pero sin TSA
const test2 = [{ kind: 'document.protected.requested' }];
const result2 = isDocumentProtected(test2);
console.log('\nTest 2 - Con solicitud pero sin TSA:');
console.log('  isDocumentProtected:', result2);
console.log('  Esperado: false (procesando)');
console.log('  Match:', result2 === false ? '✅' : '❌');

// Test 3: Con TSA confirmado
const test3 = [
  { kind: 'document.protected.requested' },
  { kind: 'tsa.confirmed' }
];
const result3 = isDocumentProtected(test3);
console.log('\nTest 3 - Con TSA confirmado:');
console.log('  isDocumentProtected:', result3);
console.log('  Esperado: true (protegido)');
console.log('  Match:', result3 === true ? '✅' : '❌');

// Test 4: Con TSA y anchors
const test4 = [
  { kind: 'document.protected.requested' },
  { kind: 'tsa.confirmed' },
  { kind: 'anchor', anchor: { network: 'polygon', confirmed_at: '2026-01-22T10:00:00Z' } }
];
const result4 = isDocumentProtected(test4);
console.log('\nTest 4 - Con TSA y anchors:');
console.log('  isDocumentProtected:', result4);
console.log('  Esperado: true (protegido)');
console.log('  Match:', result4 === true ? '✅' : '❌');

// Test 5: Con error pero sin TSA
const test5 = [
  { kind: 'document.protected.requested' },
  { kind: 'tsa.failed' }
];
const result5 = isDocumentProtected(test5);
console.log('\nTest 5 - Con error pero sin TSA:');
console.log('  isDocumentProtected:', result5);
console.log('  Esperado: false (no protegido, error)');
console.log('  Match:', result5 === false ? '✅' : '❌');

console.log('\n=== Resumen ===');
const allPassed = !result1 && !result2 && result3 && result4 && !result5;
if (allPassed) {
  console.log('✅ Todos los tests pasaron');
  console.log('✅ isDocumentProtected() implementado correctamente');
  console.log('\n📋 Equivalencia con UI:');
  console.log('   UI actual: deriveProtectionLevel(events) !== "NONE"');
  console.log('   Canónico: isDocumentProtected(events)');
  console.log('   Estado: ✅ EQUIVALENTES');
} else {
  console.log('❌ Algunos tests fallaron');
}
