import React, { useState, useRef, useEffect } from 'react';
import { Shield, Eye, Share2, Download, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const hasProtection = Array.isArray(document.events) ? document.events.length > 0 : (!!document.eco_hash || !!document.document_hash || !!document.content_hash);

  // Grid row mode: render cells so they align with header grid
  if (asRow) {
    return (
      <div className="contents">
        <div className={`flex items-center gap-3 min-w-0 ${context === 'operation' ? 'pl-6' : ''}`}>
          <Shield className="h-5 w-5 text-gray-700 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate" title={name}>{name}</div>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          {/* probative cell: hide badge in operation context per UX decision */}
          {context !== 'operation' && hasProtection && (
            <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded">Protegido</span>
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
          <div className="text-xs text-gray-500">{created}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {hasProtection && (
          <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded">Protegido</span>
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
