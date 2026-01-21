export type EventLike = { kind?: string };
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

// Verifica si hay un anchor confirmado para una red específica
const hasAnchorConfirmed = (events: EventLike[], network: 'polygon' | 'bitcoin'): boolean => {
  return events.some((event) => {
    // Verificar que sea el tipo correcto de evento
    if (event.kind !== 'anchor' && event.kind !== 'anchor.confirmed') {
      return false;
    }

    // Verificar que tenga la red correcta
    const hasCorrectNetwork = ((event as any).anchor?.network === network || (event as any).payload?.network === network);
    if (!hasCorrectNetwork) {
      return false;
    }

    // Verificar que tenga confirmed_at
    const confirmedAtValue = (event as any).anchor?.confirmed_at || (event as any).payload?.confirmed_at;
    if (!confirmedAtValue) {
      return false;
    }

    // Verificar causalidad temporal: confirmed_at >= at
    try {
      const confirmedAt = new Date(confirmedAtValue);
      const at = new Date(event.at);
      if (confirmedAt < at) {
        return false; // Rompe causalidad temporal
      }
    } catch {
      return false; // Fecha inválida
    }

    return true;
  });
};

// Nota: 'anchor.confirmed' reservado para futura fase,
// hoy 'anchor' con confirmed_at es el canónico

// Verifica si todos los anclajes requeridos están confirmados
const hasRequiredAnchors = (events: EventLike[], protection: string[]): boolean => {
  const hasPolygon = protection.includes('polygon') ? hasAnchorConfirmed(events, 'polygon') : true;
  const hasBitcoin = protection.includes('bitcoin') ? hasAnchorConfirmed(events, 'bitcoin') : true;

  return hasPolygon && hasBitcoin;
};

export const decideProtectDocumentV2Pipeline = (
  events: EventLike[],
  protection: string[],
): ProtectV2PipelineDecision => {
  if (!hasEvent(events, 'document.protected.requested')) {
    return { jobs: [], reason: 'noop_missing_request' };
  }

  if (!hasEvent(events, 'tsa.confirmed')) {
    return { jobs: ['run_tsa'], reason: 'needs_tsa' };
  }

  // Solo generar artifact si TSA + anclajes requeridos están confirmados
  const hasAllRequiredEvidence = hasRequiredAnchors(events, protection);

  if (!hasEvent(events, 'artifact.finalized') && hasAllRequiredEvidence) {
    return { jobs: ['build_artifact'], reason: 'needs_artifact' };
  }

  const jobs: ProtectV2Job[] = [];
  if (protection.includes('polygon') && !hasAnchorConfirmed(events, 'polygon')) {
    jobs.push('submit_anchor_polygon');
  }
  if (protection.includes('bitcoin') && !hasAnchorConfirmed(events, 'bitcoin')) {
    jobs.push('submit_anchor_bitcoin');
  }

  return jobs.length > 0 ? { jobs, reason: 'needs_anchors' } : { jobs: [], reason: 'noop_complete' };
};
