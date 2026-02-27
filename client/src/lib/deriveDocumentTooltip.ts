// ========================================
// deriveDocumentTooltip - Tooltips Sin Estrés
// Contrato: docs/ui/DOCUMENT_STATES_CONTRACT.md
// ========================================

import type { DocumentEntityRow } from './eco/v2';
import { deriveAnchorProbativeState } from './anchorProbativeState';
import type { SimpleSigner } from './deriveDocumentState';

/**
 * Genera el contenido del tooltip para un estado.
 *
 * REGLAS:
 * - Sin timestamps agresivos
 * - Sin contadores de tiempo ("hace 2 horas")
 * - Formato suave: ✓ firmado / · pendiente
 * - El tooltip confirma, no presiona
 *
 * @param document - Entidad de documento
 * @param signers - Firmantes del workflow (opcional)
 * @returns Texto del tooltip o undefined si no aplica
 */
export function deriveDocumentTooltip(
  document: DocumentEntityRow,
  signers?: SimpleSigner[]
): string | undefined {

  // ========================================
  // 1. ARCHIVADO
  // ========================================

  if (document.lifecycle_status === 'archived') {
    return 'Documento archivado';
  }

  // ========================================
  // 2. WORKFLOW DE FIRMA
  // ========================================

  if (signers && signers.length > 0) {
    const signedCount = signers.filter(s => s.status === 'signed').length;
    const totalCount = signers.length;

    // Todas las firmas completadas
    if (signedCount === totalCount) {
      if (totalCount === 1) {
        return 'Documento firmado';
      }
      return `Todas las firmas completadas\n\n${formatSignersSimple(signers)}`;
    }

    // Esperando firmas
    if (totalCount === 1) {
      const signer = signers[0];
      const name = signer.name || signer.email;
      return `Esperando firma\n\n· ${name} (pendiente)`;
    }

    return `Esperando firma\n\n${formatSignersSimple(signers)}`;
  }

  // ========================================
  // 3. NIVEL DE PROTECCIÓN
  // ========================================

  const probative = deriveAnchorProbativeState({
    events: (document.events ?? []) as any[],
    hasPrimaryHash: Boolean(
      (document as any)?.signed_hash ||
      (document as any)?.witness_current_hash ||
      (document as any)?.source_hash
    ),
  });

  if (probative.level === 'total') {
    return 'Protección máxima completada\n\nMáxima fortaleza probatoria';
  }

  if (probative.level === 'reinforced') {
    return 'Protección reforzada\n\nRefuerzo probatorio adicional confirmado';
  }

  if (probative.level === 'active') {
    return 'Protección garantizada\n\nIntegridad y fecha cierta confirmadas';
  }

  // Protegiendo
  return 'Protegiendo documento';
}

/**
 * Formatea firmantes para tooltip (sin timestamps).
 *
 * Formato:
 * ✓ nombre firmó
 * · nombre (pendiente)
 */
function formatSignersSimple(signers: SimpleSigner[]): string {
  return signers
    .sort((a, b) => a.order - b.order)
    .map(s => {
      const displayName = s.name || s.email;

      if (s.status === 'signed') {
        return `✓ ${displayName} firmó`;
      }

      return `· ${displayName} (pendiente)`;
    })
    .join('\n');
}
