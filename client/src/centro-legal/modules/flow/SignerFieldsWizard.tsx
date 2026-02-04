import { useMemo, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { SignatureField } from '../../../types/signature-fields';
import { generateWorkflowFieldsFromWizard, type RepetitionRule, type WizardTemplate } from '../../../lib/workflowFieldTemplate';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  signers: { email: string; signingOrder: number }[];
  virtualWidth: number;
  virtualHeight: number;
  totalPages: number | null;
  onApply: (result: { fields: SignatureField[]; template: WizardTemplate }) => void;
};

type CustomField = {
  id: string;
  label: string;
};

export function SignerFieldsWizard({
  isOpen,
  onClose,
  signers,
  virtualWidth,
  virtualHeight,
  totalPages,
  onApply
}: Props) {
  const [includeName, setIncludeName] = useState(true);
  const [includeId, setIncludeId] = useState(false);
  const [includeDate, setIncludeDate] = useState(true);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  const validSigners = useMemo(
    () =>
      signers
        .map((s) => ({ ...s, email: s.email.trim().toLowerCase() }))
        .filter((s) => Boolean(s.email))
        .sort((a, b) => a.signingOrder - b.signingOrder),
    [signers]
  );

  // Siempre usamos "once" (al final del documento)
  const repetitionRule: RepetitionRule = { kind: 'once' };

  const template: WizardTemplate = useMemo(() => {
    const fields: WizardTemplate['fields'] = [{ kind: 'signature' }];
    if (includeName) fields.push({ kind: 'name', required: true });
    if (includeId) fields.push({ kind: 'id_number', required: true });
    if (includeDate) fields.push({ kind: 'date', required: true });
    customFields.forEach((cf) => {
      fields.push({ kind: 'text', required: false, label: cf.label || 'Texto' });
    });
    return { fields, repetitionRule };
  }, [includeName, includeId, includeDate, customFields]);

  const addCustomField = () => {
    setCustomFields([...customFields, { id: Date.now().toString(), label: '' }]);
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter((f) => f.id !== id));
  };

  const updateCustomFieldLabel = (id: string, label: string) => {
    setCustomFields(customFields.map((f) => (f.id === id ? { ...f, label } : f)));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">Configurar firmas</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Columna izquierda: Campos */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-3">¿Qué completa cada firmante?</p>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-not-allowed opacity-60">
                <input
                  type="checkbox"
                  checked
                  disabled
                  className="w-3 h-3 accent-gray-900 cursor-not-allowed"
                />
                <span className="text-xs">Firma (obligatoria)</span>
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeName}
                  onChange={(e) => setIncludeName(e.target.checked)}
                  className="w-3 h-3 accent-gray-900 cursor-pointer"
                />
                <span className="text-xs">Nombre</span>
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeId}
                  onChange={(e) => setIncludeId(e.target.checked)}
                  className="w-3 h-3 accent-gray-900 cursor-pointer"
                />
                <span className="text-xs">Documento</span>
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDate}
                  onChange={(e) => setIncludeDate(e.target.checked)}
                  className="w-3 h-3 accent-gray-900 cursor-pointer"
                />
                <span className="text-xs">Fecha</span>
              </label>
            </div>

            {/* Campos personalizados */}
            {customFields.length > 0 && (
              <div className="mt-3 space-y-2">
                {customFields.map((field) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateCustomFieldLabel(field.id, e.target.value)}
                      placeholder="Nombre del campo"
                      className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomField(field.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors p-1"
                      title="Eliminar campo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={addCustomField}
              className="mt-3 flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Agregar campo personalizado
            </button>
          </div>

          {/* Columna derecha: Posición */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-3">¿Dónde aparece en el documento?</p>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-not-allowed opacity-60">
              <input
                type="radio"
                name="position"
                checked
                disabled
                className="w-3 h-3 accent-gray-900 cursor-not-allowed"
              />
              <span className="text-xs">Al final del documento</span>
            </label>
            <p className="mt-2 text-[10px] text-gray-500">
              Los campos se agregan al final. Si no hay espacio, el documento se extiende.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={validSigners.length === 0}
            onClick={() => {
              const generated = generateWorkflowFieldsFromWizard(validSigners, template, {
                virtualWidth,
                virtualHeight,
                totalPages
              });
              onApply({ fields: generated, template });
            }}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
