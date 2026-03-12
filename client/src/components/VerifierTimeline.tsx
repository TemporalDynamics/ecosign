import React, { useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import Tooltip from './Tooltip';
import type { TimelineEvent } from '../lib/verifier/types';

type VerifierTimelineProps = {
  events: TimelineEvent[];
  loading?: boolean;
  error?: string | null;
  note?: string;
  showSignupCta?: boolean;
  showTrustSummary?: boolean;
  showLegalBlocks?: boolean;
  showTechnicalToggle?: boolean;
};

const formatUtcTooltip = (at: string) => {
  const utc = new Date(at).toISOString();
  return `UTC: ${utc}`;
};

type HumanMilestone = {
  id: string;
  title: string;
  description: string;
  at: string;
};

type TimelineSummary = {
  signatureCount: number;
  hasInitialProtection: boolean;
  hasAdditionalProtection: boolean;
  hasAdditionalProtectionPending: boolean;
  milestones: HumanMilestone[];
};

const sortByAt = (events: TimelineEvent[]) =>
  [...events].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

const isSignatureEvent = (event: TimelineEvent) => {
  const kind = (event.kind || '').toLowerCase();
  const completedKinds = new Set([
    'signature',
    'signature.completed',
    'signature_applied',
    'signature_completed',
    'signer.signed',
    'workflow.signer.signed',
  ]);
  return (
    completedKinds.has(kind) ||
    kind.endsWith('.signed') ||
    kind.includes('signature.completed')
  );
};

const isAnchorEvent = (event: TimelineEvent) => {
  const kind = (event.kind || '').toLowerCase();
  const label = (event.label || '').toLowerCase();
  return kind.includes('anchor') || label.includes('anclaje') || label.includes('anchor');
};

const isAnchorPending = (event: TimelineEvent) => {
  const kind = (event.kind || '').toLowerCase();
  const label = (event.label || '').toLowerCase();
  return kind.includes('pending') || label.includes('pendiente');
};

const isProtectionEvent = (event: TimelineEvent) => {
  const kind = (event.kind || '').toLowerCase();
  const label = (event.label || '').toLowerCase();
  return (
    kind === 'tsa.confirmed' ||
    kind === 'document.protected' ||
    kind === 'document.protected.requested' ||
    kind === 'document.certified' ||
    kind.includes('tsa') ||
    label.includes('sello de tiempo') ||
    label === 'documento protegido' ||
    label === 'protección solicitada'
  );
};

const buildHumanTimeline = (events: TimelineEvent[]): TimelineSummary => {
  const ordered = sortByAt(events);
  const firstEvent = ordered[0];
  const signatureEvents = ordered.filter(isSignatureEvent);
  const anchorEvents = ordered.filter(isAnchorEvent);
  const protectionEvents = ordered.filter(isProtectionEvent);

  const firstSignature = signatureEvents[0];
  const firstSignatureAt = firstSignature ? new Date(firstSignature.at).getTime() : null;
  const initialProtectionEvent =
    firstSignatureAt === null
      ? protectionEvents[0]
      : protectionEvents.find((evt) => new Date(evt.at).getTime() < firstSignatureAt);
  const signatureProtectionEvent =
    firstSignatureAt === null
      ? null
      : protectionEvents.find((evt) => new Date(evt.at).getTime() >= firstSignatureAt);

  const milestones: HumanMilestone[] = [];
  if (firstEvent) {
    milestones.push({
      id: 'prepared',
      title: 'El documento fue preparado para su protección',
      description:
        'Se generó evidencia inicial para dejar constancia del contenido del archivo en ese momento.',
      at: firstEvent.at,
    });
  }

  if (initialProtectionEvent) {
    milestones.push({
      id: 'initial-protection',
      title: 'Se registró el momento de protección',
      description:
        'Quedó asentada la fecha y hora de protección para respaldar que el documento existía así en ese momento.',
      at: initialProtectionEvent.at,
    });
  }

  if (firstSignature) {
    const multipleSignatures = signatureEvents.length > 1;
    milestones.push({
      id: 'signature',
      title:
        signatureEvents.length > 1
          ? `${signatureEvents.length} personas firmaron este documento`
          : 'Una persona firmó este documento',
      description:
        multipleSignatures
          ? 'Cada firma puede generar una nueva versión del PDF. Este certificado valida la versión correspondiente a ese momento.'
          : 'Se registró una firma sobre esta versión del archivo.',
      at: firstSignature.at,
    });
  }

  if (signatureProtectionEvent) {
    milestones.push({
      id: 'signature-protection',
      title: 'Se protegió el momento de la firma',
      description:
        'Se dejó evidencia del estado exacto del documento al momento de la firma.',
      at: signatureProtectionEvent.at,
    });
  }

  const firstAnchor = anchorEvents[0];
  if (firstAnchor) {
    milestones.push({
      id: 'additional-protection',
      title: 'Se agregó una capa adicional de resguardo',
      description:
        'Se incorporó protección complementaria para reforzar la integridad y la trazabilidad de la evidencia.',
      at: firstAnchor.at,
    });
  }

  const uniqueMilestones = milestones
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .filter((milestone, index, source) => source.findIndex((item) => item.id === milestone.id) === index);

  return {
    signatureCount: signatureEvents.length,
    hasInitialProtection: Boolean(initialProtectionEvent),
    hasAdditionalProtection: anchorEvents.length > 0 && !anchorEvents.every(isAnchorPending),
    hasAdditionalProtectionPending: anchorEvents.length > 0 && anchorEvents.some(isAnchorPending),
    milestones: uniqueMilestones,
  };
};

export default function VerifierTimeline({
  events,
  loading = false,
  error = null,
  note,
  showSignupCta = true,
  showTrustSummary = true,
  showLegalBlocks = true,
  showTechnicalToggle = true,
}: VerifierTimelineProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const summary = useMemo(() => buildHumanTimeline(events), [events]);
  const ndaAcceptances = useMemo(() => {
    const items = events
      .filter((evt) => (evt.kind || '').toLowerCase() === 'nda.accepted' || (evt.kind || '').toLowerCase() === 'nda_accepted')
      .map((evt) => ({
        id: evt.id,
        at: evt.at,
        detail: evt.details || 'NDA aceptado',
      }));
    return items;
  }, [events]);

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

      {showTrustSummary && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 mb-4">
          <div className="text-sm font-semibold text-gray-900">Resumen de confianza</div>
          <p className="text-xs text-gray-600 mt-1">
            Esta vista resume lo que pasó con el documento en lenguaje simple.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            <div className="rounded-md border border-blue-100 bg-white px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Integridad</div>
              <div className="text-sm font-semibold text-[#0E4B8B]">Confirmada</div>
            </div>
            <div className="rounded-md border border-blue-100 bg-white px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Momento de protección</div>
              <div className="text-sm font-semibold text-gray-900">
                {summary.hasInitialProtection ? 'Registrado' : 'No visible en esta evidencia'}
              </div>
            </div>
            <div className="rounded-md border border-blue-100 bg-white px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Protección adicional</div>
              <div className="text-sm font-semibold text-gray-900">
                {summary.hasAdditionalProtection
                  ? 'Presente'
                  : summary.hasAdditionalProtectionPending
                  ? 'Pendiente'
                  : 'No registrada'}
              </div>
            </div>
            <div className="rounded-md border border-blue-100 bg-white px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Firmas</div>
              <div className="text-sm font-semibold text-gray-900">
                {summary.signatureCount > 0
                  ? `${summary.signatureCount} registrada${summary.signatureCount > 1 ? 's' : ''}`
                  : 'No registra firmas'}
              </div>
            </div>
          </div>
        </div>
      )}

      {ndaAcceptances.length > 0 && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
          <div className="text-xs font-semibold text-gray-700">Accesos con NDA</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {ndaAcceptances.map((entry) => (
              <div
                key={entry.id}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700"
                title={new Date(entry.at).toLocaleString()}
              >
                {entry.detail}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-sm font-semibold text-gray-900 mb-2">Historia del documento</div>
      <div className="border-l border-gray-200 pl-4 space-y-4">
        {summary.milestones.map((milestone) => (
          <div key={milestone.id} className="relative">
            <div className="absolute -left-[23px] top-1.5 w-2 h-2 rounded-full bg-[#0E4B8B]" />
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
              <div>
                <div className="text-sm font-medium text-gray-900">{milestone.title}</div>
                <div className="text-xs text-gray-600 mt-0.5">{milestone.description}</div>
              </div>
              <div className="text-xs text-gray-600" title={formatUtcTooltip(milestone.at)}>
                {new Date(milestone.at).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showTechnicalToggle && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowTechnicalDetails((prev) => !prev)}
            className="text-xs text-gray-600 hover:text-gray-900 underline"
          >
            {showTechnicalDetails ? 'Ocultar detalle técnico' : 'Ver detalle técnico (forense)'}
          </button>
          {showTechnicalDetails && (
            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
              {sortByAt(events).map((event) => (
                <div key={event.id} className="text-xs">
                  <div className="font-semibold text-gray-900">{event.label}</div>
                  <div className="text-gray-600">
                    kind: <span className="font-mono">{event.kind}</span>
                    {' · '}
                    at: {new Date(event.at).toLocaleString()}
                  </div>
                  {event.details && <div className="text-gray-600 mt-1">{event.details}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Privacy & legal blocks */}
      {showLegalBlocks && (
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

        {showSignupCta && (
          <div className="pt-2">
            <a href="/login?mode=signup" className="inline-block bg-black text-white font-semibold py-2 px-4 rounded-lg">Creá tu cuenta gratuita</a>
            <div className="text-xs text-gray-500 mt-2">Sin tarjeta. Ecosign no ve el contenido de tus archivos.</div>
          </div>
        )}

        <div className="text-xs text-gray-500">Referencia canónica: UTC. Hora mostrada en tu zona local.</div>
      </div>
      )}
    </div>
  );
}
