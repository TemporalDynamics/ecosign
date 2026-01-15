import React, { useState, useRef, useEffect } from 'react';
import { Shield, Eye, Share2, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { deriveProtectionLevel, getProtectionLevelLabel } from '../lib/protectionLevel';
import { deriveHumanState, getHumanStateColor } from '../lib/deriveHumanState';

import { ProtectionLayerBadge } from './ProtectionLayerBadge';

// FASE 3: Switch controlado
const USE_DERIVED_PROTECTION = true;

export default function DocumentRow({
  document,
  context = 'documents',
  asRow = false,
  onOpen,
  onShare,
  onDownloadPdf,
  onDownloadEco,
  onVerify,
  onMove,
  onInPerson,
  selectable = false,
  selected = false,
  onSelect,
}: {
  document: any;
  context?: 'documents' | 'operation';
  asRow?: boolean;
  onOpen?: (doc: any) => void;
  onShare?: (doc: any) => void;
  onDownloadPdf?: (doc: any) => void;
  onDownloadEco?: (doc: any) => void;
  onVerify?: (doc: any) => void;
  onMove?: (doc: any) => void;
  onInPerson?: (doc: any) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
}) {
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(false);
      }
    }
    if (openMenu && typeof window !== 'undefined') window.addEventListener('mousedown', handleClickOutside);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('mousedown', handleClickOutside); };
  }, [openMenu]);

  const name = document.document_name || document.source_name || document.id;
  const formatDocDate = (value?: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  const created = formatDocDate(document.created_at);
  const humanState = deriveHumanState({ status: document.workflow_status || document.status }, document.signers || []);

  const formatState = (state: any, ctx: string) => {
    if (!state || state.key === 'unknown') {
      return ctx === 'operation' ? 'Abierta' : 'Borrador — editable';
    }
    return state.label;
  };

  // FASE 3: Lógica de Switch
  const legacyProtectionLevel = document.protection_level ?? 'NONE';
  const derivedProtectionLevel = Array.isArray(document.events)
    ? deriveProtectionLevel(document.events)
    : 'NONE';

  const levelToRender = USE_DERIVED_PROTECTION
    ? derivedProtectionLevel
    : legacyProtectionLevel;

  const protectionLabel = getProtectionLevelLabel(levelToRender);

  if (asRow) {
    return (
      <div className="contents">
        <div className="flex items-center gap-3 min-w-0">
          {selectable && (
            <input
              type="checkbox"
              className="eco-checkbox text-black border-gray-300 rounded focus:ring-2 focus:ring-black focus:ring-offset-0"
              checked={selected}
              onChange={(e) => onSelect?.(e.target.checked)}
              aria-label="Seleccionar documento"
            />
          )}
          <div title={protectionLabel}>
            <ProtectionLayerBadge layer={levelToRender} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate max-w-full" title={name}>{name}</div>
            {(document.user_note || document.description) && (
              <div className="text-xs text-gray-500 mt-1">{document.user_note || document.description}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className={`inline-flex items-center gap-2 text-xs px-2 py-1 rounded ${getHumanStateColor(humanState.severity)}`}>
            {formatState(humanState, context)}
          </span>
        </div>

        <div className="text-sm text-gray-500">{created}</div>

        <div className="flex items-center justify-end gap-3" data-row-actions>
          <button onClick={() => onOpen && onOpen(document)} className="text-black hover:text-gray-600" title="Ver detalle"><Eye className="h-5 w-5" /></button>
          <button onClick={() => onShare ? onShare(document) : toast('No disponible')} className="text-black hover:text-gray-600" title="Compartir"><Share2 className="h-5 w-5" /></button>

          <div className="relative" ref={menuRef}>
            <button onClick={() => setOpenMenu(!openMenu)} className="text-gray-500 hover:text-gray-700" title="Más acciones"><MoreVertical className="h-5 w-5" /></button>
            {openMenu && (
              <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                {onDownloadEco && (
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => onDownloadEco(document)}>Descargar .ECO</button>
                )}
                {onDownloadPdf && (
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => onDownloadPdf(document)}>Descargar PDF</button>
                )}
                {onVerify && (
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => onVerify(document)}>Verificar documento</button>
                )}
                {onMove && context !== 'operation' && (
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => onMove(document)}>Agregar a operación</button>
                )}
                {onInPerson && (
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => onInPerson(document)}>Firma presencial</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default card mode (mobile / list)
  return (
    <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-100">
      <div className="flex items-center gap-3 min-w-0">
        {selectable && (
          <input
            type="checkbox"
            className="eco-checkbox text-black border-gray-300 rounded focus:ring-2 focus:ring-black focus:ring-offset-0"
            checked={selected}
            onChange={(e) => onSelect?.(e.target.checked)}
            aria-label="Seleccionar documento"
          />
        )}
        <div title={protectionLabel}>
          <ProtectionLayerBadge layer={levelToRender} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">{name}</div>
          <div className="text-xs text-gray-500">
            <span className={`text-xs px-2 py-1 rounded ${getHumanStateColor(humanState.severity)}`}>
              {formatState(humanState, context)}
            </span>
            {created ? ` · ${created}` : ''}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2" data-row-actions>
        <button
          onClick={() => onOpen && onOpen(document)}
          className="text-xs text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
          title="Ver detalle"
        >
          <Eye className="inline-block w-3 h-3 mr-1" /> Ver
        </button>

        <button
          onClick={() => onShare ? onShare(document) : toast('No disponible')}
          className="text-xs text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
          title="Compartir"
        >
          <Share2 className="inline-block w-3 h-3" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpenMenu(!openMenu)}
            className="p-1 rounded hover:bg-gray-100"
            title="Más acciones"
            aria-label="Más acciones"
          >
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>

          {openMenu && (
            <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
              {onDownloadEco && (
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => onDownloadEco(document)}
                >
                  Descargar .ECO
                </button>
              )}

              {onDownloadPdf && (
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => onDownloadPdf(document)}
                >
                  Descargar PDF
                </button>
              )}

              {onVerify && (
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => onVerify(document)}
                >
                  Verificar documento
                </button>
              )}

              {onMove && context !== 'operation' && (
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => onMove(document)}
                >
                  Agregar a operación
                </button>
              )}

              {onInPerson && (
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => onInPerson(document)}
                >
                  Firma presencial
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
