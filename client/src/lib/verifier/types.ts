export type OperationEventKind =
  | 'operation.created'
  | 'operation.renamed'
  | 'operation.archived'
  | 'operation.closed'
  | 'operation.document_added'
  | 'operation.document_removed';

export type OperationEventRow = {
  id: string;
  operation_id: string;
  document_entity_id?: string | null;
  kind: OperationEventKind;
  at: string;
  actor?: { id?: string; type?: string } | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type DocumentEventEntry = {
  kind?: string;
  at?: string;
  [key: string]: unknown;
};

export type TimelineEvent = {
  id: string;
  kind: string;
  at: string;
  source: 'document' | 'operation' | 'system';
  label: string;
  details?: string | null;
  operationId?: string | null;
  documentId?: string | null;
};
