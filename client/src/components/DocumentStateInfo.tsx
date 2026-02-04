// ========================================
// DocumentStateInfo - Cuadro Informativo Sin Estrés
// Muestra el estado del documento de forma clara y tranquila
// ========================================

import React from 'react';
import { deriveDocumentState } from '../lib/deriveDocumentState';
import { deriveProtectionLevel } from '../lib/protectionLevel';
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

  // Derivar estado usando la función canónica
  const state = deriveDocumentState(document as DocumentEntityRow);
  const protectionLevel = deriveProtectionLevel((document.events ?? []) as any);

  // Mensajes según el estado (sin tecnicismos, tranquilizadores)
  const getMessage = (): string => {
    // Estados de firma (priorizan sobre protección)
    if (state.label.includes('firma')) {
      if (state.phase === 'gray') {
        return 'El documento fue firmado correctamente y cuenta con protección probatoria.';
      }
      return 'El documento está en proceso de firma. Te notificaremos cuando esté listo.';
    }

    // Estados de protección
    if (state.label === 'Protección máxima') {
      return 'Tu documento tiene la máxima protección probatoria disponible. Podés descargarlo y verificarlo en cualquier momento.';
    }

    if (state.label === 'Protección reforzada') {
      return 'Tu documento está protegido con registro en red pública. La evidencia es inmutable y verificable.';
    }

    if (state.label === 'Protegido') {
      return 'Tu documento cuenta con sello de tiempo certificado. La evidencia es verificable independientemente.';
    }

    // Procesando
    if (state.label === 'Protegiendo') {
      return 'Estamos asegurando tu documento. Este proceso toma unos segundos.';
    }

    // Archivado
    if (state.label === 'Archivado') {
      return 'Este documento fue archivado. La protección probatoria se mantiene activa.';
    }

    // Default
    return 'Tu documento está siendo procesado.';
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
    <div className={`border rounded-lg p-4 ${getBorderColor()} ${getBgColor()}`}>
      <div className={`font-semibold text-sm mb-2 ${getTextColor()}`}>
        {state.label}
      </div>
      <div className="text-xs text-gray-600 leading-relaxed">
        {getMessage()}
      </div>
    </div>
  );
}
