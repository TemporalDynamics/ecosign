export type EventLike = { kind?: string; at?: string; payload?: Record<string, unknown> };
export type FlowType = 'DIRECT_PROTECTION' | 'SIGNATURE_FLOW';
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

const getLatestProtectionRequestEvent = (events: EventLike[]): { payload?: Record<string, unknown> } | undefined => {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (events[i]?.kind === 'document.protected.requested') {
      return events[i] as { payload?: Record<string, unknown> };
    }
  }
  return undefined;
};

export const getRequiredEvidenceFromEvents = (events: EventLike[]): string[] => {
  const requestEvent = getLatestProtectionRequestEvent(events);
  const requiredEvidence = requestEvent?.payload?.['required_evidence'];
  if (Array.isArray(requiredEvidence)) {
    return requiredEvidence.filter((item): item is string => typeof item === 'string');
  }

  return [];
};

// Verifica si hay un anchor confirmado para una red específica
export const hasAnchorConfirmed = (events: EventLike[], network: 'polygon' | 'bitcoin'): boolean => {
  return events.some((event: any) => {
    const isCanonical = event.kind === 'anchor.confirmed';
    const isLegacy = event.kind === 'anchor';
    if (!isCanonical && !isLegacy) return false;

    // Canonical anchor events are stored under `event.anchor`.
    // Keep fallback to payload for backward compatibility.
    const anchorData = event.anchor ?? event.payload;
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
export const hasRequiredAnchors = (events: EventLike[], protection: string[]): boolean => {
  const hasPolygon = protection.includes('polygon') ? hasAnchorConfirmed(events, 'polygon') : true;
  const hasBitcoin = protection.includes('bitcoin') ? hasAnchorConfirmed(events, 'bitcoin') : true;

  return hasPolygon && hasBitcoin;
};

export const hasDocumentCertifiedForWitness = (
  events: EventLike[],
  witnessHash: string | null,
): boolean => {
  return events.some((event: any) => {
    if (event?.kind !== 'document.certified') return false;
    const payload = event?.payload ?? {};
    const eventWitness = typeof payload?.witness_hash === 'string' ? payload.witness_hash : null;
    if (!witnessHash || !eventWitness) return true;
    return eventWitness === witnessHash;
  });
};

export const decideProtectDocumentV2Pipeline = (
  events: EventLike[],
): ProtectV2PipelineDecision => {
  const requestEvent = getLatestProtectionRequestEvent(events);
  if (!requestEvent) {
    return { jobs: [], reason: 'noop_missing_request' };
  }

  if (!hasEvent(events, 'tsa.confirmed')) {
    return { jobs: ['run_tsa'], reason: 'needs_tsa' };
  }

  const payload = requestEvent.payload ?? {};
  const flowType = payload['flow_type'] === 'SIGNATURE_FLOW' ? 'SIGNATURE_FLOW' : 'DIRECT_PROTECTION';
  const stageFromPayload = payload['anchor_stage'] === 'final'
    ? 'final'
    : (payload['anchor_stage'] === 'intermediate' ? 'intermediate' : 'initial');
  const isSignatureTerminal = flowType !== 'SIGNATURE_FLOW' || stageFromPayload === 'final';

  if (hasEvent(events, 'artifact.finalized')) {
    return { jobs: [], reason: 'noop_complete' };
  }

  const requiredEvidence = getRequiredEvidenceFromEvents(events);
  const jobs: ProtectV2Job[] = [];
  if (requiredEvidence.includes('polygon') && !hasAnchorConfirmed(events, 'polygon')) {
    jobs.push('submit_anchor_polygon');
  }
  if (requiredEvidence.includes('bitcoin') && !hasAnchorConfirmed(events, 'bitcoin')) {
    jobs.push('submit_anchor_bitcoin');
  }

  // Snapshots (signature flow pre-terminal) never emit final ECO artifact.
  if (isSignatureTerminal) {
    // ECO final is TSA-gated, while chain anchors are best-effort strengthening.
    jobs.unshift('build_artifact');
    return { jobs, reason: 'needs_artifact' };
  }

  return jobs.length > 0 ? { jobs, reason: 'needs_anchors' } : { jobs: [], reason: 'noop_complete' };
};
