// ========================================
// deriveDocumentState - Función Core Canónica
// Contrato: docs/ui/DOCUMENT_STATES_CONTRACT.md
// ========================================

import { deriveProtectionLevel, type ProtectionLevel, type Event } from './protectionLevel';
import type { DocumentEntityRow } from './eco/v2';

// ========================================
// Types
// ========================================

export type StatePhase = 'green' | 'blue' | 'gray';

export interface DocumentState {
  label: string;      // "Esperando firma (1/2)"
  phase: StatePhase;  // 'green' | 'blue' | 'gray'
}

// Simplified workflow types (to avoid circular deps)
export interface SimpleWorkflow {
  id: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
}

export interface SimpleSigner {
  id: string;
  status: 'pending' | 'ready' | 'signed' | 'requested_changes' | 'skipped';
  order: number;
  name?: string | null;
  email: string;
}

// ========================================
// Main Function
// ========================================

/**
 * Deriva el estado visual de un documento.
 *
 * REGLAS NO-NEGOCIABLES:
 * - Solo 3 fases: green, blue, gray
 * - El estado refleja QUÉ FALTA, no el pasado
 * - Sin errores en la tabla (errores van al modal)
 * - Sin conceptos técnicos (TSA, blockchain, etc.)
 *
 * ORDEN DE DECISIÓN (ESTRICTO):
 * 1. ¿Archivado? → gray
 * 2. ¿Workflow de firma? → green (esperando) o gray (completado)
 * 3. ¿Nivel de protección? → blue/gray según nivel
 * 4. Fallback → green "En proceso" (siempre seguro)
 *
 * @param document - Entidad de documento
 * @param workflows - Workflows de firma asociados (opcional)
 * @param signers - Firmantes del workflow (opcional)
 * @returns Estado con label y phase
 */
export function deriveDocumentState(
  document: DocumentEntityRow,
  workflows?: SimpleWorkflow[],
  signers?: SimpleSigner[]
): DocumentState {

  // ========================================
  // 1. ARCHIVADO (final)
  // ========================================

  if (document.lifecycle_status === 'archived') {
    return {
      label: 'Archivado',
      phase: 'gray'
    };
  }

  // ========================================
  // 2. WORKFLOW DE FIRMA (prioridad)
  // ========================================

  // Buscar workflow activo o completado
  const activeWorkflow = workflows?.find(
    w => w.status === 'active' || w.status === 'completed'
  );

  if (activeWorkflow) {
    const signedCount = signers?.filter(s => s.status === 'signed').length ?? 0;
    const totalCount = signers?.length ?? 0;

    // 2a. Todas las firmas completadas → AZUL (finalizado)
    if (activeWorkflow.status === 'completed' || (totalCount > 0 && signedCount === totalCount)) {
      return {
        label: totalCount > 1 ? 'Firmado' : 'Firmado',
        phase: 'blue'
      };
    }

    // 2b. Faltan firmas → VERDE (en proceso)
    if (totalCount > 0) {
      return {
        label: `Firmando ${signedCount}/${totalCount}`,
        phase: 'green'
      };
    }

    return {
      label: 'Firmando',
      phase: 'green'
    };
  }

  // ========================================
  // 3. NIVEL DE PROTECCIÓN
  // ========================================

  const protectionLevel: ProtectionLevel = deriveProtectionLevel((document.events ?? []) as Event[]);

  // 3a. Protección TOTAL → GRIS (final)
  if (protectionLevel === 'TOTAL') {
    return {
      label: 'Protección máxima',
      phase: 'gray'
    };
  }

  // 3b. Protección REFORZADA → AZUL (activa)
  if (protectionLevel === 'REINFORCED') {
    return {
      label: 'Protección reforzada',
      phase: 'blue'
    };
  }

  // 3c. Protección ACTIVA (TSA) → AZUL (activa)
  if (protectionLevel === 'ACTIVE') {
    return {
      label: 'Protegido',
      phase: 'blue'
    };
  }

  // 3d. Sin protección aún → VERDE (proceso)
  if (protectionLevel === 'NONE') {
    return {
      label: 'Protegiendo',
      phase: 'green'
    };
  }

  // ========================================
  // 4. FALLBACK (siempre seguro)
  // ========================================

  return {
    label: 'En proceso',
    phase: 'green'
  };
}

// ========================================
// Helper para formatear firmantes (tooltips)
// ========================================

/**
 * Formatea la lista de firmantes para tooltips.
 *
 * Formato:
 * ✓ firmado
 * · pendiente
 *
 * Sin timestamps, sin urgencia.
 */
export function formatSignersForTooltip(signers: SimpleSigner[]): string {
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
