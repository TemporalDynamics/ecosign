// ========================================
// Modal para Mover Documento a Operación
// Basado en: docs/contratos/OPERACIONES_CONTRACT.md
// Regla: Mover NO cambia evidencia, solo organiza
// ========================================

import React, { useState, useEffect } from 'react';
import { X, Folder, FolderPlus, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getOperations, addDocumentToOperation } from '../lib/operationsService';
import type { Operation } from '../types/operations';

interface MoveToOperationModalProps {
  documentId: string;
  documentName: string;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
  onCreateNew?: () => void;
}

export default function MoveToOperationModal({
  documentId,
  documentName,
  userId,
  onClose,
  onSuccess,
  onCreateNew,
}: MoveToOperationModalProps) {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);

  useEffect(() => {
    async function loadOperations() {
      try {
        setLoading(true);
        // Solo mostrar operaciones activas
        const ops = await getOperations(userId, 'active');
        setOperations(ops);
      } catch (error) {
        console.error('Error loading operations:', error);
        toast.error('No se pudieron cargar las operaciones', { position: 'top-right' });
      } finally {
        setLoading(false);
      }
    }

    loadOperations();
  }, [userId]);

  const handleMove = async () => {
    if (!selectedOperationId) {
      toast.error('Selecciona una operación', { position: 'top-right' });
      return;
    }

    try {
      setMoving(true);
      await addDocumentToOperation(selectedOperationId, documentId, userId);

      const selectedOp = operations.find((op) => op.id === selectedOperationId);
      toast.success(
        `Documento agregado a "${selectedOp?.name}". La evidencia no ha cambiado.`,
        { position: 'top-right', duration: 4000 }
      );

      onSuccess();
      onClose();
    } catch (error: any) {
      console.log('Error caught in handleMove:', error); // Debugging line
      if (error.code === '23505') {
        const selectedOp = operations.find((op) => op.id === selectedOperationId);
        toast.error(`El documento "${documentName}" ya pertenece a la operación "${selectedOp?.name}".`, { position: 'top-right' });
      } else {
        console.error('Error moving document:', error);
        toast.error('No se pudo mover el documento', { position: 'top-right' });
      }
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
              <Folder className="w-5 h-5 text-sky-700" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Mover a operación</h3>
              <p className="text-xs text-gray-600 mt-0.5">
                {documentName.replace(/\.(pdf|eco|ecox)$/i, '')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            disabled={moving}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          ) : operations.length === 0 ? (
            <div className="text-center py-8">
              <Folder className="mx-auto h-10 w-10 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 mb-4">No tienes operaciones activas</p>
              {onCreateNew && (
                <button
                  onClick={() => {
                    onClose();
                    onCreateNew();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm font-semibold"
                >
                  <FolderPlus className="w-4 h-4" />
                  Crear operación
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Lista de operaciones */}
              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                {operations.map((operation) => (
                  <button
                    key={operation.id}
                    onClick={() => setSelectedOperationId(operation.id)}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      selectedOperationId === operation.id
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    type="button"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Folder className="w-4 h-4 text-sky-700 flex-shrink-0" />
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {operation.name}
                        </span>
                      </div>
                      {selectedOperationId === operation.id && (
                        <CheckCircle className="w-5 h-5 text-sky-600 flex-shrink-0" />
                      )}
                    </div>
                    {operation.description && (
                      <p className="text-xs text-gray-500 mt-1 truncate pl-6">
                        {operation.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>

              {/* Opción crear nueva */}
              {onCreateNew && (
                <button
                  onClick={() => {
                    onClose();
                    onCreateNew();
                  }}
                  className="w-full p-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition text-left"
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    <FolderPlus className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-semibold text-gray-700">
                      Crear operación nueva
                    </span>
                  </div>
                </button>
              )}

              {/* Info */}
              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-600">
                  ℹ️ Mover el documento a una operación <strong>no cambia su evidencia</strong>. Solo lo organiza visualmente.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && operations.length > 0 && (
          <div className="flex items-center justify-end gap-3 px-6 pb-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition"
              disabled={moving}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleMove}
              className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={moving || !selectedOperationId}
            >
              {moving ? 'Moviendo...' : 'Mover documento'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
