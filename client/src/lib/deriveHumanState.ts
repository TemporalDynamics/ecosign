// deriveHumanState.ts
// Small, pure helper to convert canonical workflow + signers into a human-friendly state.

export type Workflow = {
  id?: string;
  status?: string; // draft|ready|active|completed|cancelled|rejected|archived
};

export type Signer = {
  id?: string;
  name?: string | null;
  email?: string | null;
  status?: string; // created|invited|accessed|verified|ready_to_sign|signed|cancelled|expired
  signing_order?: number | null;
};

export type HumanWorkflowState = {
  key: 'draft' | 'waiting_for_signer' | 'signer_completed' | 'completed' | 'cancelled' | 'unknown';
  label: string;
  blocking_actor?: { type: 'signer' | 'owner'; id?: string | null; display_name?: string | null };
  severity: 'info' | 'action' | 'success' | 'warning';
};

/**
 * deriveHumanState
 * - Pure function that maps workflow + signers to a small human-friendly state
 * - Deterministic priority order documented below
 *
 * Priority order (first match wins):
 * 1. cancelled / rejected / archived
 * 2. completed
 * 3. waiting_for_signer (next signer pending)
 * 4. signer_completed (one or more signers have signed, but not all)
 * 5. draft
 */
export function deriveHumanState(workflow: Workflow | null, signers: Signer[] = []): HumanWorkflowState {
  const wfStatus = workflow?.status ?? 'draft';

  // 1) Cancelled / rejected / archived — strong negative
  if (['cancelled', 'rejected', 'archived'].includes(wfStatus)) {
    return { key: 'cancelled', label: 'Flujo cancelado', severity: 'warning' };
  }

  // 2) Completed — success
  if (wfStatus === 'completed') {
    return { key: 'completed', label: 'Todos completaron', severity: 'success' };
  }

  // 3) Waiting for next signer — find next by signing_order not signed/cancelled/expired
  const pending = (signers || [])
    .filter(s => s && !['signed', 'cancelled', 'expired'].includes(s.status ?? ''))
    .sort((a, b) => ( (a.signing_order ?? Number.POSITIVE_INFINITY) - (b.signing_order ?? Number.POSITIVE_INFINITY) ));

  const next = pending.length > 0 ? pending[0] : undefined;
  if (next && ['created', 'invited', 'accessed', 'verified', 'ready_to_sign'].includes(next.status ?? '')) {
    const display = next.name || next.email || 'Firmante';
    return {
      key: 'waiting_for_signer',
      label: `Esperando firma de ${display}`,
      blocking_actor: { type: 'signer', id: next.id ?? null, display_name: next.name ?? next.email ?? null },
      severity: 'action'
    };
  }

  // 4) Some signers have signed but not all — signer_completed
  const anySigned = (signers || []).some(s => s && s.status === 'signed');
  if (anySigned && wfStatus !== 'completed') {
    return { key: 'signer_completed', label: 'Firma recibida', severity: 'info' };
  }

  // 5) Draft
  if (wfStatus === 'draft') {
    return { key: 'draft', label: 'Borrador — editable', severity: 'info' };
  }

  // Defensive fallback — unknown
  return { key: 'unknown', label: 'Estado no reconocido', severity: 'warning' };
}

/**
 * getHumanStateColor
 * Small mapping helper reserved for UI styling (P1.2).
 * Returns a Tailwind-friendly class name or color token for the given severity.
 * Exported now to keep UI mapping centralized and deterministic.
 */
export function getHumanStateColor(severity: HumanWorkflowState['severity']): string {
  const map: Record<HumanWorkflowState['severity'], string> = {
    info: 'text-gray-700 bg-gray-100',
    action: 'text-yellow-700 bg-yellow-100',
    success: 'text-green-700 bg-green-100',
    warning: 'text-red-700 bg-red-100',
  };
  return map[severity] || 'text-gray-700 bg-gray-100';
}

