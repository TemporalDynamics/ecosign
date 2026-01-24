#!/usr/bin/env -S deno run

/**
 * Test D5 - Decisión: Notificar link de firma a signer
 *
 * Valida que shouldNotifySignerLink() tome la decisión correcta
 * en todos los escenarios de creación/actualización de signers.
 *
 * @see docs/migration/D5_NOTIFY_SIGNER_LINK.md
 */

import { shouldNotifySignerLink } from '../src/decisions/notifySignerLink.ts';

console.log('=== Test D5 - Decisión: Notify Signer Link ===\n');

// Test 1: INSERT + invited → true (happy path)
const result1 = shouldNotifySignerLink({
  operation: 'INSERT',
  signer_status: 'invited',
  signer_id: 'signer-001',
  workflow_id: 'workflow-abc',
  has_previous_notification: false,
});
console.log('Test 1 - INSERT + invited (nuevo signer):');
console.log('  shouldNotify:', result1, '(esperado: true)');
console.log('  Match:', result1 === true ? '✅' : '❌');

// Test 2: INSERT + ready_to_sign → true
const result2 = shouldNotifySignerLink({
  operation: 'INSERT',
  signer_status: 'ready_to_sign',
  signer_id: 'signer-002',
  workflow_id: 'workflow-abc',
  has_previous_notification: false,
});
console.log('\nTest 2 - INSERT + ready_to_sign:');
console.log('  shouldNotify:', result2, '(esperado: true)');
console.log('  Match:', result2 === true ? '✅' : '❌');

// Test 3: INSERT + signed → false (ya firmó)
const result3 = shouldNotifySignerLink({
  operation: 'INSERT',
  signer_status: 'signed',
  signer_id: 'signer-003',
  workflow_id: 'workflow-abc',
  has_previous_notification: false,
});
console.log('\nTest 3 - INSERT + signed (ya firmó):');
console.log('  shouldNotify:', result3, '(esperado: false)');
console.log('  Match:', result3 === false ? '✅' : '❌');

// Test 4: UPDATE → false (solo en INSERT)
const result4 = shouldNotifySignerLink({
  operation: 'UPDATE',
  signer_status: 'invited',
  signer_id: 'signer-004',
  workflow_id: 'workflow-abc',
  has_previous_notification: false,
});
console.log('\nTest 4 - UPDATE operation (no INSERT):');
console.log('  shouldNotify:', result4, '(esperado: false)');
console.log('  Match:', result4 === false ? '✅' : '❌');

// Test 5: INSERT + invited pero ya notificado → false (deduplicación)
const result5 = shouldNotifySignerLink({
  operation: 'INSERT',
  signer_status: 'invited',
  signer_id: 'signer-005',
  workflow_id: 'workflow-abc',
  has_previous_notification: true,
});
console.log('\nTest 5 - INSERT + invited pero ya notificado:');
console.log('  shouldNotify:', result5, '(esperado: false - deduplicación)');
console.log('  Match:', result5 === false ? '✅' : '❌');

// Test 6: INSERT + awaiting → false (no es su turno)
const result6 = shouldNotifySignerLink({
  operation: 'INSERT',
  signer_status: 'awaiting',
  signer_id: 'signer-006',
  workflow_id: 'workflow-abc',
  has_previous_notification: false,
});
console.log('\nTest 6 - INSERT + awaiting (no es su turno):');
console.log('  shouldNotify:', result6, '(esperado: false)');
console.log('  Match:', result6 === false ? '✅' : '❌');

// Test 7: INSERT + rejected → false (rechazó firma)
const result7 = shouldNotifySignerLink({
  operation: 'INSERT',
  signer_status: 'rejected',
  signer_id: 'signer-007',
  workflow_id: 'workflow-abc',
  has_previous_notification: false,
});
console.log('\nTest 7 - INSERT + rejected (rechazó):');
console.log('  shouldNotify:', result7, '(esperado: false)');
console.log('  Match:', result7 === false ? '✅' : '❌');

// Test 8: INSERT + pending (legacy) → false
const result8 = shouldNotifySignerLink({
  operation: 'INSERT',
  signer_status: 'pending',
  signer_id: 'signer-008',
  workflow_id: 'workflow-abc',
  has_previous_notification: false,
});
console.log('\nTest 8 - INSERT + pending (estado legacy):');
console.log('  shouldNotify:', result8, '(esperado: false)');
console.log('  Match:', result8 === false ? '✅' : '❌');

// Resumen
console.log('\n=== Resumen ===');
const allPassed =
  result1 === true &&   // invited
  result2 === true &&   // ready_to_sign
  result3 === false &&  // signed
  result4 === false &&  // UPDATE
  result5 === false &&  // duplicado
  result6 === false &&  // awaiting
  result7 === false &&  // rejected
  result8 === false;    // pending

if (allPassed) {
  console.log('✅ Todos los tests pasaron');
  console.log('✅ shouldNotifySignerLink() implementado correctamente');
  console.log('\n📋 Listo para shadow mode en trigger DB');
} else {
  console.log('❌ Algunos tests fallaron');
  Deno.exit(1);
}
