// ========================================
// Modal para Crear Operación
// Basado en: docs/contratos/OPERACIONES_CONTRACT.md P0
// Basado en: docs/contratos/DRAFT_OPERATION_RULES.md
// ========================================

import React, { useState } from 'react';
import { X, Folder } from 'lucide-react';
import toast from 'react-hot-toast';
import { createOperation } from '../lib/operationsService';
import type { Operation } from '../types/operations';

interface CreateOperationModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: (operation: Operation) => void;
}

export default function CreateOperationModal({
  userId,
  onClose,
  onSuccess,
}: CreateOperationModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [saveAsDraft, setSaveAsDraft] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error('El nombre es obligatorio', { position: 'top-right' });
      return;
    }

    if (trimmedName.length < 3) {
      toast.error('El nombre debe tener al menos 3 caracteres', { position: 'top-right' });
      return;
    }

    try {
      setCreating(true);

      const newOperation = await createOperation(userId, {
        name: trimmedName,
        description: description.trim() || undefined,
        status: saveAsDraft ? 'draft' : 'active',
      });

      toast.success(
        saveAsDraft ? 'Borrador guardado' : 'Operación creada',
        { position: 'top-right' }
      );
      onSuccess(newOperation);
      onClose();
    } catch (error) {
      console.error('Error creating operation:', error);
      toast.error('No se pudo crear la operación', { position: 'top-right' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <Folder className="w-5 h-5 text-gray-700" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Nueva operación</h3>
              <p className="text-xs text-gray-600">Crea una carpeta para agrupar documentos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            disabled={creating}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label htmlFor="operation-name" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre *
            </label>
            <input
              type="text"
              id="operation-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Venta de propiedad X"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm"
              disabled={creating}
              maxLength={200}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Un nombre claro para identificar el caso o trámite
            </p>
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="operation-description" className="block text-sm font-medium text-gray-700 mb-2">
              Descripción (opcional)
            </label>
            <textarea
              id="operation-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contexto adicional sobre esta operación"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm resize-none"
              disabled={creating}
              maxLength={500}
              rows={3}
            />
          </div>

          {/* Checkbox: Guardar como borrador */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="save-as-draft"
              checked={saveAsDraft}
              onChange={(e) => setSaveAsDraft(e.target.checked)}
              disabled={creating}
              className="mt-1 h-4 w-4 text-black border-gray-300 rounded focus:ring-black"
            />
            <label htmlFor="save-as-draft" className="text-sm text-gray-700 cursor-pointer">
              Guardar como borrador
              <p className="text-xs text-gray-500 mt-1">
                Los borradores no tienen validez legal. Úsalos para preparar documentos antes de protegerlos.
              </p>
            </label>
          </div>

          {/* Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-600">
              {saveAsDraft
                ? '📝 Borrador: Podrás agregar documentos, editarlos y organizarlos sin generar evidencia. Cuando estés listo, usa "Proteger y enviar".'
                : 'ℹ️ Puedes crear la operación vacía y agregar documentos después. Los documentos mantienen su evidencia al moverse entre operaciones.'}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition"
              disabled={creating}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={creating || !name.trim()}
            >
              {creating
                ? saveAsDraft ? 'Guardando...' : 'Creando...'
                : saveAsDraft ? 'Guardar borrador' : 'Crear operación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
