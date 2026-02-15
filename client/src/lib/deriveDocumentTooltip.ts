// ========================================
// deriveDocumentTooltip - Tooltips Sin Estrés
// Contrato: docs/ui/DOCUMENT_STATES_CONTRACT.md
// ========================================

import type { DocumentEntityRow } from './eco/v2';
import { deriveProtectionLevel } from './protectionLevel';
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

  const protectionLevel = deriveProtectionLevel((document.events ?? []) as any);

  if (protectionLevel === 'TWO_CHAINS_CONFIRMED') {
    return 'Protección máxima completada\n\nMáxima fortaleza probatoria';
  }

  if (protectionLevel === 'ONE_CHAIN_CONFIRMED') {
    return 'Protección reforzada\n\nRegistro en red pública adicional';
  }

  if (protectionLevel === 'TSA_REKOR_CONFIRMED') {
    return 'Protección transparente\n\nTSA + Rekor confirmados';
  }

  if (protectionLevel === 'TSA_CONFIRMED') {
    return 'Documento protegido\n\nSello de tiempo confirmado';
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
