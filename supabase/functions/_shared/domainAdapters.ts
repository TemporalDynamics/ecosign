/**
 * Adaptadores de Dominio para el Sistema Canónico
 * 
 * Estos adaptadores convierten el modelo canónico (document_entities)
 * a formatos que pueden consumir otros componentes del sistema
 * sin exponer la complejidad interna del modelo canónico.
 */

type DocumentEntity = {
  id: string;
  owner_id: string;
  source_hash: string;
  witness_hash: string;
  signed_hash: string;
  composite_hash: string;
  lifecycle_status: string;
  created_at: string;
  updated_at: string;
  events?: unknown;
  metadata?: Record<string, unknown>;
};

/**
 * Mapea una entidad canónica a un resumen de documento
 * 
 * @param entity - Entidad canónica de documento
 * @returns Resumen del documento para listados, UI, etc.
 */
export function mapEntityToDocumentSummary(entity: DocumentEntity): DocumentSummary {
  const events = Array.isArray(entity.events) ? entity.events : [];
  
  // Derivar información desde eventos
  const hasTsa = events.some((e: any) => e.kind === 'tsa.confirmed');
  const hasPolygon = events.some((e: any) => e.kind === 'anchor' && e.anchor?.network === 'polygon');
  const hasBitcoin = events.some((e: any) => e.kind === 'anchor' && e.anchor?.network === 'bitcoin');
  const hasArtifact = events.some((e: any) => e.kind === 'artifact.finalized');
  
  // Derivar estado desde eventos
  let derivedStatus: string = 'created';
  if (hasTsa && !hasPolygon && !hasBitcoin) derivedStatus = 'protected';
  if (hasTsa && (hasPolygon || hasBitcoin)) derivedStatus = 'anchored';
  if (hasTsa && hasPolygon && hasBitcoin && hasArtifact) derivedStatus = 'completed';
  if (hasTsa && hasPolygon && hasBitcoin && !hasArtifact) derivedStatus = 'ready_for_artifact';
  
  return {
    id: entity.id,
    owner_id: entity.owner_id,
    source_hash: entity.source_hash,
    witness_hash: entity.witness_hash,
    signed_hash: entity.signed_hash,
    composite_hash: entity.composite_hash,
    status: derivedStatus,
    lifecycle_status: entity.lifecycle_status,
    has_tsa: hasTsa,
    has_polygon: hasPolygon,
    has_bitcoin: hasBitcoin,
    has_artifact: hasArtifact,
    event_count: events.length,
    created_at: entity.created_at,
    updated_at: entity.updated_at,
    protection_methods: getProtectionMethods(events),
    timeline: generateTimeline(events)
  };
}

/**
 * Mapea una entidad canónica a payload de verificación
 * 
 * @param entity - Entidad canónica de documento
 * @returns Payload para endpoints de verificación
 */
export function mapEntityToVerificationPayload(entity: DocumentEntity): VerificationPayload {
  const events = Array.isArray(entity.events) ? entity.events : [];
  
  return {
    document_id: entity.id,
    source_hash: entity.source_hash,
    witness_hash: entity.witness_hash,
    composite_hash: entity.composite_hash,
    events: events,
    timeline: generateTimeline(events),
    eco_v2: generateEcoV2(entity),
    protection_status: deriveProtectionStatus(events),
    anchor_status: deriveAnchorStatus(events),
    verification_timestamp: new Date().toISOString()
  };
}

/**
 * Mapea una entidad canónica a contexto de compartir
 * 
 * @param entity - Entidad canónica de documento
 * @returns Contexto para compartir documentos
 */
export function mapEntityToShareContext(entity: DocumentEntity): ShareContext {
  const events = Array.isArray(entity.events) ? entity.events : [];
  
  return {
    document_id: entity.id,
    entity_id: entity.id,
    source_hash: entity.source_hash,
    witness_hash: entity.witness_hash,
    status: entity.lifecycle_status,
    has_tsa: events.some((e: any) => e.kind === 'tsa.confirmed'),
    has_anchors: events.some((e: any) => e.kind.includes('anchor')),
    has_artifact: events.some((e: any) => e.kind === 'artifact.finalized'),
    protection_methods: getProtectionMethods(events),
    created_at: entity.created_at,
    updated_at: entity.updated_at
  };
}

/**
 * Mapea una entidad canónica a datos de exportación
 * 
 * @param entity - Entidad canónica de documento
 * @returns Datos estructurados para exportación
 */
export function mapEntityToExportData(entity: DocumentEntity): ExportData {
  const events = Array.isArray(entity.events) ? entity.events : [];
  
  return {
    document: {
      id: entity.id,
      owner_id: entity.owner_id,
      source_hash: entity.source_hash,
      witness_hash: entity.witness_hash,
      signed_hash: entity.signed_hash,
      composite_hash: entity.composite_hash,
      lifecycle_status: entity.lifecycle_status,
      created_at: entity.created_at,
      updated_at: entity.updated_at
    },
    events: events,
    timeline: generateTimeline(events),
    eco_v2: generateEcoV2(entity),
    metadata: entity.metadata || {}
  };
}

