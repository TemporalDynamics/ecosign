// ========================================
// OperationRow - Fila visual para operaciones
// Basado en: docs/contratos/OPERACIONES_CONTRACT.md
// ========================================

import React, { useState, useRef, useEffect } from 'react';
import { Folder, MoreVertical, FolderOpen, Edit, CheckCircle, Archive, Send } from 'lucide-react';
import type { Operation, OperationStatus } from '../types/operations';
import DocumentRow from './DocumentRow';
import { mapEntityToDocumentRecord } from '../lib/documentEntityService';

interface OperationRowProps {
  operation: Operation;
  documentCount: number;
  onClick?: () => void;
  onEdit?: () => void;
  onChangeStatus?: (status: OperationStatus) => void;
  onProtectAndSend?: () => void;
  openSignal?: number;
  autoOpen?: boolean;
}

const STATUS_CONFIG: Record<OperationStatus, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'text-amber-700' },
  active: { label: 'Activa', color: 'text-green-700' },
  closed: { label: 'Cerrada', color: 'text-blue-700' },
  archived: { label: 'Archivada', color: 'text-gray-500' },
};

export default function OperationRow({
  operation,
  documentCount,
  onClick,
  onEdit,
  onChangeStatus,
  onProtectAndSend,
  onOpenDocument,
  openSignal,
  autoOpen,
  tableLayout = false,
}: OperationRowProps & { onOpenDocument?: (documentId: string) => void; tableLayout?: boolean }) {
  const [showMenu, setShowMenu] = useState(false);
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const statusConfig = STATUS_CONFIG[operation.status];

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // Load documents when opening
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!open) return;
      setLoadingDocs(true);
      try {
        const { documents } = await import('../lib/operationsService').then(m => m.getOperationWithDocuments(operation.id));
        if (mounted) setDocs(documents || []);
      } catch (err) {
        console.error('Error loading operation documents:', err);
        if (mounted) setDocs([]);
      } finally {
        if (mounted) setLoadingDocs(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [open, operation.id]);

  useEffect(() => {
    if (autoOpen && openSignal !== undefined) {
      setOpen(true);
    }
  }, [autoOpen, openSignal]);

  if (tableLayout) {
    return (
      <div>
        <div className="grid grid-cols-[5fr_1fr_2fr_2fr] gap-x-4 items-center px-6 py-3 bg-sky-50 rounded-lg">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(!open)} className="flex items-center gap-3 text-left" type="button">
              <Folder className="w-4 h-4 text-sky-700 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 text-sm truncate">{operation.name}</div>
                {operation.description && <div className="text-xs text-gray-500 truncate">{operation.description}</div>}
              </div>
            </button>
          </div>

          <div className="text-xs text-gray-500">{/* probative empty for operations */}</div>

          <div className="text-sm text-gray-500">{(operation as any).created_at ? new Date((operation as any).created_at).toLocaleString() : '—'}</div>

          <div className="flex items-center justify-end gap-2">
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="p-2 hover:bg-sky-200 rounded-lg transition-colors"
                type="button"
                aria-label="Opciones de operación"
              >
                <MoreVertical className="w-4 h-4 text-gray-600" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                  <button
                    onClick={() => { setShowMenu(false); onClick?.(); }}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FolderOpen className="w-4 h-4 text-gray-600" />
                    Ver operación
                  </button>

                  {onEdit && (
                    <button
                      onClick={() => { setShowMenu(false); onEdit(); }}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                      Renombrar
                    </button>
                  )}

                  {onProtectAndSend && operation.status === 'draft' && (
                    <button
                      onClick={() => { setShowMenu(false); onProtectAndSend(); }}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 text-green-700 font-semibold"
                    >
                      <Send className="w-4 h-4 text-green-600" />
                      Proteger y enviar
                    </button>
                  )}

                  {onChangeStatus && operation.status === 'active' && (
                    <button
                      onClick={() => { setShowMenu(false); onChangeStatus('closed'); }}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      Cerrar operación
                    </button>
                  )}

                  {onChangeStatus && operation.status !== 'archived' && (
                    <button
                      onClick={() => { setShowMenu(false); onChangeStatus('archived'); }}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Archive className="w-4 h-4 text-gray-600" />
                      Archivar
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {open && (
          <div>
            {loadingDocs ? (
              <div className="text-sm text-gray-500 px-6 py-3">Cargando documentos…</div>
            ) : docs.length === 0 ? (
              <div className="text-sm text-gray-500 px-6 py-3">No hay documentos en esta operación</div>
            ) : (
              <div className="space-y-2">
                {docs.map((d) => {
                  const entity = d.document_entities ?? d;
                  const mapped = mapEntityToDocumentRecord(entity);
                  return (
                    <div key={mapped.id} className="grid grid-cols-[5fr_1fr_2fr_2fr] gap-x-4 items-center px-6 py-1.5">
                      <DocumentRow
                        document={mapped}
                        asRow
                        context="operation"
                        onOpen={() => onOpenDocument?.(mapped.id)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors group">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Izquierda: Icono + Info */}
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-3 flex-1 text-left"
          type="button"
        >
          {/* Icono de carpeta */}
          <Folder className="w-4 h-4 text-sky-700 flex-shrink-0" />

          {/* Info de la operación */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 text-sm truncate">
                {operation.name}
              </h3>
              <span className={`text-xs font-medium ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>
                {documentCount} {documentCount === 1 ? 'documento' : 'documentos'}
              </span>
              {operation.description && (
                <>
                  <span className="text-gray-400">·</span>
                  <span className="truncate">{operation.description}</span>
                </>
              )}
            </div>
          </div>
        </button>

        {/* Derecha: Menú */}
        <div className="relative flex-shrink-0 ml-2" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 hover:bg-sky-200 rounded-lg transition-colors"
            type="button"
            aria-label="Opciones de operación"
          >
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
              <button
                onClick={() => {
                  setShowMenu(false);
                  onClick?.();
                }}
                className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
              >
                <FolderOpen className="w-4 h-4 text-gray-600" />
                Ver operación
              </button>

              {onEdit && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit();
                  }}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4 text-gray-600" />
                  Renombrar
                </button>
              )}

              {onProtectAndSend && operation.status === 'draft' && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onProtectAndSend();
                  }}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 text-green-700 font-semibold"
                >
                  <Send className="w-4 h-4 text-green-600" />
                  Proteger y enviar
                </button>
              )}

              {onChangeStatus && operation.status === 'active' && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onChangeStatus('closed');
                  }}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  Cerrar operación
                </button>
              )}

              {onChangeStatus && operation.status !== 'archived' && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onChangeStatus('archived');
                  }}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  <Archive className="w-4 h-4 text-gray-600" />
                  Archivar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Documents list when open */}
      {open && (
        <div className="border-t border-sky-100 mt-2 px-4 py-3 bg-white">
          {loadingDocs ? (
            <div className="text-sm text-gray-500">Cargando documentos…</div>
          ) : docs.length === 0 ? (
            <div className="text-sm text-gray-500">No hay documentos en esta operación</div>
          ) : (
            <div className="space-y-2">
              {docs.map((d) => {
                const entity = d.document_entities ?? d;
                const mapped = mapEntityToDocumentRecord(entity);
                return (
                  <DocumentRow
                    key={mapped.id}
                    document={mapped}
                    context="operation"
                    onOpen={() => onOpenDocument?.(mapped.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
