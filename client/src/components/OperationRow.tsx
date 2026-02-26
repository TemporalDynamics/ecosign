// ========================================
// OperationRow - Fila visual para operaciones
// Basado en: docs/contratos/OPERACIONES_CONTRACT.md
// ========================================

import React, { useState, useRef, useEffect } from 'react';
import { Folder, MoreVertical, FolderOpen, Edit, CheckCircle, Archive, Send, Eye, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Operation, OperationStatus } from '../types/operations';
import DocumentRow from './DocumentRow';
import { mapEntityToDocumentRecord } from '../lib/documentEntityService';
import { deriveHumanState, getHumanStateColor } from '../lib/deriveHumanState';

interface OperationRowProps {
  operation: Operation;
  documentCount: number;
  onClick?: () => void;
  onEdit?: () => void;
  onChangeStatus?: (status: OperationStatus) => void;
  onProtectAndSend?: () => void;
  onInPerson?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
  openSignal?: number;
  autoOpen?: boolean;
}

const STATUS_CONFIG: Record<OperationStatus, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'text-amber-700' },
  active: { label: 'Iniciada', color: 'text-green-700' },
  closed: { label: 'Completada', color: 'text-blue-700' },
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
  onInPerson,
  selectable = false,
  selected = false,
  onSelect,
  tableLayout = false,
}: OperationRowProps & { onOpenDocument?: (documentId: string) => void; tableLayout?: boolean }) {
  const [showMenu, setShowMenu] = useState(false);
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docSelectMode, setDocSelectMode] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);
  const statusConfig = STATUS_CONFIG[operation.status];
  const humanStateOp = deriveHumanState({ status: operation.status }, []);
  const formatOperationDate = (value?: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
        const opWithDocs = await import('../lib/operationsService').then((m) =>
          m.getOperationWithDocuments(operation.id)
        );
        if (mounted) setDocs(opWithDocs?.documents || []);
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

  const toggleDocSelection = (docId: string, checked: boolean) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(docId);
      } else {
        next.delete(docId);
      }
      return next;
    });
  };

  const isSelectionMode = !!(selectable && onSelect);
  const handleShareClick = () => {
    setOpen(true);
    setDocSelectMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedDocIds(new Set());
      }
      return next;
    });
  };

  const handleRowClick = (event: React.MouseEvent) => {
    if (!isSelectionMode) return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-row-actions]')) return;
    if (target.closest('input[type="checkbox"]')) return;
    onSelect?.(!selected);
  };

  const handleDocRowClick = (docId: string) => (event: React.MouseEvent) => {
    if (!docSelectMode) return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-row-actions]')) return;
    if (target.closest('input[type="checkbox"]')) return;
    toggleDocSelection(docId, !selectedDocIds.has(docId));
  };

  if (tableLayout) {
    return (
      <div>
        <div
          className={`grid grid-cols-[5fr_1fr_2fr] gap-x-4 items-center px-6 py-3 bg-sky-50 rounded-lg ${isSelectionMode ? 'cursor-pointer' : ''}`}
          onClick={handleRowClick}
        >
          <div className="flex items-center gap-3">
            {isSelectionMode ? (
              <div className="flex items-center gap-3 text-left">
                {selectable && (
                  <input
                    type="checkbox"
                    className="eco-checkbox text-black border-gray-300 rounded focus:ring-2 focus:ring-black focus:ring-offset-0"
                    checked={selected}
                    onChange={(e) => onSelect?.(e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Seleccionar operación"
                  />
                )}
                <Folder className="w-4 h-4 text-sky-700 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 text-sm truncate">{operation.name}</div>
                  {operation.description && <div className="text-xs text-gray-500 truncate">{operation.description}</div>}
                </div>
              </div>
            ) : (
              <button onClick={() => setOpen(!open)} className="flex items-center gap-3 text-left" type="button">
                {selectable && (
                  <input
                    type="checkbox"
                    className="eco-checkbox text-black border-gray-300 rounded focus:ring-2 focus:ring-black focus:ring-offset-0"
                    checked={selected}
                    onChange={(e) => onSelect?.(e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Seleccionar operación"
                  />
                )}
                <Folder className="w-4 h-4 text-sky-700 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 text-sm truncate">{operation.name}</div>
                  {operation.description && <div className="text-xs text-gray-500 truncate">{operation.description}</div>}
                </div>
              </button>
            )}
          </div>

          <div><span className={`inline-flex items-center gap-2 text-xs px-2 py-1 rounded ${getHumanStateColor(humanStateOp.severity)}`}>
                    {humanStateOp.label}
                  </span></div>

          <div className="flex items-center justify-end gap-2" data-row-actions>
            <button
              onClick={() => onClick?.()}
              className="text-black hover:text-gray-600"
              title="Ver detalle"
              type="button"
            >
              <Eye className="h-5 w-5" />
            </button>
            <button
              onClick={handleShareClick}
              className="text-black hover:text-gray-600"
              title="Compartir"
              type="button"
            >
              <Share2 className="h-5 w-5" />
            </button>
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

                  {onInPerson && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onInPerson();
                      }}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FolderOpen className="w-4 h-4 text-gray-600" />
                      Sesión probatoria reforzada
                    </button>
                  )}

                  {docSelectMode && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        if (selectedDocIds.size === 0) {
                          toast('Seleccioná documentos para compartir', { position: 'top-right' });
                          return;
                        }
                        toast('Compartir por lote próximamente', { position: 'top-right' });
                      }}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Share2 className="w-4 h-4 text-gray-600" />
                      Compartir seleccionados
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
                      Marcar como completada
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
                {docSelectMode && (
                  <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="eco-checkbox text-black border-gray-300 rounded focus:ring-2 focus:ring-black focus:ring-offset-0"
                        checked={docs.length > 0 && selectedDocIds.size === docs.length}
                        onChange={(event) => {
                          if (event.target.checked) {
                            const next = new Set(
                              docs.map((doc) => mapEntityToDocumentRecord(doc.document_entities ?? doc).id)
                            );
                            setSelectedDocIds(next);
                          } else {
                            setSelectedDocIds(new Set());
                          }
                        }}
                        aria-label="Seleccionar todos los documentos"
                      />
                      <span>{selectedDocIds.size} seleccionados</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedDocIds.size === 0) {
                            toast('Seleccioná documentos para crear un batch', { position: 'top-right' });
                            return;
                          }
                          toast('Batch desde operación próximamente', { position: 'top-right' });
                        }}
                        className="px-3 py-1 rounded bg-black text-white text-xs font-semibold hover:bg-gray-800"
                      >
                        Crear batch
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDocSelectMode(false);
                          setSelectedDocIds(new Set());
                        }}
                        className="px-3 py-1 rounded border border-gray-300 text-xs font-semibold text-gray-700 hover:border-gray-500"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
                {docs.map((d) => {
                  const entity = d.document_entities ?? d;
                  const mapped = mapEntityToDocumentRecord(entity);
                  return (
                    <div
                      key={mapped.id}
                      className={`grid grid-cols-[5fr_1fr_2fr] gap-x-4 items-center px-6 py-1.5 ${docSelectMode ? 'cursor-pointer' : ''}`}
                      onClick={handleDocRowClick(mapped.id)}
                    >
                      <DocumentRow
                        document={mapped}
                        asRow
                        context="operation"
                        onOpen={() => onOpenDocument?.(mapped.id)}
                        selectable={docSelectMode}
                        selected={selectedDocIds.has(mapped.id)}
                        onSelect={(checked) => toggleDocSelection(mapped.id, checked)}
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
      <div
        className={`flex items-center justify-between px-4 py-3 ${isSelectionMode ? 'cursor-pointer' : ''}`}
        onClick={handleRowClick}
      >
        {/* Izquierda: Icono + Info */}
        {isSelectionMode ? (
          <div className="flex items-center gap-3 flex-1 text-left">
            {/* Icono de carpeta */}
            {selectable && (
              <input
                type="checkbox"
                className="eco-checkbox text-black border-gray-300 rounded focus:ring-2 focus:ring-black focus:ring-offset-0"
                checked={selected}
                onChange={(e) => onSelect?.(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                aria-label="Seleccionar operación"
              />
            )}
            <Folder className="w-4 h-4 text-sky-700 flex-shrink-0" />

            {/* Info de la operación */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 text-sm truncate">
                  {operation.name}
                </h3>
                <span className={`text-xs px-2 py-1 rounded ${getHumanStateColor(humanStateOp.severity)}`}>
                  {humanStateOp.label}
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
          </div>
        ) : (
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-3 flex-1 text-left"
            type="button"
          >
            {/* Icono de carpeta */}
            {selectable && (
              <input
                type="checkbox"
                className="eco-checkbox text-black border-gray-300 rounded focus:ring-2 focus:ring-black focus:ring-offset-0"
                checked={selected}
                onChange={(e) => onSelect?.(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                aria-label="Seleccionar operación"
              />
            )}
            <Folder className="w-4 h-4 text-sky-700 flex-shrink-0" />

            {/* Info de la operación */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 text-sm truncate">
                  {operation.name}
                </h3>
                <span className={`text-xs px-2 py-1 rounded ${getHumanStateColor(humanStateOp.severity)}`}>
                  {humanStateOp.label}
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
        )}

        {/* Derecha: Acciones */}
        <div className="flex items-center gap-2" data-row-actions>
          <button
            onClick={() => onClick?.()}
            className="text-black hover:text-gray-600"
            title="Ver detalle"
            type="button"
          >
            <Eye className="h-5 w-5" />
          </button>
          <button
            onClick={handleShareClick}
            className="text-black hover:text-gray-600"
            title="Compartir"
            type="button"
          >
            <Share2 className="h-5 w-5" />
          </button>
          <div className="relative flex-shrink-0 ml-1" ref={menuRef}>
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

                {onInPerson && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onInPerson();
                    }}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FolderOpen className="w-4 h-4 text-gray-600" />
                    Sesión probatoria reforzada
                  </button>
                )}

                {docSelectMode && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      if (selectedDocIds.size === 0) {
                        toast('Seleccioná documentos para compartir', { position: 'top-right' });
                        return;
                      }
                      toast('Compartir por lote próximamente', { position: 'top-right' });
                    }}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4 text-gray-600" />
                    Compartir seleccionados
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
                    Marcar como completada
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
              {docSelectMode && (
                <div
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600 cursor-pointer"
                  onClick={(event) => {
                    const target = event.target as HTMLElement;
                    if (target.closest("[data-select-actions]")) return;
                    if (target.closest('input[type="checkbox"]')) return;
                    if (docs.length === 0) return;
                    const nextChecked = selectedDocIds.size !== docs.length;
                    if (nextChecked) {
                      const next = new Set(
                        docs.map((doc) => mapEntityToDocumentRecord(doc.document_entities ?? doc).id)
                      );
                      setSelectedDocIds(next);
                    } else {
                      setSelectedDocIds(new Set());
                    }
                  }}
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="eco-checkbox text-black border-gray-300 rounded focus:ring-2 focus:ring-black focus:ring-offset-0"
                      checked={docs.length > 0 && selectedDocIds.size === docs.length}
                      onChange={(event) => {
                        if (event.target.checked) {
                          const next = new Set(
                            docs.map((doc) => mapEntityToDocumentRecord(doc.document_entities ?? doc).id)
                          );
                          setSelectedDocIds(next);
                        } else {
                          setSelectedDocIds(new Set());
                        }
                      }}
                      aria-label="Seleccionar todos los documentos"
                    />
                    <span>{selectedDocIds.size} seleccionados</span>
                  </label>
                  <div className="flex items-center gap-2" data-select-actions>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedDocIds.size === 0) {
                          toast('Seleccioná documentos para crear un batch', { position: 'top-right' });
                          return;
                        }
                        toast('Batch desde operación próximamente', { position: 'top-right' });
                      }}
                      className="px-3 py-1 rounded bg-black text-white text-xs font-semibold hover:bg-gray-800"
                    >
                      Crear batch
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDocSelectMode(false);
                        setSelectedDocIds(new Set());
                      }}
                      className="px-3 py-1 rounded border border-gray-300 text-xs font-semibold text-gray-700 hover:border-gray-500"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              {docs.map((d) => {
                const entity = d.document_entities ?? d;
                const mapped = mapEntityToDocumentRecord(entity);
                return (
                  <DocumentRow
                    key={mapped.id}
                    document={mapped}
                    context="operation"
                    onOpen={() => onOpenDocument?.(mapped.id)}
                    selectable={docSelectMode}
                    selected={selectedDocIds.has(mapped.id)}
                    onSelect={(checked) => toggleDocSelection(mapped.id, checked)}
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
