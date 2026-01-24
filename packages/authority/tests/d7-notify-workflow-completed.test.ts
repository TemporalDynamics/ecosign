#!/usr/bin/env -S deno run
/**
 * Test D7 - Decisión: Notificar workflow completado
 *
 * Valida que shouldNotifyWorkflowCompleted() tome la decisión correcta
 * en todos los escenarios de UPDATE de signature_workflows.
 *
 * @see docs/migration/D7_NOTIFY_WORKFLOW_COMPLETED.md
 */

import { shouldNotifyWorkflowCompleted } from '../src/decisions/notifyWorkflowCompleted.ts';

console.log('=== Test D7 - Decisión: Notify Workflow Completed ===\n');

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
// Test 1: UPDATE active → completed (happy path)
// ============================================
test('Test 1 - UPDATE active → completed (happy path)', () => {
  const result = shouldNotifyWorkflowCompleted({
    operation: 'UPDATE',
    old_status: 'active',
    new_status: 'completed',
    workflow_id: 'uuid-workflow-1',
  });

  assert(result === true, 'Debe retornar true en transición a completed');
});

// ============================================
// Test 2: UPDATE active → active (no completed)
// ============================================
test('Test 2 - UPDATE active → active (no completed)', () => {
  const result = shouldNotifyWorkflowCompleted({
    operation: 'UPDATE',
    old_status: 'active',
    new_status: 'active',
    workflow_id: 'uuid-workflow-2',
  });

  assert(result === false, 'No debe notificar si no cambia a completed');
});

// ============================================
// Test 3: UPDATE completed → completed (duplicado)
// ============================================
test('Test 3 - UPDATE completed → completed (duplicado)', () => {
  const result = shouldNotifyWorkflowCompleted({
    operation: 'UPDATE',
    old_status: 'completed',
    new_status: 'completed',
    workflow_id: 'uuid-workflow-3',
  });

  assert(result === false, 'No debe re-notificar si OLD.status ya era completed');
});

// ============================================
// Test 4: INSERT con status completed (no aplica)
// ============================================
test('Test 4 - INSERT con status completed (no aplica)', () => {
  const result = shouldNotifyWorkflowCompleted({
    operation: 'INSERT',
    old_status: null,
    new_status: 'completed',
    workflow_id: 'uuid-workflow-4',
  });

  assert(result === false, 'No debe notificar en INSERT');
});

// ============================================
// Test 5: UPDATE active → cancelled (no completed)
// ============================================
test('Test 5 - UPDATE active → cancelled (no completed)', () => {
  const result = shouldNotifyWorkflowCompleted({
    operation: 'UPDATE',
    old_status: 'active',
    new_status: 'cancelled',
    workflow_id: 'uuid-workflow-5',
  });

  assert(result === false, 'No debe notificar si cambió a cancelled');
});

// ============================================
// Test 6: UPDATE null → completed (edge legacy)
// ============================================
test('Test 6 - UPDATE null → completed (edge legacy)', () => {
  const result = shouldNotifyWorkflowCompleted({
    operation: 'UPDATE',
    old_status: null,
    new_status: 'completed',
    workflow_id: 'uuid-workflow-6',
  });

  assert(result === true, 'Debe notificar incluso si OLD.status es null');
});

// ============================================
// Test 7: UPDATE processing → completed (estado previo desconocido)
// ============================================
test('Test 7 - UPDATE processing → completed (estado previo desconocido)', () => {
  const result = shouldNotifyWorkflowCompleted({
    operation: 'UPDATE',
    old_status: 'processing',
    new_status: 'completed',
    workflow_id: 'uuid-workflow-7',
  });

  assert(result === true, 'Debe notificar desde cualquier estado no-completed');
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

console.log('🎉 Todos los tests de D7 pasaron correctamente\n');
