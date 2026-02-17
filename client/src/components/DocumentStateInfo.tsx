// ========================================
// DocumentStateInfo - Cuadro Informativo Sin Estrés
// Muestra el estado del documento de forma clara y tranquila
// ========================================

import React from 'react';
import { deriveDocumentState } from '../lib/deriveDocumentState';
import type { DocumentEntityRow } from '../lib/eco/v2';
import { getAnchorEvent, hasTsaConfirmed } from '../lib/protectionLevel';

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
  const signers = Array.isArray(document.signers) ? document.signers : [];
  const signedCount = signers.filter((s: any) => s?.status === 'signed').length;
  const totalSigners = signers.length;
  const state = deriveDocumentState(
    document as DocumentEntityRow,
    (document.workflows ?? []) as any,
    signers as any
  );
  const isFinalized = state.phase === 'gray';

  const latestProtectionRequest = [...events]
    .reverse()
    .find((e: any) => e?.kind === 'document.protected.requested');
  const requiredEvidenceRaw = latestProtectionRequest?.payload?.required_evidence;
  const requiredEvidence = Array.isArray(requiredEvidenceRaw)
    ? requiredEvidenceRaw.filter((item: unknown): item is string => typeof item === 'string')
    : [];

  const tsaConfirmed = hasTsaConfirmed(events);
  const polygonConfirmed = getAnchorEvent(events as any, 'polygon') !== null;
  const bitcoinConfirmed = getAnchorEvent(events as any, 'bitcoin') !== null;
  const confirmedAnchors = (polygonConfirmed ? 1 : 0) + (bitcoinConfirmed ? 1 : 0);

  const level = (() => {
    if (!tsaConfirmed) return { label: 'Sin protección probatoria', badge: 'Sin protección', tone: 'gray' as const };
    if (confirmedAnchors >= 2) return { label: 'Protección máxima', badge: 'Máxima', tone: 'blue' as const };
    if (confirmedAnchors === 1) return { label: 'Protección reforzada', badge: 'Reforzada', tone: 'emerald' as const };
    return { label: 'Protección base', badge: 'Base', tone: 'amber' as const };
  })();

  const toneClasses = {
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    amber: 'bg-amber-100 text-amber-800 border-amber-200',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
  }[level.tone];

  const statusFor = (name: 'tsa' | 'polygon' | 'bitcoin', confirmed: boolean) => {
    if (confirmed) return 'confirmado';
    if (requiredEvidence.length > 0 && !requiredEvidence.includes(name)) return 'no requerido';
    return 'pendiente';
  };

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
            {level.badge}
          </span>
        </div>
        <div className="text-xs text-gray-600 mt-1">
          {level.label}
        </div>
        <div className="text-[11px] text-gray-500 mt-1">
          Informativo: no bloquea el flujo de firmas.
        </div>
        <div className="mt-2 grid gap-1 text-[11px] text-gray-600">
          <div>TSA: {statusFor('tsa', tsaConfirmed)}</div>
          <div>Polygon: {statusFor('polygon', polygonConfirmed)}</div>
          <div>Bitcoin: {statusFor('bitcoin', bitcoinConfirmed)}</div>
        </div>
      </div>
    </div>
  );
}
