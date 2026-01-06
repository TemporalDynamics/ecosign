/**
 * Error Recovery Utilities
 *
 * Purpose: Determine if user's work is saved and if retry is possible
 * Anti-explosion: D (Sin salida)
 *
 * P0.7: determineIfWorkSaved - always tell user if their work is safe
 * P0.8: canRetryFromStage - show retry button when applicable
 */

export type CertifyStage =
  | 'idle'
  | 'preparing'
  | 'timestamping'
  | 'anchoring'
  | 'generating'
  | 'done';

/**
 * P0.7: Determine if user's work is saved at this stage
 *
 * Critical for user confidence - they must always know if their work is safe.
 * After timestamping, the document is saved in backend (even if later steps fail).
 */
export function determineIfWorkSaved(stage: CertifyStage): boolean {
  // Saved stages: from timestamping onwards (TSA is persisted)
  const savedStages: CertifyStage[] = [
    'timestamping',
    'anchoring',
    'generating',
    'done',
  ];

  return savedStages.includes(stage);
}

/**
 * P0.8: Determine if retry is possible from this stage
 *
 * Retry is possible if:
 * - Not in 'done' state (already completed)
 * - Not in 'idle' state (nothing started)
 */
export function canRetryFromStage(stage: CertifyStage): boolean {
  // Can retry if something started but not yet done
  const retryableStages: CertifyStage[] = [
    'preparing',
    'timestamping',
    'anchoring',
    'generating',
  ];

  return retryableStages.includes(stage);
}

/**
 * Get user-friendly stage name
 */
export function getStageName(stage: CertifyStage): string {
  const stageNames: Record<CertifyStage, string> = {
    idle: 'Iniciando',
    preparing: 'Preparando documento',
    timestamping: 'Timestamping legal',
    anchoring: 'Anclaje blockchain',
    generating: 'Generando certificado',
    done: 'Completado',
  };

  return stageNames[stage] || 'Procesando';
}