// =============================================================================
// FUNCIONES AUXILIARES DE DERIVACIÓN
// =============================================================================

/**
 * Deriva métodos de protección desde eventos
 */
function getProtectionMethods(events: any[]): string[] {
  const protectionMethods: string[] = [];
  
  // Buscar en eventos de protección
  for (const event of events) {
    if (event.kind === 'protection_enabled' && event.payload?.protection?.methods) {
      protectionMethods.push(...event.payload.protection.methods);
    }
    if (event.kind === 'document.created' && event.forensic) {
      if (event.forensic.tsa_requested) protectionMethods.push('tsa');
      if (event.forensic.polygon_requested) protectionMethods.push('polygon');
      if (event.forensic.bitcoin_requested) protectionMethods.push('bitcoin');
    }
  }
  
  return [...new Set(protectionMethods)]; // Eliminar duplicados
}

/**
 * Genera timeline desde eventos
 */
function generateTimeline(events: any[]): TimelineEvent[] {
  if (!Array.isArray(events)) return [];
  
  return events.map(event => ({
    kind: event.kind,
    at: event.at,
    payload: event.payload || {},
    source: event._source || 'unknown'
  })).sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

/**
 * Genera ECO v2 desde eventos canónicos
 */
function generateEcoV2(entity: DocumentEntity): any {
  const events = Array.isArray(entity.events) ? entity.events : [];
  
  // Este es un ejemplo simplificado - la implementación real estaría en packages/eco
  return {
    version: '2.0',
    document_id: entity.id,
    source_hash: entity.source_hash,
    witness_hash: entity.witness_hash,
    events_count: events.length,
    timeline: generateTimeline(events),
    protection_status: deriveProtectionStatus(events),
    anchor_status: deriveAnchorStatus(events),
    generated_at: new Date().toISOString()
  };
}

/**
 * Deriva estado de protección desde eventos
 */
function deriveProtectionStatus(events: any[]): string {
  if (!Array.isArray(events)) return 'none';
  
  const hasTsa = events.some((e: any) => e.kind === 'tsa.confirmed');
  const hasAnchors = events.some((e: any) => e.kind.includes('anchor'));
  const hasArtifact = events.some((e: any) => e.kind === 'artifact.finalized');
  
  if (hasTsa && hasAnchors && hasArtifact) return 'complete';
  if (hasTsa && hasAnchors) return 'anchored';
  if (hasTsa) return 'protected';
  return 'none';
}

/**
 * Deriva estado de anclajes desde eventos
 */
function deriveAnchorStatus(events: any[]): AnchorStatus {
  if (!Array.isArray(events)) return { polygon: 'none', bitcoin: 'none' };
  
  const polygonConfirmed = events.some((e: any) =>
    e.kind === 'anchor' &&
    e.anchor?.network === 'polygon' &&
    e.anchor?.confirmed_at
  );
  
  const bitcoinConfirmed = events.some((e: any) =>
    e.kind === 'anchor' &&
    e.anchor?.network === 'bitcoin' &&
    e.anchor?.confirmed_at
  );
  
  return {
    polygon: polygonConfirmed ? 'confirmed' : 'pending',
    bitcoin: bitcoinConfirmed ? 'confirmed' : 'pending'
  };
}

// =============================================================================
// TIPOS DE DATOS
// =============================================================================

interface DocumentSummary {
  id: string;
  owner_id: string;
  source_hash: string;
  witness_hash: string;
  signed_hash: string;
  composite_hash: string;
  status: string;
  lifecycle_status: string;
  has_tsa: boolean;
  has_polygon: boolean;
  has_bitcoin: boolean;
  has_artifact: boolean;
  event_count: number;
  created_at: string;
  updated_at: string;
  protection_methods: string[];
  timeline: TimelineEvent[];
}

interface VerificationPayload {
  document_id: string;
  source_hash: string;
  witness_hash: string;
  composite_hash: string;
  events: any[];
  timeline: TimelineEvent[];
  eco_v2: any;
  protection_status: string;
  anchor_status: AnchorStatus;
  verification_timestamp: string;
}

interface ShareContext {
  document_id: string;
  entity_id: string;
  source_hash: string;
  witness_hash: string;
  status: string;
  has_tsa: boolean;
  has_anchors: boolean;
  has_artifact: boolean;
  protection_methods: string[];
  created_at: string;
  updated_at: string;
}

interface ExportData {
  document: {
    id: string;
    owner_id: string;
    source_hash: string;
    witness_hash: string;
    signed_hash: string;
    composite_hash: string;
    lifecycle_status: string;
    created_at: string;
    updated_at: string;
  };
  events: any[];
  timeline: TimelineEvent[];
  eco_v2: any;
  metadata: Record<string, any>;
}

interface TimelineEvent {
  kind: string;
  at: string;
  payload: Record<string, any>;
  source: string;
}

interface AnchorStatus {
  polygon: 'none' | 'pending' | 'submitted' | 'confirmed';
  bitcoin: 'none' | 'pending' | 'submitted' | 'confirmed';
}
