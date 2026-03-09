// ========================================
// DocumentStateInfo - Cuadro Informativo Sin Estrés
// Muestra el estado del documento de forma clara y tranquila
// ========================================

import React from 'react';
import { deriveDocumentState } from '../lib/deriveDocumentState';
import type { DocumentEntityRow } from '../lib/eco/v2';
import { deriveAnchorProbativeState } from '../lib/anchorProbativeState';

interface DocumentStateInfoProps {
  document: any; // DocumentRecord (legacy) o DocumentEntityRow
}

/**
 * Cuadro informativo que muestra el estado del documento.
 *
 * Reemplaza:
 * - PreviewBadges (badges "Protegido", "Protección certificada")
 * - "Estado probatorio" (cuadro con tooltip técnico)
 *
 * Muestra:
 * - Estado actual (de deriveDocumentState)
 * - Mensaje tranquilizador basado en el estado
 */
export default function DocumentStateInfo({ document }: DocumentStateInfoProps) {
  const events = Array.isArray(document.events) ? document.events : [];
  const workflowStatus = (document?.workflows?.[0]?.status ?? null) as string | null;
  const signers = Array.isArray(document.signers) ? document.signers : [];
  const signedCount = signers.filter((s: any) => s?.status === 'signed').length;
  const totalSigners = signers.length;
  const state = deriveDocumentState(
    document as DocumentEntityRow,
    (document.workflows ?? []) as any,
    signers as any
  );
  const isFinalized = state.phase === 'gray';

  const probative = deriveAnchorProbativeState({
    events,
    hasPrimaryHash: Boolean(
      document?.content_hash ||
      document?.eco_hash ||
      document?.document_hash
    ),
  });
  const isCancelledFlow = workflowStatus === 'cancelled' || workflowStatus === 'rejected';
  const shouldFreezeProbativeByFlow =
    isCancelledFlow && (probative.level === 'none' || probative.level === 'base');
  const probativeConfig = shouldFreezeProbativeByFlow
    ? {
        ...probative.config,
        badge: 'Detenido',
        detailLabel: 'Proceso probatorio detenido por flujo cancelado',
        tone: 'gray' as const,
      }
    : probative.config;
  const rekorConfirmed = events.some((event: any) =>
    event?.kind === 'rekor.confirmed' || event?.kind === 'signer.rekor.confirmed'
  );

  const formatAnchorStatus = (network: keyof typeof probative.network) => {
    const info = probative.network[network];
    if (!info) return 'pendiente';
    if (info.confirmed) return 'confirmado';
    if (info.timeout) return 'timeout';
    if (info.failed) return 'error';
    if (info.requested) return 'pendiente';
    return 'no requerido';
  };

  const shouldShowNetwork = (network: keyof typeof probative.network) => {
    const info = probative.network[network];
    if (!info) return false;
    return Boolean(info.requested || info.confirmed || info.pending || info.failed || info.timeout);
  };

  const witnessHistory = Array.isArray(document?.witness_history)
    ? document.witness_history
    : [];

  const normalizedWitnessHistory = witnessHistory
    .filter((entry: any) => entry && typeof entry === 'object')
    .sort((a: any, b: any) => {
      const aTime = new Date(a.at ?? a.timestamp ?? 0).getTime();
      const bTime = new Date(b.at ?? b.timestamp ?? 0).getTime();
      return bTime - aTime;
    })
    .slice(0, 3);

  const formatHash = (value?: string | null) => {
    if (!value) return 'hash desconocido';
    const text = String(value);
    if (text.length <= 18) return text;
    return `${text.slice(0, 8)}…${text.slice(-8)}`;
  };

  const formatAt = (value?: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString('es-AR');
  };

  const toneClasses = {
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    amber: 'bg-amber-100 text-amber-800 border-amber-200',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
  }[probativeConfig.tone];

  // Colores según la fase
  const getBorderColor = () => {
    switch (state.phase) {
      case 'green':
        return 'border-green-200';
      case 'blue':
        return 'border-blue-200';
      case 'gray':
        return 'border-gray-200';
    }
  };

  const getBgColor = () => {
    switch (state.phase) {
      case 'green':
        return 'bg-green-50';
      case 'blue':
        return 'bg-blue-50';
      case 'gray':
        return 'bg-gray-50';
    }
  };

  const getTextColor = () => {
    switch (state.phase) {
      case 'green':
        return 'text-green-800';
      case 'blue':
        return 'text-blue-800';
      case 'gray':
        return 'text-gray-700';
    }
  };

  return (
    <div className={`border rounded-lg p-4 space-y-3 ${getBorderColor()} ${getBgColor()}`}>
      <div className={`font-semibold text-sm ${getTextColor()}`}>
        Estado de flujo: {state.label}
      </div>
      <div className="space-y-1 text-xs text-gray-600 leading-relaxed">
        {totalSigners > 0 && (
          <div>Firmantes: {signedCount}/{totalSigners}</div>
        )}
        <div>Finalizado: {isFinalized ? 'Sí' : 'No'}</div>
      </div>

      <div className="border-t border-gray-200 pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold text-gray-700">Estado probatorio</div>
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneClasses}`}>
            {probativeConfig.badge}
          </span>
        </div>
        <div className="text-xs text-gray-600 mt-1">
          {probativeConfig.detailLabel}
        </div>
        <div className="text-[11px] text-gray-500 mt-1">
          {shouldFreezeProbativeByFlow
            ? 'Iniciá un nuevo flujo o reintentá la protección para retomar refuerzos.'
            : 'Informativo: no bloquea el flujo de firmas.'}
        </div>
        <div className="mt-2 grid gap-1 text-[11px] text-gray-600">
          <div>TSA: {probative.tsaConfirmed ? 'confirmado' : 'pendiente'}</div>
          <div>Rekor: {rekorConfirmed ? 'confirmado' : 'pendiente'}</div>
          {shouldShowNetwork('polygon') && (
            <div>Polygon: {formatAnchorStatus('polygon')}</div>
          )}
          {shouldShowNetwork('bitcoin') && (
            <div>Bitcoin: {formatAnchorStatus('bitcoin')}</div>
          )}
          {probative.requestedAnchors > 0 && (
            <div>Refuerzos confirmados: {probative.confirmedAnchors}/{probative.requestedAnchors}</div>
          )}
          {probative.pendingAnchors > 0 && (
            <div>Refuerzos asincrónicos pendientes: {probative.pendingAnchors}</div>
          )}
          {probative.timeoutAnchors > 0 && (
            <div>Uno o más refuerzos excedieron la ventana automática.</div>
          )}
          {probative.failedAnchors > 0 && (
            <div>Uno o más refuerzos finalizaron con error.</div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-3">
        <div className="text-xs font-semibold text-gray-700">Historial witness</div>
        {normalizedWitnessHistory.length === 0 ? (
          <div className="text-[11px] text-gray-500 mt-1">
            Sin historial registrado aún.
          </div>
        ) : (
          <div className="mt-2 grid gap-1 text-[11px] text-gray-600">
            {normalizedWitnessHistory.map((entry: any, index: number) => {
              const entryHash = entry.hash ?? entry.witness_hash ?? entry.to_hash ?? null;
              const entryAt = formatAt(entry.at ?? entry.timestamp ?? null);
              const entrySource = entry.source ?? entry.source_type ?? null;
              return (
                <div key={`${entryHash ?? 'hash'}-${index}`} className="flex flex-col gap-0.5">
                  <div className="font-mono">{formatHash(entryHash)}</div>
                  <div className="text-[10px] text-gray-500">
                    {entryAt ? `Fecha: ${entryAt}` : 'Fecha: —'}
                    {entrySource ? ` · Origen: ${entrySource}` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
