// ========================================
// DocumentStateInfo - Cuadro Informativo Sin Estrés
// Muestra el estado del documento de forma clara y tranquila
// ========================================

import React from 'react';
import { deriveDocumentState } from '../lib/deriveDocumentState';
import type { DocumentEntityRow } from '../lib/eco/v2';

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
  const signers = Array.isArray(document.signers) ? document.signers : [];
  const signedCount = signers.filter((s: any) => s?.status === 'signed').length;
  const totalSigners = signers.length;
  const state = deriveDocumentState(
    document as DocumentEntityRow,
    (document.workflows ?? []) as any,
    signers as any
  );
  const isFinalized = state.phase === 'gray';
  const ecoAvailable = Boolean(document.eco_storage_path || document.eco_file_data || document.eco_hash);

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
    <div className={`border rounded-lg p-4 ${getBorderColor()} ${getBgColor()}`}>
      <div className={`font-semibold text-sm mb-2 ${getTextColor()}`}>
        {state.label}
      </div>
      <div className="space-y-1 text-xs text-gray-600 leading-relaxed">
        {totalSigners > 0 && (
          <div>Firmantes: {signedCount}/{totalSigners}</div>
        )}
        <div>Finalizado: {isFinalized ? 'Sí' : 'No'}</div>
        <div>ECO disponible: {ecoAvailable ? 'Sí' : 'No'}</div>
      </div>
    </div>
  );
}
