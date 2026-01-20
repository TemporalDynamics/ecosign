export const FASE1_EVENT_KINDS = {
  DOCUMENT_PROTECTED: 'document.protected',
  DOCUMENT_PROTECTED_REQUESTED: 'document.protected.requested',
  TSA_CONFIRMED: 'tsa.confirmed',
  TSA_FAILED: 'tsa.failed',
  ANCHOR_CONFIRMED: 'anchor.confirmed',
  ANCHOR_FAILED: 'anchor.failed',
  ANCHOR_PENDING: 'anchor.pending',
  WORKFLOW_COMPLETED: 'workflow.completed',
} as const;

export type Fase1EventKind = typeof FASE1_EVENT_KINDS[keyof typeof FASE1_EVENT_KINDS];
