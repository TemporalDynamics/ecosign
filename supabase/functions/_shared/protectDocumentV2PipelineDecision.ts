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

  if (!hasEvent(events, 'artifact.finalized')) {
    return { jobs: ['build_artifact'], reason: 'needs_artifact' };
  }

  const jobs: ProtectV2Job[] = [];
  if (protection.includes('polygon')) {
    jobs.push('submit_anchor_polygon');
  }
  if (protection.includes('bitcoin')) {
    jobs.push('submit_anchor_bitcoin');
  }

  return jobs.length > 0 ? { jobs, reason: 'needs_anchors' } : { jobs: [], reason: 'noop_complete' };
};
