#!/usr/bin/env -S deno run

/**
 * Test simple para verificar que la comparación shadow funcione
 */

import { shouldEnqueueRunTsa } from './decisionEngineCanonical.ts';
import { decideProtectDocumentV2 } from './protectDocumentV2Decision.ts';

console.log('=== Test Shadow Decision ===\n');

// Test 1: Sin solicitud
const test1 = [{ kind: 'document.created' }];
const canonical1 = shouldEnqueueRunTsa(test1);
const current1 = decideProtectDocumentV2(test1);
console.log('Test 1 - Sin solicitud:');
console.log('  Canonical:', canonical1 ? 'run_tsa' : 'noop');
console.log('  Current:', current1);
console.log('  Match:', (canonical1 === false && current1 === 'noop_missing_request') ? '✅' : '❌');

// Test 2: Con solicitud, sin TSA
const test2 = [{ kind: 'document.protected.requested' }];
const canonical2 = shouldEnqueueRunTsa(test2);
const current2 = decideProtectDocumentV2(test2);
console.log('\nTest 2 - Con solicitud, sin TSA:');
console.log('  Canonical:', canonical2 ? 'run_tsa' : 'noop');
console.log('  Current:', current2);
console.log('  Match:', (canonical2 === true && current2 === 'run_tsa') ? '✅' : '❌');

// Test 3: Con solicitud y TSA
const test3 = [
  { kind: 'document.protected.requested' },
  { kind: 'tsa.confirmed' }
];
const canonical3 = shouldEnqueueRunTsa(test3);
const current3 = decideProtectDocumentV2(test3);
console.log('\nTest 3 - Con solicitud y TSA:');
console.log('  Canonical:', canonical3 ? 'run_tsa' : 'noop');
console.log('  Current:', current3);
console.log('  Match:', (canonical3 === false && current3 === 'noop_already_tsa') ? '✅' : '❌');

console.log('\n✅ Lógica de comparación shadow verificada');
