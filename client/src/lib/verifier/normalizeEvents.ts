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
  // Legacy keys (kept for backwards compatibility in UI-only logs)
  nda_accepted: 'NDA aceptado',
  otp_verified: 'Identidad verificada (OTP)',

  // Canonical probatory events (dot-notation)
  'share.created': 'Enlace compartido',
  'share.opened': 'Enlace abierto',
  'nda.accepted': 'NDA aceptado',
  'otp.verified': 'Identidad verificada (OTP)',
  // Legacy signature kind (pre dot-notation)
  signature: 'Firma completada',
  // Canonical signature kind
  'signature.completed': 'Firma completada',
  'identity.session.presence.confirmed': 'Presencia confirmada (sesión probatoria)',
  'identity.session.presence.witnessed': 'Testigo confirmó presencia',
  'identity.session.presence.closed': 'Acta probatoria cerrada',
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

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

const getPresenceDetails = (event: DocumentEventEntry): string | null => {
  const kind = typeof event.kind === 'string' ? event.kind : '';
  if (!kind.startsWith('identity.session.presence.')) return null;

  const payload = asRecord(event.payload);
  if (!payload) return null;

  if (kind === 'identity.session.presence.confirmed' || kind === 'identity.session.presence.witnessed') {
    const role = typeof payload.participant_role === 'string' ? payload.participant_role : null;
    const method = typeof payload.confirmation_method === 'string' ? payload.confirmation_method : null;
    const attestationHash =
      typeof payload.attestation_hash === 'string' ? payload.attestation_hash : null;
    const roleText =
      role === 'witness'
        ? 'Rol: testigo'
        : role === 'signer'
        ? 'Rol: firmante'
        : null;
    const methodText = method ? `Método: ${method.toUpperCase()}` : null;
    const attestationText = attestationHash
      ? `Attestation: ${attestationHash.slice(0, 12)}…`
      : null;
    return [roleText, methodText, attestationText].filter(Boolean).join(' | ') || null;
  }

  if (kind === 'identity.session.presence.closed') {
    const trenza = asRecord(payload.trenza);
    const timestampEvidence = asRecord(payload.timestamp_evidence);
    const status = typeof trenza?.status === 'string' ? trenza.status : null;
    const confirmedStrands =
      typeof trenza?.confirmed_strands === 'number' ? trenza.confirmed_strands : null;
    const requiredStrands =
      typeof trenza?.required_strands === 'number' ? trenza.required_strands : null;
    const tsaStatus = typeof timestampEvidence?.tsa === 'string' ? timestampEvidence.tsa : null;
    const actaHash = typeof payload.acta_hash === 'string' ? payload.acta_hash : null;

    const trenzaText =
      confirmedStrands !== null && requiredStrands !== null
        ? `Trenza: ${confirmedStrands}/${requiredStrands}`
        : null;
    const statusText = status ? `Estado: ${status}` : null;
    const tsaText = tsaStatus ? `TSA: ${tsaStatus}` : null;
    const actaText = actaHash ? `Acta: ${actaHash.slice(0, 12)}…` : null;

    return [trenzaText, statusText, tsaText, actaText].filter(Boolean).join(' | ') || null;
  }

  return null;
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
      const presenceDetails = getPresenceDetails(evt);
      const label = tsaLabel || anchorLabel || DOCUMENT_LABELS[kind] || `Evento: ${kind}`;
      const id = `doc-${kind}-${evt.at}-${idx}`;
      return {
        id,
        kind,
        at: evt.at as string,
        source: 'document' as const,
        label,
        details: presenceDetails,
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
