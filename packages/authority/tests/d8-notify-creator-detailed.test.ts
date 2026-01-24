#!/usr/bin/env -S deno run
/**
 * Test D8 - Decisión: Notificar creador (detallado)
 *
 * Valida que shouldNotifyCreatorDetailed() tome la decisión correcta
 * en todos los escenarios de UPDATE de workflow_signers.
 *
 * @see docs/migration/D8_NOTIFY_CREATOR_DETAILED.md
 */

import { shouldNotifyCreatorDetailed } from '../src/decisions/notifyCreatorDetailed.ts';

console.log('=== Test D8 - Decisión: Notify Creator Detailed ===\n');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   ${error.message}`);
    failed++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

// ============================================
// Test 1: UPDATE ready_to_sign → signed (happy path)
// ============================================
test('Test 1 - UPDATE ready_to_sign → signed (happy path)', () => {
  const result = shouldNotifyCreatorDetailed({
    operation: 'UPDATE',
    old_status: 'ready_to_sign',
    new_status: 'signed',
    signer_id: 'uuid-signer-1',
    workflow_id: 'uuid-workflow-1',
  });

  assert(result === true, 'Debe retornar true en transición a signed');
});

// ============================================
// Test 2: UPDATE invited → signed (skip ready_to_sign)
// ============================================
test('Test 2 - UPDATE invited → signed (skip ready_to_sign)', () => {
  const result = shouldNotifyCreatorDetailed({
    operation: 'UPDATE',
    old_status: 'invited',
    new_status: 'signed',
    signer_id: 'uuid-signer-2',
    workflow_id: 'uuid-workflow-2',
  });

  assert(result === true, 'Debe notificar desde invited directamente');
});

// ============================================
// Test 3: UPDATE signed → signed (evitar duplicados)
// ============================================
test('Test 3 - UPDATE signed → signed (evitar duplicados)', () => {
  const result = shouldNotifyCreatorDetailed({
    operation: 'UPDATE',
    old_status: 'signed',
    new_status: 'signed',
    signer_id: 'uuid-signer-3',
    workflow_id: 'uuid-workflow-3',
  });

  assert(result === false, 'No debe re-notificar si OLD.status ya era signed');
});

// ============================================
// Test 4: UPDATE invited → ready_to_sign (no signed)
// ============================================
test('Test 4 - UPDATE invited → ready_to_sign (no signed)', () => {
  const result = shouldNotifyCreatorDetailed({
    operation: 'UPDATE',
    old_status: 'invited',
    new_status: 'ready_to_sign',
    signer_id: 'uuid-signer-4',
    workflow_id: 'uuid-workflow-4',
  });

  assert(result === false, 'No debe notificar si no llegó a signed');
});

// ============================================
// Test 5: INSERT con status signed (no aplica)
// ============================================
test('Test 5 - INSERT con status signed (no aplica)', () => {
  const result = shouldNotifyCreatorDetailed({
    operation: 'INSERT',
    old_status: null,
    new_status: 'signed',
    signer_id: 'uuid-signer-5',
    workflow_id: 'uuid-workflow-5',
  });

  assert(result === false, 'No debe notificar en INSERT');
});

// ============================================
// Test 6: UPDATE null → signed (edge legacy)
// ============================================
test('Test 6 - UPDATE null → signed (edge legacy)', () => {
  const result = shouldNotifyCreatorDetailed({
    operation: 'UPDATE',
    old_status: null,
    new_status: 'signed',
    signer_id: 'uuid-signer-6',
    workflow_id: 'uuid-workflow-6',
  });

  assert(result === true, 'Debe notificar incluso si OLD.status es null');
});

// ============================================
// Test 7: UPDATE pending → signed (otro estado válido)
// ============================================
test('Test 7 - UPDATE pending → signed (otro estado válido)', () => {
  const result = shouldNotifyCreatorDetailed({
    operation: 'UPDATE',
    old_status: 'pending',
    new_status: 'signed',
    signer_id: 'uuid-signer-7',
    workflow_id: 'uuid-workflow-7',
  });

  assert(result === true, 'Debe notificar desde cualquier estado no-signed');
});

// ============================================
// Resumen
// ============================================
console.log(`\n${'='.repeat(50)}`);
console.log(`Total tests: ${passed + failed}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`${'='.repeat(50)}\n`);

if (failed > 0) {
  Deno.exit(1);
}

console.log('🎉 Todos los tests de D8 pasaron correctamente\n');
