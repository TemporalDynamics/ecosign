import React from 'react';
import { Clock } from 'lucide-react';
import type { TimelineEvent } from '../lib/verifier/types';

type VerifierTimelineProps = {
  events: TimelineEvent[];
  loading?: boolean;
  error?: string | null;
  note?: string;
};

const formatUtcTooltip = (at: string) => {
  const utc = new Date(at).toISOString();
  return `UTC: ${utc}`;
};

// High-level phases and grouping for human-friendly narrative
const PHASES: { key: string; label: string }[] = [
  { key: 'creation', label: 'Creación' },
  { key: 'configuration', label: 'Configuración' },
  { key: 'signing', label: 'Firma' },
  { key: 'certification', label: 'Certificación' },
  { key: 'anchoring', label: 'Anclaje' },
];

const groupEventsByPhase = (events: TimelineEvent[]) => {
  const buckets: Record<string, TimelineEvent[]> = {};
  PHASES.forEach((p) => (buckets[p.key] = []));

  events.forEach((ev) => {
    const kind = ev.kind || '';
    const label = (ev.label || '').toLowerCase();

    // Creation
    if (kind.includes('created') || label.includes('documento creado')) {
      buckets.creation.push(ev);
      return;
    }

    // Configuration / workflow / operation-level events
    if (
      kind.includes('protection') ||
      label.includes('protección') ||
      label.includes('nda') ||
      kind.startsWith('operation.')
    ) {
      buckets.configuration.push(ev);
      return;
    }

    // Signing
    if (kind.includes('signature') || label.includes('firma') || label.includes('signed') || label.includes('signature')) {
      buckets.signing.push(ev);
      return;
    }

    // Certification / TSA
    if (kind === 'tsa' || label.includes('sello de tiempo') || label.includes('evidencia temporal')) {
      buckets.certification.push(ev);
      return;
    }

    // Anchoring
    if (kind === 'anchor' || label.includes('anclaje') || label.includes('anchaj')) {
      buckets.anchoring.push(ev);
      return;
    }

    // Default to configuration
    buckets.configuration.push(ev);
  });

  return PHASES.map((p) => ({ phase: p.label, items: buckets[p.key] }));
};

const VerifierTimelineNarrative: React.FC<{ events: TimelineEvent[] }> = ({ events }) => {
  const phasesWithEvents = groupEventsByPhase(events).filter((g) => g.items.length > 0).map((g) => g.phase);
  if (phasesWithEvents.length === 0) return null;
  return (
    <p className="text-sm text-gray-700 mb-3">UI refleja: {phasesWithEvents.join(' → ')}.</p>
  );
};

export default function VerifierTimeline({ events, loading = false, error = null, note }: VerifierTimelineProps) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 text-gray-700">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-semibold">Cronología verificada</span>
        </div>
        {note && <p className="text-xs text-gray-500 mt-2">{note}</p>}
        <p className="text-sm text-gray-600 mt-3">Cargando eventos…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 text-gray-700">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-semibold">Cronología verificada</span>
        </div>
        {note && <p className="text-xs text-gray-500 mt-2">{note}</p>}
        <p className="text-sm text-gray-600 mt-3">{error}</p>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 text-gray-700">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-semibold">Cronología verificada</span>
        </div>
        {note && <p className="text-xs text-gray-500 mt-2">{note}</p>}
        <p className="text-sm text-gray-600 mt-3">No hay eventos registrados para este documento.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center gap-2 text-gray-700 mb-2">
        <Clock className="w-4 h-4" />
        <span className="text-sm font-semibold">Cronología verificada</span>
      </div>
      {note && <p className="text-xs text-gray-500 mb-2">{note}</p>}

      {/* Human-friendly narrative */}
      <VerifierTimelineNarrative events={events} />

      <div className="border-l border-gray-200 pl-4 space-y-4">
        {groupEventsByPhase(events).map(({ phase, items }) => (
          <div key={phase} className="mb-3">
            <div className="text-xs font-semibold text-gray-700 mb-2">{phase}</div>
            {items.map((event) => {
              const localTime = new Date(event.at).toLocaleString();
              return (
                <div key={event.id} className="relative mb-2">
                  <div className="absolute -left-[23px] top-1.5 w-2 h-2 rounded-full bg-[#0E4B8B]" />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{event.label}</div>
                      {event.details && (
                        <div className="text-xs text-gray-600 mt-0.5">{event.details}</div>
                      )}
                    </div>
                    <div className="text-xs text-gray-600" title={formatUtcTooltip(event.at)}>
                      {localTime}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-3">La UI refleja eventos registrados en el certificado (.ECO); no afirma validez legal.</p>
    </div>
  );
}
