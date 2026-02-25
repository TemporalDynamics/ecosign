import React from 'react';
import { Clock } from 'lucide-react';
import Tooltip from './Tooltip';
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

// High-level phases and grouping for human-friendly narrative (user-facing labels)
const PHASES: { key: string; label: string }[] = [
  { key: 'creation', label: 'Creación del documento' },
  { key: 'preparation', label: 'Preparación del documento' },
  { key: 'signing', label: 'Firma' },
  { key: 'protection', label: 'Protección del momento de firma' },
  { key: 'additional', label: 'Protección adicional' },
];

const PHASE_DESCRIPTIONS: Record<string, string> = {
  creation: 'El usuario creó este documento y dio inicio al flujo de firmas.',
  preparation: 'Se definieron las condiciones del flujo de firmas y se protegió el documento antes de enviarlo.',
  signing: 'Un firmante aceptó y firmó este documento.',
  protection: 'Se registró evidencia del estado del documento al momento de la firma.',
  additional: 'Se agregó una capa extra de protección para reforzar la integridad del documento.',
};

const groupEventsByPhase = (events: TimelineEvent[]) => {
  const buckets: Record<string, TimelineEvent[]> = {};
  PHASES.forEach((p) => (buckets[p.key] = []));

  events.forEach((ev) => {
    const kind = ev.kind || '';
    const label = (ev.label || '').toLowerCase();

    // Creation
    if (kind.includes('created') || label.includes('documento creado') || kind === 'document.created') {
      buckets.creation.push(ev);
      return;
    }

    // Preparation / configuration / operation-level events
    if (
      kind.startsWith('operation.') ||
      label.includes('protección') ||
      label.includes('prepar') ||
      label.includes('configur') ||
      label.includes('nda')
    ) {
      buckets.preparation.push(ev);
      return;
    }

    // Signing
    if (
      kind.includes('signature') ||
      kind.startsWith('identity.session.presence') ||
      label.includes('firma') ||
      label.includes('signed') ||
      label.includes('signature')
    ) {
      buckets.signing.push(ev);
      return;
    }

    // Protection (TSA / certification)
    if (
      kind === 'tsa.confirmed' ||
      kind === 'tsa.failed' ||
      label.includes('sello de tiempo') ||
      label.includes('evidencia temporal') ||
      label.includes('certific')
    ) {
      buckets.protection.push(ev);
      return;
    }

    // Additional protection / anchoring
    if (
      kind === 'anchor' ||
      kind === 'anchor.confirmed' ||
      kind === 'anchor.pending' ||
      kind === 'anchor.failed' ||
      label.includes('anclaje') ||
      label.includes('anchaj') ||
      label.includes('anchor')
    ) {
      buckets.additional.push(ev);
      return;
    }

    // Default to preparation
    buckets.preparation.push(ev);
  });

  return PHASES.map((p) => ({ phase: p.label, key: p.key, items: buckets[p.key] }));
};

const VerifierTimelineNarrative: React.FC<{ events: TimelineEvent[] }> = ({ events }) => {
  const groups = groupEventsByPhase(events).filter((g) => g.items.length > 0).map((g) => g.phase);
  if (groups.length === 0) return null;
  return (
    <p className="text-sm text-gray-700 mb-3">Este timeline refleja: {groups.join(' → ')}.</p>
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
        <div className="ml-2">
          <Tooltip
            term={<span className="text-xs text-gray-600">¿Qué es?</span>}
            definition={<div><p className="font-semibold">¿Qué es la historia del documento?</p><p>Es un resumen cronológico de lo que ocurrió con este documento. Muestra los eventos registrados en el certificado (.ECO), ordenados en el tiempo.</p></div>}
          />
        </div>
      </div>
      {note && <p className="text-xs text-gray-500 mb-2">{note}</p>}

      {/* Human-friendly narrative */}
      <VerifierTimelineNarrative events={events} />

      <div className="border-l border-gray-200 pl-4 space-y-4">
        {groupEventsByPhase(events).map(({ phase, key, items }) => (
          <div key={key} className="mb-4">
            <div className="text-xs font-semibold text-gray-700 mb-1">{phase}</div>
            {PHASE_DESCRIPTIONS[key] && (
              <div className="text-xs text-gray-600 mb-2">{PHASE_DESCRIPTIONS[key]}</div>
            )}

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

      {/* Privacy & legal blocks */}
      <div className="mt-4 text-sm text-gray-700 space-y-2">
        <div>
          <div className="font-semibold">Privacidad</div>
          <div className="text-xs text-gray-600">EcoSign no ve el contenido del documento. La verificación se realiza de forma local en tu dispositivo usando el archivo y su evidencia asociada. Sólo las personas que tengan el documento y su certificado pueden verificarlo.</div>
        </div>

        <div>
          <div className="font-semibold">Sobre la evidencia</div>
          <div className="text-xs text-gray-600">Este registro conserva evidencia de lo ocurrido en ese momento y ayuda a documentar cómo estaba el documento durante el proceso de firma. El valor legal final puede depender de la jurisdicción y del contexto, pero conservar esta evidencia aumenta significativamente tu capacidad para respaldar tu versión de los hechos.</div>
        </div>

        <div>
          <div className="font-semibold">Cuidado del documento</div>
          <div className="text-xs text-gray-600">Conservá este documento tal como está. Si el contenido cambia, la verificación dejará de coincidir. Si necesitás reenviarlo, compartí siempre el documento junto con su certificado (.ECO).</div>
        </div>

        <div className="pt-2">
          <a href="/login?mode=signup" className="inline-block bg-black text-white font-semibold py-2 px-4 rounded-lg">Creá tu cuenta gratuita</a>
          <div className="text-xs text-gray-500 mt-2">Sin tarjeta. Ecosign no ve el contenido de tus archivos.</div>
        </div>

        <div className="text-xs text-gray-500">Referencia canónica: UTC. Hora mostrada en tu zona local.</div>
      </div>
    </div>
  );
}
