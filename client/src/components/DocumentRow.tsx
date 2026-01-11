import React, { useState, useRef, useEffect } from 'react';
import { Shield, Eye, Share2, Download, MoreVertical, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { deriveProtectionLevel, getProtectionLevelLabel, getProtectionLevelColor } from '../lib/protectionLevel';
import { deriveFlowStatus, FLOW_STATUS } from '../lib/flowStatus';

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
  const created = document.created_at ? new Date(document.created_at).toLocaleString() : '—';
  const flowStatus = deriveFlowStatus(document);
  const flowConfig = FLOW_STATUS[flowStatus.key];

  // TSA Detection (from tsa_latest or events[])
  const tsaData = document.tsa_latest || (Array.isArray(document.events)
    ? document.events.find((e: any) => e.kind === 'tsa')?.tsa
    : null);
  const hasTsa = !!tsaData;
  const tsaDate = tsaData?.gen_time ? new Date(tsaData.gen_time).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) : null;

  // Protection Level (canonical derivation from events[])
  const protectionLevel = Array.isArray(document.events)
    ? deriveProtectionLevel(document.events)
    : 'NONE';
  const protectionLabel = getProtectionLevelLabel(protectionLevel);
  const protectionColor = getProtectionLevelColor(protectionLevel);

  // Protection Level badge classes (Tailwind)
  const protectionBadgeClasses = {
    gray: 'text-gray-700 bg-gray-100',
    green: 'text-green-700 bg-green-100',
    blue: 'text-blue-700 bg-blue-100',
    purple: 'text-purple-700 bg-purple-100',
  }[protectionColor] || 'text-gray-700 bg-gray-100';

  // Grid row mode: render cells so they align with header grid
  if (asRow) {
    return (
      <div className="contents">
        <div className="flex items-center gap-3 min-w-0">
          <Shield className="h-5 w-5 text-gray-700 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate max-w-full" title={name}>{name}</div>
            <div className="text-xs text-gray-500">{flowConfig.label}{flowStatus.detail ? ` — ${flowStatus.detail}` : ''}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          {context === 'operation' ? (
            <span />
          ) : (
            <>
              {protectionLevel !== 'NONE' && (
                <span
                  className={`text-xs px-2 py-1 rounded ${protectionBadgeClasses}`}
                  title={protectionLabel}
                >
                  {protectionLabel}
                </span>
              )}
              {hasTsa && tsaDate && (
                <span
                  className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded flex items-center gap-1"
                  title={`Certificado con sello de tiempo: ${tsaDate}`}
                >
                  <Clock className="h-3 w-3" />
                  TSA {tsaDate}
                </span>
              )}
            </>
          )}
        </div>

        <div className="text-sm text-gray-500">{created}</div>

        <div className="flex items-center justify-end gap-3">
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
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => onMove(document)}>Mover a operación</button>
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
        <Shield className="h-5 w-5 text-gray-700 flex-shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">{name}</div>
          <div className="text-xs text-gray-500">
            {flowConfig.label}
            {flowStatus.detail ? ` — ${flowStatus.detail}` : ''}
            {created ? ` · ${created}` : ''}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {protectionLevel !== 'NONE' && (
          <span
            className={`text-xs px-2 py-1 rounded ${protectionBadgeClasses}`}
            title={protectionLabel}
          >
            {protectionLabel}
          </span>
        )}
        {hasTsa && tsaDate && (
          <span
            className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded flex items-center gap-1"
            title={`Certificado con sello de tiempo: ${tsaDate}`}
          >
            <Clock className="h-3 w-3" />
            TSA
          </span>
        )}

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
                  Mover a operación
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
