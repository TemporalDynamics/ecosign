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
  const total = signers.length;
  const signedCount = signers.filter(s => s && s.status === 'signed').length;

  // 1) Cancelled / rejected / archived — strong negative
  if (['cancelled', 'rejected', 'archived'].includes(wfStatus)) {
    return { key: 'cancelled', label: 'Flujo cancelado', severity: 'warning' };
  }

  // 2) Completed — success
  if (wfStatus === 'completed') {
    return { key: 'completed', label: 'Firmado', severity: 'info' };
  }

  // 3) Waiting for next signer — find next by signing_order not signed/cancelled/expired
  const pending = (signers || [])
    .filter(s => s && !['signed', 'cancelled', 'expired'].includes(s.status ?? ''))
    .sort((a, b) => ( (a.signing_order ?? Number.POSITIVE_INFINITY) - (b.signing_order ?? Number.POSITIVE_INFINITY) ));

  const next = pending.length > 0 ? pending[0] : undefined;
  if (next && ['created', 'invited', 'accessed', 'verified', 'ready_to_sign'].includes(next.status ?? '')) {
    return {
      key: 'waiting_for_signer',
      label: total > 0 ? `Firmando ${signedCount}/${total}` : 'Firmando',
      blocking_actor: { type: 'signer', id: next.id ?? null, display_name: next.name ?? next.email ?? null },
      severity: 'action'
    };
  }

  // 4) Some signers have signed but not all — signer_completed
  const anySigned = (signers || []).some(s => s && s.status === 'signed');
  if (anySigned && wfStatus !== 'completed') {
    return { key: 'signer_completed', label: total > 0 ? `Firmando ${signedCount}/${total}` : 'Firmando', severity: 'action' };
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
  // Mapping tuned for calm/attention semantics (P1.2)
  // action -> subtle green (active, requires attention but calm)
  // info   -> blue (informative, strengthening)
  // success-> gray (resolved, minimal attention)
  // warning-> darker gray (terminal but not alarming)
  const map: Record<HumanWorkflowState['severity'], string> = {
    info: 'text-blue-700 bg-blue-50',
    action: 'text-green-700 bg-green-50',
    success: 'text-gray-600 bg-gray-50',
    warning: 'text-gray-700 bg-gray-100',
  };
  return map[severity] || 'text-gray-600 bg-gray-50';
}

/**
 * getHumanStateIconName
 * Returns a lucide-react icon name key to be used by UI components.
 * Kept as string to avoid coupling this lib with React imports.
 */
export function getHumanStateIconName(severity: HumanWorkflowState['severity']): string {
  const map: Record<HumanWorkflowState['severity'], string> = {
    action: 'Clock',      // something in progress
    info: 'ShieldCheck',  // strengthening protection
    success: 'CheckCircle',// resolved
    warning: 'XCircle',   // terminal but not alarming
  };
  return map[severity] || 'Info';
}

