import type { DocumentEventEntry, OperationEventRow, TimelineEvent } from './types';

const OPERATION_LABELS: Record<string, string> = {
  'operation.created': 'Operación creada',
  'operation.renamed': 'Operación renombrada',
  'operation.archived': 'Operación archivada',
  'operation.closed': 'Operación cerrada',
  'operation.document_added': 'Documento agregado a operación',
  'operation.document_removed': 'Documento removido de operación',
};

const DOCUMENT_LABELS: Record<string, string> = {
  created: 'Documento creado',
  'document.protected': 'Documento protegido',
  'document.protected.requested': 'Protección solicitada',
  'tsa.confirmed': 'Sello de tiempo registrado',
  'tsa.failed': 'Sello de tiempo fallido',
  'anchor': 'Anclaje público confirmado',
  'anchor.confirmed': 'Anclaje público confirmado',
  'anchor.failed': 'Anclaje público fallido',
  'anchor.pending': 'Anclaje público pendiente',
  nda_accepted: 'NDA aceptado',
  otp_verified: 'Identidad verificada (OTP)',
  signature_applied: 'Firma aplicada',
  signature_completed: 'Firma completada',
  document_viewed: 'Documento visualizado',
  access_link_opened: 'Enlace de acceso abierto',
  eco_downloaded: 'Certificado descargado',
  sequential_order_violated: 'Orden de firma no respetado',
};

const getAnchorLabel = (event: DocumentEventEntry): string | null => {
  if (event.kind !== 'anchor' && event.kind !== 'anchor.confirmed') return null;
  const anchor = (event.anchor as { network?: string } | undefined) ?? null;
  const payload = (event.payload as { network?: string } | undefined) ?? null;
  const network = anchor?.network ?? payload?.network;
  if (network === 'polygon') return 'Anclaje público confirmado (Polygon)';
  if (network === 'bitcoin') return 'Anclaje público confirmado (Bitcoin)';
  return 'Anclaje público confirmado';
};

const getTsaLabel = (event: DocumentEventEntry): string | null => {
  if (event.kind !== 'tsa.confirmed') return null;
  return 'Sello de tiempo registrado';
};

export const extractOperationIds = (events: DocumentEventEntry[]): string[] => {
  const ids = new Set<string>();
  events.forEach((evt) => {
    const opId = evt.operation_id as string | undefined;
    if (opId) ids.add(opId);
  });
  return Array.from(ids);
};

export const normalizeOperationEvents = (
  events: OperationEventRow[]
): TimelineEvent[] => {
  return events
    .filter((evt) => !!evt.at)
    .map((evt) => ({
      id: `op-${evt.id}`,
      kind: evt.kind,
      at: evt.at,
      source: 'operation' as const,
      label: OPERATION_LABELS[evt.kind] ?? 'Evento de operación',
      details: evt.reason ?? null,
      operationId: evt.operation_id,
      documentId: evt.document_entity_id ?? null,
    }));
};

export const normalizeDocumentEvents = (
  events: DocumentEventEntry[]
): TimelineEvent[] => {
  return events
    .filter((evt) => !!evt.at)
    .map((evt, idx) => {
      const kind = (evt.kind || evt.event_type || evt.eventType || 'evento') as string;
      const tsaLabel = getTsaLabel(evt);
      const anchorLabel = getAnchorLabel(evt);
      const label = tsaLabel || anchorLabel || DOCUMENT_LABELS[kind] || `Evento: ${kind}`;
      const id = `doc-${kind}-${evt.at}-${idx}`;
      return {
        id,
        kind,
        at: evt.at as string,
        source: 'document' as const,
        label,
      };
    });
};

export const buildCreatedEvent = (createdAt?: string | null): TimelineEvent | null => {
  if (!createdAt) return null;
  return {
    id: `system-created-${createdAt}`,
    kind: 'document.created',
    at: createdAt,
    source: 'system',
    label: 'Documento creado',
  };
};
