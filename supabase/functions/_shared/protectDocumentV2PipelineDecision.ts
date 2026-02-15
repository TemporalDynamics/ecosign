export type EventLike = { kind?: string; at?: string; payload?: Record<string, unknown> };
export type ProtectV2Job =
  | 'run_tsa'
  | 'build_artifact'
  | 'submit_anchor_polygon'
  | 'submit_anchor_bitcoin';

export type ProtectV2PipelineDecision = {
  jobs: ProtectV2Job[];
  reason?: 'noop_missing_request' | 'noop_complete' | 'needs_tsa' | 'needs_artifact' | 'needs_anchors';
};

const hasEvent = (events: EventLike[], kind: string) => events.some((event) => event.kind === kind);

const getRequiredEvidenceFromEvents = (events: EventLike[], fallbackProtection?: string[]): string[] => {
  const requestEvent = events.find((event) => event.kind === 'document.protected.requested') as
    | { payload?: Record<string, unknown> }
    | undefined;
  const requiredEvidence = requestEvent?.payload?.['required_evidence'];
  if (Array.isArray(requiredEvidence)) {
    return requiredEvidence.filter((item): item is string => typeof item === 'string');
  }

  const legacyProtection = requestEvent?.payload?.['protection'];
  if (Array.isArray(legacyProtection)) {
    return legacyProtection.filter((item): item is string => typeof item === 'string');
  }

  if (Array.isArray(fallbackProtection)) {
    return fallbackProtection.filter((item): item is string => typeof item === 'string');
  }

  return [];
};

// Verifica si hay un anchor confirmado para una red específica
const hasAnchorConfirmed = (events: EventLike[], network: 'polygon' | 'bitcoin'): boolean => {
  return events.some((event: any) => {
    const isCanonical = event.kind === 'anchor.confirmed';
    const isLegacy = event.kind === 'anchor';
    if (!isCanonical && !isLegacy) return false;

    const anchorData = isCanonical ? event.payload : event.anchor;
    const hasCorrectNetwork = anchorData?.network === network;
    if (!hasCorrectNetwork) return false;

    const confirmedAtValue = anchorData?.confirmed_at;
    if (!confirmedAtValue) {
      return false;
    }

    // Verificar causalidad temporal: confirmed_at >= at
    try {
      const confirmedAt = new Date(confirmedAtValue);
      const atValue = event.at;
      if (typeof atValue !== 'string' || !atValue) return false;
      const at = new Date(atValue);
      if (confirmedAt < at) {
        return false; // Rompe causalidad temporal
      }
    } catch {
      return false; // Fecha inválida
    }

    return true;
  });
};

// Nota: hoy el evento canónico es 'anchor.confirmed' con payload.confirmed_at

// Verifica si todos los anclajes requeridos están confirmados
const hasRequiredAnchors = (events: EventLike[], protection: string[]): boolean => {
  const hasPolygon = protection.includes('polygon') ? hasAnchorConfirmed(events, 'polygon') : true;
  const hasBitcoin = protection.includes('bitcoin') ? hasAnchorConfirmed(events, 'bitcoin') : true;

  return hasPolygon && hasBitcoin;
};

export const decideProtectDocumentV2Pipeline = (
  events: EventLike[],
  protection?: string[],
): ProtectV2PipelineDecision => {
  if (!hasEvent(events, 'document.protected.requested')) {
    return { jobs: [], reason: 'noop_missing_request' };
  }

  if (!hasEvent(events, 'tsa.confirmed')) {
    return { jobs: ['run_tsa'], reason: 'needs_tsa' };
  }

  const requiredEvidence = getRequiredEvidenceFromEvents(events, protection);

  // Solo generar artifact si TSA + anclajes requeridos están confirmados
  const hasAllRequiredEvidence = hasRequiredAnchors(events, requiredEvidence);

  if (!hasEvent(events, 'artifact.finalized') && hasAllRequiredEvidence) {
    return { jobs: ['build_artifact'], reason: 'needs_artifact' };
  }

  const jobs: ProtectV2Job[] = [];
  if (requiredEvidence.includes('polygon') && !hasAnchorConfirmed(events, 'polygon')) {
    jobs.push('submit_anchor_polygon');
  }
  if (requiredEvidence.includes('bitcoin') && !hasAnchorConfirmed(events, 'bitcoin')) {
    jobs.push('submit_anchor_bitcoin');
  }

  return jobs.length > 0 ? { jobs, reason: 'needs_anchors' } : { jobs: [], reason: 'noop_complete' };
};
