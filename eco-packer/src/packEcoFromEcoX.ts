import { Project } from '@vista/timeline-engine';
import { canonicalize } from './eco-utils';

// Helper to calculate total duration from segments (robust/simple)
function calculateDuration(segments: any[] = []): number {
  if (!segments || segments.length === 0) return 0;
  const last = segments[segments.length - 1];
  // best-effort calculation with fallbacks
  const projectStart = typeof last.projectStartTime === 'number' ? last.projectStartTime : 0;
  const start = typeof last.startTime === 'number' ? last.startTime : 0;
  const end = typeof last.endTime === 'number' ? last.endTime : start;
  const speed = last.speed || 1;
  return projectStart + (end - start) / (speed || 1);
}

function createSegmentSummary(segments: any[] = []): any[] {
  return segments.map((s: any) => ({
    id: s.id,
    assetId: s.assetId,
    projectStartTime: s.projectStartTime ?? s.start ?? 0,
    duration: (typeof s.endTime === 'number' && typeof s.startTime === 'number')
      ? (s.endTime - s.startTime) / (s.speed || 1)
      : s.duration ?? 0
  }));
}

export interface PublicEcoMetadata {
  schemaVersion: string;
  projectId: string;
  title: string;
  duration: number;
  segmentsSummary: any[];
  sourceSignature?: string; // Firma original del ECOX si existe
  timestamp: string;
  // ... otros campos públicos que se decidan exponer
}

/**
 * Packs a sanitized, public .ECO manifest from a full .ECOX project object.
 * The function is defensive about the exact Project shape coming from
 * different versions of @vista/timeline-engine.
 *
 * @param ecoXProject The full project object (may be typed or plain any)
 * @param ecoXSignature Signature string from the ECOX
 * @returns canonical JSON string for embedding
 */
export function packEcoFromEcoX(ecoXProject: any, ecoXSignature: string): string {
  // 1. Extraer solo los datos públicos y sanitizados
  const schemaVersion = ecoXProject?.specVersion ?? ecoXProject?.version ?? '1.0.0';
  const projectId = ecoXProject?.id ?? ecoXProject?.projectId ?? '';
  const title = ecoXProject?.name ?? ecoXProject?.title ?? '';
  const segments = ecoXProject?.timeline ?? ecoXProject?.segments ?? ecoXProject?.segmentsSummary ?? [];

  const publicData: PublicEcoMetadata = {
    schemaVersion,
    projectId,
    title,
    duration: calculateDuration(segments),
    segmentsSummary: createSegmentSummary(segments),
    ...(ecoXSignature ? { sourceSignature: ecoXSignature } : {}),
    timestamp: new Date().toISOString()
  };

  // 2. Canonicalizar y devolver el JSON String
  // No necesita firma adicional si reutiliza la del ECOX
  return canonicalize(publicData);
}
