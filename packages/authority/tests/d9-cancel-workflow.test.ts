#!/usr/bin/env -S deno run
/**
 * Test D9 - Decisión: Cancelar workflow
 *
 * Valida que shouldCancelWorkflow() tome la decisión correcta.
 *
 * @see docs/migration/D9_CANCEL_WORKFLOW.md
 */

import { shouldCancelWorkflow } from '../src/decisions/cancelWorkflow.ts';

console.log('=== Test D9 - Decisión: Cancel Workflow ===\n');

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
// Test 1: Happy path
// ============================================
test('Test 1 - owner cancels active workflow', () => {
  const result = shouldCancelWorkflow({
    actor_id: 'owner-1',
    workflow: { owner_id: 'owner-1', status: 'active' },
  });

  assert(result === true, 'Debe permitir cancelación para owner + active');
});

// ============================================
// Test 2: Actor no owner
// ============================================
test('Test 2 - actor no owner', () => {
  const result = shouldCancelWorkflow({
    actor_id: 'actor-2',
    workflow: { owner_id: 'owner-1', status: 'active' },
  });

  assert(result === false, 'No debe permitir cancelación si no es owner');
});

// ============================================
// Test 3: Workflow completed
// ============================================
test('Test 3 - workflow completed', () => {
  const result = shouldCancelWorkflow({
    actor_id: 'owner-1',
    workflow: { owner_id: 'owner-1', status: 'completed' },
  });

  assert(result === false, 'No debe permitir cancelación si está completed');
});

// ============================================
// Test 4: Workflow cancelled
// ============================================
test('Test 4 - workflow cancelled', () => {
  const result = shouldCancelWorkflow({
    actor_id: 'owner-1',
    workflow: { owner_id: 'owner-1', status: 'cancelled' },
  });

  assert(result === false, 'No debe permitir cancelación si ya está cancelled');
});

// ============================================
// Test 5: Workflow archived
// ============================================
test('Test 5 - workflow archived', () => {
  const result = shouldCancelWorkflow({
    actor_id: 'owner-1',
    workflow: { owner_id: 'owner-1', status: 'archived' },
  });

  assert(result === false, 'No debe permitir cancelación si está archived');
});

// ============================================
// Test 6: Actor no autenticado
// ============================================
test('Test 6 - actor null', () => {
  const result = shouldCancelWorkflow({
    actor_id: null,
    workflow: { owner_id: 'owner-1', status: 'active' },
  });

  assert(result === false, 'No debe permitir cancelación sin actor');
});

// ============================================
// Test 7: Workflow inexistente
// ============================================
test('Test 7 - workflow null', () => {
  const result = shouldCancelWorkflow({
    actor_id: 'owner-1',
    workflow: null,
  });

  assert(result === false, 'No debe permitir cancelación sin workflow');
});

// ============================================
// Test 8: Workflow ready (no cancelar)
// ============================================
test('Test 8 - workflow ready', () => {
  const result = shouldCancelWorkflow({
    actor_id: 'owner-1',
    workflow: { owner_id: 'owner-1', status: 'ready' },
  });

  assert(result === false, 'No debe permitir cancelación si está ready');
});

// ============================================
// Test 9: Workflow rejected (no cancelar)
// ============================================
test('Test 9 - workflow rejected', () => {
  const result = shouldCancelWorkflow({
    actor_id: 'owner-1',
    workflow: { owner_id: 'owner-1', status: 'rejected' },
  });

  assert(result === false, 'No debe permitir cancelación si está rejected');
});

// ============================================
// Test 10: Idempotencia (cancelled)
// ============================================
test('Test 10 - idempotencia cancelled', () => {
  const result = shouldCancelWorkflow({
    actor_id: 'owner-1',
    workflow: { owner_id: 'owner-1', status: 'cancelled' },
  });

  assert(result === false, 'No debe permitir cancelación repetida');
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

console.log('🎉 Todos los tests de D9 pasaron correctamente\n');
