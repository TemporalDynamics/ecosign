import React, { useState, useRef, useEffect } from 'react';
import { Eye, Share2, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { deriveDocumentState } from '../lib/deriveDocumentState';
import { deriveDocumentTooltip } from '../lib/deriveDocumentTooltip';
import StatusBadge from './StatusBadge';

export default function DocumentRow({
  document,
  context = 'documents',
  asRow = false,
  processingHintStartedAtMs,
  onOpen,
  onShare,
  onDownloadPdf,
  onDownloadEco,
  onDownloadOriginal,
  onVerify,
  onMove,
  onInPerson,
  onCancelFlow,
  onResumeFlow,
  selectable = false,
  selected = false,
  onSelect,
}: {
  document: any;
  context?: 'documents' | 'operation';
  asRow?: boolean;
  processingHintStartedAtMs?: number;
  onOpen?: (doc: any) => void;
  onShare?: (doc: any) => void;
  onDownloadPdf?: (doc: any) => void;
  onDownloadEco?: (doc: any) => void;
  onDownloadOriginal?: (doc: any) => void;
  onVerify?: (doc: any) => void;
  onMove?: (doc: any) => void;
  onInPerson?: (doc: any) => void;
  onCancelFlow?: (doc: any) => void;
  onResumeFlow?: (doc: any) => void;
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

  // Derivar estado y tooltip usando funciones canónicas
  // TODO: pasar workflows y signers cuando estén disponibles
  const state = deriveDocumentState(document, document.workflows, document.signers);
  const tooltip = deriveDocumentTooltip(document);
  const hasAnyWorkflow = Array.isArray(document.workflows) && document.workflows.length > 0;
  const canCancelWorkflow = Array.isArray(document.workflows)
    && document.workflows.some((wf: any) => wf?.status === 'ready' || wf?.status === 'active');
  const canResumeWorkflow = Array.isArray(document.workflows)
    && Array.isArray(document.signers)
    && document.workflows.some((wf: any) => wf?.status === 'ready' || wf?.status === 'active')
    && document.signers.some((s: any) => ['ready_to_sign', 'ready', 'accessed', 'verified'].includes(String(s?.status ?? '')));

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
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate max-w-full" title={name}>{name}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge label={state.label} phase={state.phase} tooltip={tooltip} />
        </div>

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
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => onDownloadPdf(document)}>Descargar copia fiel</button>
                )}
                {onDownloadOriginal && (
                  <button
                    className={`w-full text-left px-3 py-2 text-sm ${
                      document.source_storage_path
                        ? 'hover:bg-gray-50'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                    onClick={() => document.source_storage_path && onDownloadOriginal(document)}
                    disabled={!document.source_storage_path}
                    title={document.source_storage_path ? '' : 'Original no disponible'}
                  >
                    Descargar original
                  </button>
                )}
                {onVerify && (
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => onVerify(document)}>Verificar documento</button>
                )}
                {onMove && context !== 'operation' && (
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => onMove(document)}>Agregar a operación</button>
                )}
                {onCancelFlow && context !== 'operation' && (
                  <button
                    className={`w-full text-left px-3 py-2 text-sm ${
                      canCancelWorkflow
                        ? 'text-red-700 hover:bg-red-50'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                    onClick={() => canCancelWorkflow && onCancelFlow(document)}
                    disabled={!canCancelWorkflow}
                    title={
                      hasAnyWorkflow
                        ? (canCancelWorkflow ? '' : 'Solo podés cancelar cuando el flujo está iniciado')
                        : 'Este documento no tiene flujo'
                    }
                  >
                    Cancelar flujo
                  </button>
                )}
                {onResumeFlow && context !== 'operation' && (
                  <button
                    className={`w-full text-left px-3 py-2 text-sm ${
                      canResumeWorkflow
                        ? 'hover:bg-gray-50'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                    onClick={() => {
                      if (!canResumeWorkflow) return;
                      setOpenMenu(false);
                      onResumeFlow(document);
                    }}
                    disabled={!canResumeWorkflow}
                    title={canResumeWorkflow ? '' : 'No hay una firma pendiente para continuar'}
                  >
                    Continuar firma
                  </button>
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
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">{name}</div>
          <div className="mt-1">
            <StatusBadge label={state.label} phase={state.phase} tooltip={tooltip} />
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
                  Descargar copia fiel
                </button>
              )}

              {onDownloadOriginal && (
                <button
                  className={`w-full text-left px-3 py-2 text-sm ${
                    document.source_storage_path
                      ? 'hover:bg-gray-50'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={() => document.source_storage_path && onDownloadOriginal(document)}
                  disabled={!document.source_storage_path}
                  title={document.source_storage_path ? '' : 'Original no disponible'}
                >
                  Descargar original
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

              {onCancelFlow && context !== 'operation' && (
                <button
                  className={`w-full text-left px-3 py-2 text-sm ${
                    canCancelWorkflow
                      ? 'text-red-700 hover:bg-red-50'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={() => canCancelWorkflow && onCancelFlow(document)}
                  disabled={!canCancelWorkflow}
                  title={
                    hasAnyWorkflow
                      ? (canCancelWorkflow ? '' : 'Solo podés cancelar cuando el flujo está iniciado')
                      : 'Este documento no tiene flujo'
                  }
                >
                  Cancelar flujo
                </button>
              )}
              {onResumeFlow && context !== 'operation' && (
                <button
                  className={`w-full text-left px-3 py-2 text-sm ${
                    canResumeWorkflow
                      ? 'hover:bg-gray-50'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (!canResumeWorkflow) return;
                    setOpenMenu(false);
                    onResumeFlow(document);
                  }}
                  disabled={!canResumeWorkflow}
                  title={canResumeWorkflow ? '' : 'No hay una firma pendiente para continuar'}
                >
                  Continuar firma
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
