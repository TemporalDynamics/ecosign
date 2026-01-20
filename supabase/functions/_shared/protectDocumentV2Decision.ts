export type EventLike = { kind?: string };
export type ProtectV2Decision = 'run_tsa' | 'noop_missing_request' | 'noop_already_tsa';

export const decideProtectDocumentV2 = (events: EventLike[]): ProtectV2Decision => {
  const hasRequest = events.some((event) => event.kind === 'document.protected.requested');
  if (!hasRequest) return 'noop_missing_request';

  const hasTsaConfirmed = events.some((event) => event.kind === 'tsa.confirmed');
  if (hasTsaConfirmed) return 'noop_already_tsa';

  return 'run_tsa';
};
