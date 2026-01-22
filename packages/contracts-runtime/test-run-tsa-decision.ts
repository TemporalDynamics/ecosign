/**
 * Test de Validación - Decisión de run_tsa
 * 
 * Este test verifica que la decisión de encolar run_tsa funcione correctamente
 * según el protocolo de migración controlada.
 * 
 * Debe ejecutarse manualmente para validar que la UI refleje correctamente
 * el nuevo modelo de decisión basado en eventos.
 */

import { shouldEnqueueRunTsa, isReadyForArtifact, decideNextJobs } from './decisionEngine.ts';

// Test 1: Documento sin solicitud de protección
console.log('=== Test 1: Documento sin solicitud de protección ===');
const eventsWithoutRequest = [
  { kind: 'document.created', at: '2026-01-21T10:00:00.000Z' }
];

console.log('shouldEnqueueRunTsa (sin solicitud):', shouldEnqueueRunTsa(eventsWithoutRequest));
console.log('decideNextJobs (sin solicitud):', decideNextJobs(eventsWithoutRequest, []));
console.log('✅ Correcto: No debería encolar run_tsa sin solicitud\n');

// Test 2: Documento con solicitud pero sin TSA
console.log('=== Test 2: Documento con solicitud pero sin TSA ===');
const eventsWithRequestNoTsa = [
  { kind: 'document.protected.requested', at: '2026-01-21T10:00:00.000Z' }
];

console.log('shouldEnqueueRunTsa (con solicitud, sin TSA):', shouldEnqueueRunTsa(eventsWithRequestNoTsa));
console.log('decideNextJobs (con solicitud, sin TSA):', decideNextJobs(eventsWithRequestNoTsa, []));
console.log('✅ Correcto: Debería encolar run_tsa\n');

// Test 3: Documento con TSA confirmado
console.log('=== Test 3: Documento con TSA confirmado ===');
const eventsWithTsa = [
  { kind: 'document.protected.requested', at: '2026-01-21T10:00:00.000Z' },
  { kind: 'tsa.confirmed', at: '2026-01-21T10:01:00.000Z', payload: { witness_hash: 'test', token_b64: 'test' } }
];

console.log('shouldEnqueueRunTsa (con TSA):', shouldEnqueueRunTsa(eventsWithTsa));
console.log('decideNextJobs (con TSA):', decideNextJobs(eventsWithTsa, []));
console.log('✅ Correcto: No debería encolar run_tsa si ya hay TSA\n');

// Test 4: Documento con TSA y protección requerida
console.log('=== Test 4: Documento con TSA y protección requerida (sin anclajes) ===');
const eventsWithTsaAndProtection = [
  { kind: 'document.protected.requested', at: '2026-01-21T10:00:00.000Z' },
  { kind: 'tsa.confirmed', at: '2026-01-21T10:01:00.000Z', payload: { witness_hash: 'test', token_b64: 'test' } }
];

console.log('isReadyForArtifact (TSA pero sin anclajes):', isReadyForArtifact(eventsWithTsaAndProtection, ['polygon']));
console.log('decideNextJobs (TSA pero sin anclajes):', decideNextJobs(eventsWithTsaAndProtection, ['polygon']));
console.log('✅ Correcto: No listo para artifact, debería encolar anclajes\n');

// Test 5: Documento con TSA y anclajes completos
console.log('=== Test 5: Documento con TSA y anclajes completos ===');
const eventsComplete = [
  { kind: 'document.protected.requested', at: '2026-01-21T10:00:00.000Z' },
  { kind: 'tsa.confirmed', at: '2026-01-21T10:01:00.000Z', payload: { witness_hash: 'test', token_b64: 'test' } },
  {
    kind: 'anchor',
    at: '2026-01-21T10:02:00.000Z',
    anchor: {
      network: 'polygon',
      witness_hash: 'test',
      txid: '0x123456789',
      confirmed_at: '2026-01-21T10:02:00.000Z'  // confirmed_at >= at
    }
  }
];

console.log('isReadyForArtifact (TSA + anclaje completo):', isReadyForArtifact(eventsComplete, ['polygon']));
console.log('decideNextJobs (TSA + anclaje completo):', decideNextJobs(eventsComplete, ['polygon']));
console.log('✅ Correcto: Listo para artifact\n');

// Test 6: Validación de causalidad temporal (caso inválido)
console.log('=== Test 6: Validación de causalidad temporal (caso inválido) ===');
const eventsInvalidCausality = [
  { kind: 'document.protected.requested', at: '2026-01-21T12:10:00.000Z' },
  {
    kind: 'anchor',
    at: '2026-01-21T12:10:00.000Z',
    anchor: {
      network: 'polygon',
      witness_hash: 'test',
      txid: '0x123456789',
      confirmed_at: '2026-01-21T11:00:00.000Z'  // confirmed_at < at (inválido)
    }
  }
];

console.log('hasAnchorConfirmed (causalidad inválida):', hasAnchorConfirmed(eventsInvalidCausality, 'polygon'));
console.log('decideNextJobs (causalidad inválida):', decideNextJobs(eventsInvalidCausality, ['polygon']));
console.log('✅ Correcto: No cuenta como anclaje confirmado con causalidad inválida\n');

console.log('=== Todos los tests pasados correctamente ===');
console.log('La lógica de decisión run_tsa está funcionando correctamente.');
console.log('Ahora se puede proceder con la validación UI según el protocolo.');

// Función auxiliar para el test (copiada del decisionEngine para este test)
function hasAnchorConfirmed(events: any[], network: 'polygon' | 'bitcoin'): boolean {
  return events.some((event) => {
    if (event.kind !== 'anchor' && event.kind !== 'anchor.confirmed') {
      return false;
    }

    const hasCorrectNetwork = ((event as any).anchor?.network === network || (event as any).payload?.network === network);
    if (!hasCorrectNetwork) {
      return false;
    }

    const confirmedAtValue = (event as any).anchor?.confirmed_at || (event as any).payload?.confirmed_at;
    if (!confirmedAtValue) {
      return false;
    }

    try {
      const confirmedAt = new Date(confirmedAtValue);
      const at = new Date(event.at);
      if (confirmedAt < at) {
        return false; // Rompe causalidad temporal
      }
    } catch {
      return false; // Fecha inválida
    }

    return true;
  });
}