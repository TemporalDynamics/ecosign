export type WitnessHistoryEntry = {
  at: string;
  hash: string;
  source: string;
  workflow_id: string | null;
  signer_id: string | null;
};

export function buildWitnessHistoryFromEvents(events: any[]): WitnessHistoryEntry[] {
  if (!Array.isArray(events)) return [];
  const entries = events
    .filter((e) => e?.kind === 'signature.completed')
    .map((e) => {
      const hash = e?.evidence?.witness_pdf_hash ?? e?.payload?.witness_pdf_hash ?? null;
      if (!hash) return null;
      return {
        at: e?.at ?? new Date().toISOString(),
        hash,
        source: 'signature_flow',
        workflow_id: e?.workflow?.id ?? e?.payload?.workflow_id ?? null,
        signer_id: e?.signer?.id ?? e?.payload?.signer_id ?? null,
      } as WitnessHistoryEntry;
    })
    .filter(Boolean) as WitnessHistoryEntry[];

  entries.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return entries;
}

function witnessHistoryKey(entry: any): string {
  return `${entry?.hash ?? ''}|${entry?.signer_id ?? ''}|${entry?.workflow_id ?? ''}`;
}

export function reconcileWitnessHistory(
  existingHistory: any[],
  events: any[],
  currentEntry?: WitnessHistoryEntry
): WitnessHistoryEntry[] {
  const history = Array.isArray(existingHistory) ? [...existingHistory] : [];
  const seen = new Set(history.map(witnessHistoryKey));

  const ledgerEntries = buildWitnessHistoryFromEvents(events);
  for (const entry of ledgerEntries) {
    const key = witnessHistoryKey(entry);
    if (!seen.has(key)) {
      history.push(entry);
      seen.add(key);
    }
  }

  if (currentEntry) {
    const key = witnessHistoryKey(currentEntry);
    if (!seen.has(key)) {
      history.push(currentEntry);
    }
  }

  return history;
}
