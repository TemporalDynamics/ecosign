import type { DocumentEventEntry, OperationEventRow, TimelineEvent } from './types';
import { buildCreatedEvent, normalizeDocumentEvents, normalizeOperationEvents } from './normalizeEvents';

const dedupeKey = (event: TimelineEvent): string => {
  const parts = [event.kind, event.at, event.operationId ?? '', event.documentId ?? '', event.label];
  return parts.join('|');
};

export const buildTimeline = (input: {
  documentEvents?: DocumentEventEntry[];
  operationEvents?: OperationEventRow[];
  createdAt?: string | null;
}): TimelineEvent[] => {
  const timeline: TimelineEvent[] = [];
  const created = buildCreatedEvent(input.createdAt ?? null);
  if (created) timeline.push(created);

  timeline.push(...normalizeDocumentEvents(input.documentEvents ?? []));
  timeline.push(...normalizeOperationEvents(input.operationEvents ?? []));

  const seen = new Set<string>();
  const deduped: TimelineEvent[] = [];
  timeline.forEach((evt) => {
    const key = dedupeKey(evt);
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(evt);
  });

  return deduped.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
};
