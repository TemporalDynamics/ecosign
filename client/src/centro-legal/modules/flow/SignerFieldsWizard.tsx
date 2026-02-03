import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
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
  const [includeText, setIncludeText] = useState(false);
  const [customTextLabel, setCustomTextLabel] = useState('Texto');

  const [repetitionKind, setRepetitionKind] = useState<RepetitionRule['kind']>('once');
  const [pagesRaw, setPagesRaw] = useState('');

  const validSigners = useMemo(
    () =>
      signers
        .map((s) => ({ ...s, email: s.email.trim().toLowerCase() }))
        .filter((s) => Boolean(s.email))
        .sort((a, b) => a.signingOrder - b.signingOrder),
    [signers]
  );

  const repetitionRule: RepetitionRule = useMemo(() => {
    if (repetitionKind === 'pages') {
      const pages = pagesRaw
        .split(/[ ,]+/)
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n) && n >= 1);
      return { kind: 'pages', pages };
    }
    if (repetitionKind === 'all_pages') return { kind: 'all_pages' };
    return { kind: 'once' };
  }, [repetitionKind, pagesRaw]);

  const template: WizardTemplate = useMemo(() => {
    const fields: WizardTemplate['fields'] = [{ kind: 'signature' }];
    if (includeName) fields.push({ kind: 'name', required: true });
    if (includeId) fields.push({ kind: 'id_number', required: true });
    if (includeDate) fields.push({ kind: 'date', required: true });
    if (includeText) fields.push({ kind: 'text', required: false, label: customTextLabel || 'Texto' });
    return { fields, repetitionRule };
  }, [includeName, includeId, includeDate, includeText, customTextLabel, repetitionRule]);

  const previewSummary = useMemo(() => {
    const extras = template.fields.filter((f) => f.kind !== 'signature').map((f) => f.kind);
    const where =
      repetitionRule.kind === 'once'
        ? 'una vez'
        : repetitionRule.kind === 'all_pages'
          ? totalPages
            ? `en todas las paginas (${totalPages})`
            : 'en todas las paginas'
          : repetitionRule.pages.length > 0
            ? `en paginas: ${repetitionRule.pages.join(', ')}`
            : 'en paginas seleccionadas';
    return { extras, where };
  }, [template.fields, repetitionRule, totalPages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Configurar campos por firmante</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              La firma es obligatoria y se incluye automaticamente.
            </p>
          </div>
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
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-semibold text-gray-900">1) Que completara cada firmante</p>

            <label className="mt-2 flex items-center gap-2 text-sm text-gray-800">
              <input type="checkbox" checked disabled className="accent-gray-900" />
              Firma (obligatoria)
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm text-gray-800">
              <input type="checkbox" checked={includeName} onChange={(e) => setIncludeName(e.target.checked)} className="accent-gray-900" />
              Nombre
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm text-gray-800">
              <input type="checkbox" checked={includeId} onChange={(e) => setIncludeId(e.target.checked)} className="accent-gray-900" />
              Documento
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm text-gray-800">
              <input type="checkbox" checked={includeDate} onChange={(e) => setIncludeDate(e.target.checked)} className="accent-gray-900" />
              Fecha
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm text-gray-800">
              <input type="checkbox" checked={includeText} onChange={(e) => setIncludeText(e.target.checked)} className="accent-gray-900" />
              Texto personalizado
            </label>

            {includeText && (
              <div className="mt-2">
                <input
                  value={customTextLabel}
                  onChange={(e) => setCustomTextLabel(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  placeholder="Etiqueta del texto"
                />
                <p className="mt-1 text-[11px] text-gray-500">Este campo es declarado por el firmante (no verificado).</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-semibold text-gray-900">2) Donde se refleja la firma en el PDF</p>
            <label className="mt-2 flex items-center gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name="repeat"
                checked={repetitionKind === 'once'}
                onChange={() => setRepetitionKind('once')}
                className="accent-gray-900"
              />
              Una sola vez
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name="repeat"
                checked={repetitionKind === 'all_pages'}
                onChange={() => setRepetitionKind('all_pages')}
                className="accent-gray-900"
              />
              En todas las paginas
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name="repeat"
                checked={repetitionKind === 'pages'}
                onChange={() => setRepetitionKind('pages')}
                className="accent-gray-900"
              />
              Elegir paginas
            </label>
            {repetitionKind === 'pages' && (
              <div className="mt-2">
                <input
                  value={pagesRaw}
                  onChange={(e) => setPagesRaw(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  placeholder="Ej: 1, 3, 5"
                />
                <p className="mt-1 text-[11px] text-gray-500">Separar con comas o espacios. Paginas empezando en 1.</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs font-semibold text-gray-900">Revision</p>
            <p className="mt-1 text-xs text-gray-700">
              Firmantes: <span className="font-medium">{validSigners.length}</span>
            </p>
            <p className="mt-1 text-xs text-gray-700">
              Campos extra: <span className="font-medium">{previewSummary.extras.length > 0 ? previewSummary.extras.join(', ') : 'ninguno'}</span>
            </p>
            <p className="mt-1 text-xs text-gray-700">
              Firma: <span className="font-medium">{previewSummary.where}</span>
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
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Crear automaticamente
          </button>
        </div>
      </div>
    </div>
  );
}
