import { useEffect, useMemo, useState } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronRight, RotateCw, Maximize2, Minimize2, Info } from 'lucide-react';
import type { SignatureField } from '../../../types/signature-fields';
import { generateWorkflowFieldsFromWizard, type RepetitionRule, type WizardTemplate } from '../../../lib/workflowFieldTemplate';
import { PdfEditViewer } from '../../../components/pdf/PdfEditViewer';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  signers: { email: string; signingOrder: number }[];
  virtualWidth: number;
  detectedVirtualHeight: number;
  totalPages: number | null;
  detectedPageLabel: string;
  previewUrl?: string | null;
  previewIsPdf?: boolean;
  previewPage?: number | null;
  onApply: (result: {
    fields: SignatureField[];
    template: WizardTemplate;
    pageSizeMode: PageSizeMode;
    virtualWidth: number;
    virtualHeight: number;
  }) => void;
};

type CustomField = {
  id: string;
  label: string;
};

type PageSizeMode = 'document' | 'a4' | 'oficio';
type MarginSide = 'right' | 'left';
type PerSignerPlacement = {
  includePerPage: boolean;
  side: MarginSide;
  omitLastPage: boolean;
};

const PAGE_RATIOS = {
  a4: 842 / 595,
  oficio: 1008 / 612
};

export function SignerFieldsWizard({
  isOpen,
  onClose,
  signers,
  virtualWidth,
  detectedVirtualHeight,
  totalPages,
  detectedPageLabel,
  previewUrl,
  previewIsPdf = false,
  previewPage,
  onApply
}: Props) {
  const [includeFinalSignature, setIncludeFinalSignature] = useState(true);
  const [includeName, setIncludeName] = useState(true);
  const [includeId, setIncludeId] = useState(false);
  const [includeDate, setIncludeDate] = useState(true);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [pageSizeMode, setPageSizeMode] = useState<PageSizeMode>('document');
  const [includePerPageSignature, setIncludePerPageSignature] = useState(false);
  const [previewSignerEmails, setPreviewSignerEmails] = useState<string[]>([]);
  const [perSignerPlacement, setPerSignerPlacement] = useState<Record<string, PerSignerPlacement>>({});
  const [previewRotation, setPreviewRotation] = useState(0);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [wizardFields, setWizardFields] = useState<SignatureField[]>([]);
  const [dragState, setDragState] = useState<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [resizeState, setResizeState] = useState<{
    id: string;
    startX: number;
    startY: number;
    originW: number;
    originH: number;
  } | null>(null);
  const [openSections, setOpenSections] = useState<Record<'fields' | 'placement' | 'size' | 'preview', boolean>>({
    fields: false,
    placement: false,
    size: false,
    preview: false
  });

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

  const targetPage = (totalPages ?? 1) + 1;
  const resolvedVirtualHeight =
    pageSizeMode === 'document'
      ? detectedVirtualHeight
      : Math.round(virtualWidth * PAGE_RATIOS[pageSizeMode]);

  const template: WizardTemplate = useMemo(() => {
    const fields: WizardTemplate['fields'] = includeFinalSignature ? [{ kind: 'signature' }] : [];
    if (includeName) fields.push({ kind: 'name', required: true });
    if (includeId) fields.push({ kind: 'id_number', required: true });
    if (includeDate) fields.push({ kind: 'date', required: true });
    customFields.forEach((cf) => {
      fields.push({ kind: 'text', required: true, label: cf.label || 'Texto' });
    });
    return { fields, repetitionRule };
  }, [includeFinalSignature, includeName, includeId, includeDate, customFields]);

  const selectedPerPageSigners = useMemo(() => {
    if (!includePerPageSignature) return [];
    return validSigners;
  }, [includePerPageSignature, validSigners]);

  const selectedPreviewSignerSet = useMemo(
    () => new Set(previewSignerEmails.map((email) => email.trim().toLowerCase())),
    [previewSignerEmails]
  );

  useEffect(() => {
    const validEmails = validSigners.map((signer) => signer.email);
    if (validEmails.length === 0) {
      setPreviewSignerEmails([]);
      return;
    }
    setPreviewSignerEmails((current) => {
      const currentSet = new Set(current.map((email) => email.trim().toLowerCase()));
      const filtered = validEmails.filter((email) => currentSet.has(email));
      if (filtered.length === 0) return validEmails;
      return filtered;
    });
  }, [validSigners]);

  const addCustomField = () => {
    setCustomFields([...customFields, { id: Date.now().toString(), label: '' }]);
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter((f) => f.id !== id));
  };

  const updateCustomFieldLabel = (id: string, label: string) => {
    setCustomFields(customFields.map((f) => (f.id === id ? { ...f, label } : f)));
  };

  const getSignerPlacement = (email: string): PerSignerPlacement => {
    const key = email.trim().toLowerCase();
    return perSignerPlacement[key] ?? {
      includePerPage: true,
      side: 'right',
      omitLastPage: true
    };
  };

  const updateSignerPlacement = (email: string, patch: Partial<PerSignerPlacement>) => {
    const key = email.trim().toLowerCase();
    setPerSignerPlacement((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? {
          includePerPage: true,
          side: 'right',
          omitLastPage: true
        }),
        ...patch
      }
    }));
  };

  const applyPlacementToSelectedSigners = (patch: Partial<PerSignerPlacement>) => {
    previewSignerEmails.forEach((email) => updateSignerPlacement(email, patch));
  };

  const buildPerPageFields = () => {
    if (!includePerPageSignature || selectedPerPageSigners.length === 0) {
      return [] as SignatureField[];
    }
    const pagesCount = Math.max(1, totalPages ?? 1);
    const marginX = 24;
    const marginBottom = 56;
    const rowGap = 8;

    const out: SignatureField[] = [];
    selectedPerPageSigners.forEach((signer, signerIdx) => {
      const placement = getSignerPlacement(signer.email);
      if (!placement.includePerPage) return;

      const pages = Array.from({ length: pagesCount }, (_, idx) => idx + 1).filter((page) => {
        if (includeFinalSignature && placement.omitLastPage && pagesCount > 1) {
          return page !== pagesCount;
        }
        return true;
      });
      if (pages.length === 0) return;

      const generated = generateWorkflowFieldsFromWizard(
        [signer],
        { fields: [{ kind: 'signature' }], repetitionRule: { kind: 'pages', pages } },
        {
          virtualWidth,
          virtualHeight: resolvedVirtualHeight,
          totalPages,
          targetPage: undefined
        }
      );

      generated.forEach((field) => {
        const x =
          placement.side === 'right'
            ? Math.max(marginX, virtualWidth - marginX - field.width)
            : marginX;
        const y = Math.max(
          24,
          resolvedVirtualHeight - marginBottom - field.height - signerIdx * (field.height + rowGap)
        );
        out.push({ ...field, x, y, applyToAllPages: false });
      });
    });

    return out;
  };

  const previewBaseFields = useMemo(
    () =>
      generateWorkflowFieldsFromWizard(validSigners, template, {
        virtualWidth,
        virtualHeight: resolvedVirtualHeight,
        totalPages,
        targetPage
      }),
    [validSigners, template, virtualWidth, resolvedVirtualHeight, totalPages, targetPage]
  );

  const previewPerPageFields = useMemo(
    () => buildPerPageFields(),
    [
      includePerPageSignature,
      selectedPerPageSigners,
      includeFinalSignature,
      perSignerPlacement,
      totalPages,
      virtualWidth,
      resolvedVirtualHeight
    ]
  );

  const autoFields = useMemo(
    () => [...previewBaseFields, ...previewPerPageFields],
    [previewBaseFields, previewPerPageFields]
  );

  useEffect(() => {
    setWizardFields(autoFields);
  }, [autoFields]);

  const previewItems = wizardFields;
  const previewItemsVisible =
    previewSignerEmails.length === 0
      ? previewItems
      : previewItems.filter((field) => {
          const assigned = (field.assignedTo || '').trim().toLowerCase();
          return assigned.length > 0 && selectedPreviewSignerSet.has(assigned);
        });

  const pdfPreviewSrc = previewIsPdf && previewUrl ? previewUrl : null;

  const toggleSection = (section: 'fields' | 'placement' | 'size' | 'preview') => {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }));
  };

  useEffect(() => {
    if (!previewFullscreen) return;
    const scale = 0.82;
    const onMove = (event: MouseEvent) => {
      if (dragState) {
        const dx = (event.clientX - dragState.startX) / scale;
        const dy = (event.clientY - dragState.startY) / scale;
        setWizardFields((prev) =>
          prev.map((field) => {
            if (field.id !== dragState.id) return field;
            return {
              ...field,
              x: Math.max(0, Math.min(virtualWidth - field.width, dragState.originX + dx)),
              y: Math.max(0, Math.min(resolvedVirtualHeight - field.height, dragState.originY + dy))
            };
          })
        );
      }
      if (resizeState) {
        const dx = (event.clientX - resizeState.startX) / scale;
        const dy = (event.clientY - resizeState.startY) / scale;
        setWizardFields((prev) =>
          prev.map((field) => {
            if (field.id !== resizeState.id) return field;
            const nextWidth = Math.max(60, Math.min(virtualWidth - field.x, resizeState.originW + dx));
            const nextHeight = Math.max(24, Math.min(resolvedVirtualHeight - field.y, resizeState.originH + dy));
            return { ...field, width: nextWidth, height: nextHeight };
          })
        );
      }
    };
    const onUp = () => {
      setDragState(null);
      setResizeState(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [previewFullscreen, dragState, resizeState, virtualWidth, resolvedVirtualHeight]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">Configuración de campos</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[64vh] overflow-y-auto">
          {/* Sección 1: Campos */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('fields')}
              className="w-full flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200"
            >
              <div className="text-left">
                <p className="text-xs font-semibold text-gray-700">1. Campos del firmante</p>
                <p className="text-[11px] text-gray-500">
                  {includeFinalSignature ? 'Firma' : 'Sin firma final'}
                  {includeName ? ' + Nombre' : ''}
                  {includeDate ? ' + Fecha' : ''}
                  {includeId ? ' + Identidad' : ''}
                </p>
              </div>
              {openSections.fields ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
            </button>
            {openSections.fields && (
              <div className="px-3 pt-2 pb-1 grid grid-cols-1 sm:grid-cols-2 gap-2 items-start">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-not-allowed opacity-60">
                    <input
                      type="checkbox"
                      checked
                      disabled
                      className="eco-checkbox rounded border-gray-300 text-gray-400 focus:ring-0 cursor-not-allowed"
                    />
                    <span>Firma (obligatoria)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeName}
                      onChange={(e) => setIncludeName(e.target.checked)}
                      className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Nombre completo</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeId}
                      onChange={(e) => setIncludeId(e.target.checked)}
                      className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Identidad</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDate}
                      onChange={(e) => setIncludeDate(e.target.checked)}
                      className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Fecha</span>
                  </label>
                </div>

                <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-gray-200 pt-1 sm:pt-0 sm:pl-2 self-start">
                  <p className="text-[11px] font-semibold text-gray-600">Campos personalizados</p>
                  {customFields.length > 0 ? (
                    <div className="space-y-0.5">
                      {customFields.map((field) => (
                        <div key={field.id} className="flex items-center gap-1">
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => updateCustomFieldLabel(field.id, e.target.value)}
                            placeholder="Nuevo campo"
                            className="w-full max-w-[220px] h-7 px-2 py-0 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500"
                          />
                          <button
                            type="button"
                            onClick={() => removeCustomField(field.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors p-0.5"
                            title="Eliminar campo"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      readOnly
                      placeholder="Nuevo campo"
                      className="w-full max-w-[220px] h-7 px-2 py-0 text-xs border border-gray-300 rounded-md bg-gray-50 text-gray-400"
                    />
                  )}
                  <button
                    type="button"
                    onClick={addCustomField}
                    className="h-6 inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Nuevo campo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sección 2: Ubicación */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('placement')}
              className="w-full flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200"
            >
              <div className="text-left">
                <p className="text-xs font-semibold text-gray-700">2. Ubicación en el documento</p>
                <p className="text-[11px] text-gray-500">
                  {includeFinalSignature ? 'Firma final' : 'Sin firma final'} {includePerPageSignature ? '+ firma en cada página' : ''}
                </p>
              </div>
              {openSections.placement ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
            </button>
            {openSections.placement && (
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeFinalSignature}
                      onChange={(e) => setIncludeFinalSignature(e.target.checked)}
                      className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Incluir firma final</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePerPageSignature}
                      onChange={(e) => setIncludePerPageSignature(e.target.checked)}
                      className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="inline-flex items-center gap-1">
                      Incluir firma en cada página
                      <span
                        className="inline-flex items-center text-gray-400 hover:text-gray-600"
                        title="Las firmas por página se ubican inicialmente en el margen inferior derecho."
                      >
                        <Info className="w-3 h-3" />
                      </span>
                    </span>
                  </label>
                </div>
                <div className="border-t sm:border-t-0 sm:border-l border-gray-200 sm:pl-3 pt-2 sm:pt-0">
                  <div className="text-[10px] text-gray-500 font-medium mb-1">Firmantes</div>
                  <div className="border border-gray-200 rounded-md p-2 max-h-28 overflow-y-auto">
                    <div className="grid grid-cols-1 gap-1">
                      {validSigners.map((signer) => {
                        return (
                          <div key={signer.email} className="text-xs text-gray-700" title={signer.email}>
                            Firmante {signer.signingOrder}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sección 3: Tamaño */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('size')}
              className="w-full flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200"
            >
              <div className="text-left">
                <p className="text-xs font-semibold text-gray-700">3. Tamaño de página</p>
                <p className="text-[11px] text-gray-500">
                  {pageSizeMode === 'document' ? `Usar tamaño detectado (${detectedPageLabel})` : pageSizeMode === 'a4' ? 'Forzar A4' : 'Forzar Oficio'}
                </p>
              </div>
              {openSections.size ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
            </button>
            {openSections.size && (
              <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-2">
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pageSizeMode === 'document'}
                    onChange={() => setPageSizeMode('document')}
                    className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Usar tamaño del documento (detectado: {detectedPageLabel})</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pageSizeMode === 'a4'}
                    onChange={() => setPageSizeMode('a4')}
                    className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Forzar A4</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pageSizeMode === 'oficio'}
                    onChange={() => setPageSizeMode('oficio')}
                    className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Forzar Oficio</span>
                </label>
              </div>
            )}
          </div>

          {/* Sección 4: Previsualización */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('preview')}
              className="w-full flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200"
            >
              <div className="text-left">
                <p className="text-xs font-semibold text-gray-700">4. Previsualización</p>
                <p className="text-[11px] text-gray-500">Vista simplificada del documento y campos</p>
              </div>
              {openSections.preview ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
            </button>
            {openSections.preview && (
              <div className="p-3">
                <div className="flex items-start gap-3">
                  <div
                    className="relative border border-gray-200 rounded-md bg-gray-50 overflow-hidden"
                    style={{ width: 180, height: Math.round((180 * resolvedVirtualHeight) / virtualWidth) }}
                  >
                    <div className="absolute right-1 top-1 z-10 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewRotation((prev) => (prev + 90) % 360)}
                        className="h-4 w-4 inline-flex items-center justify-center rounded-sm bg-white/85 text-gray-600 hover:text-gray-900 border border-gray-200"
                        title="Rotar documento"
                      >
                        <RotateCw className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewFullscreen(true)}
                        className="h-4 w-4 inline-flex items-center justify-center rounded-sm bg-white/85 text-gray-600 hover:text-gray-900 border border-gray-200"
                        title="Ver en pantalla completa"
                      >
                        <Maximize2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    {previewIsPdf && pdfPreviewSrc ? (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ transform: `rotate(${previewRotation}deg)`, transformOrigin: 'center center' }}
                      >
                        <PdfEditViewer
                          src={pdfPreviewSrc}
                          locked
                          virtualWidth={virtualWidth}
                          scale={180 / virtualWidth}
                          pageGap={0}
                          className="bg-transparent"
                        />
                      </div>
                    ) : previewUrl && !previewIsPdf ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="absolute inset-0 w-full h-full object-contain"
                        style={{ transform: `rotate(${previewRotation}deg)`, transformOrigin: 'center center' }}
                      />
                    ) : null}
                    {previewItemsVisible.map((field) => {
                      const scaleX = 180 / virtualWidth;
                      const scaleY = Math.round((180 * resolvedVirtualHeight) / virtualWidth) / resolvedVirtualHeight;
                      return (
                        <div
                          key={field.id}
                          className="absolute border border-blue-400/80 bg-blue-100/40 text-[9px] text-blue-900 px-1"
                          style={{
                            left: field.x * scaleX,
                            top: field.y * scaleY,
                            width: field.width * scaleX,
                            height: field.height * scaleY
                          }}
                        >
                          {field.metadata?.label || 'Campo'}
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] w-[210px]">
                    <div className="space-y-2">
                      <div className="text-[10px] text-gray-500 font-medium">Opciones</div>
                      <label className="flex items-center gap-1.5 text-[11px] text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            previewSignerEmails.length > 0 &&
                            previewSignerEmails.every((email) => getSignerPlacement(email).side === 'right')
                          }
                          onChange={(e) => {
                            if (!e.target.checked) return;
                            applyPlacementToSelectedSigners({ side: 'right' });
                          }}
                          disabled={previewSignerEmails.length === 0}
                          className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                        Margen derecho
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            previewSignerEmails.length > 0 &&
                            previewSignerEmails.every((email) => getSignerPlacement(email).side === 'left')
                          }
                          onChange={(e) => {
                            if (!e.target.checked) return;
                            applyPlacementToSelectedSigners({ side: 'left' });
                          }}
                          disabled={previewSignerEmails.length === 0}
                          className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                        Margen izquierdo
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            previewSignerEmails.length > 0 &&
                            previewSignerEmails.every((email) => getSignerPlacement(email).omitLastPage)
                          }
                          onChange={(e) => {
                            applyPlacementToSelectedSigners({ omitLastPage: e.target.checked });
                          }}
                          disabled={previewSignerEmails.length === 0 || !includePerPageSignature || (totalPages ?? 1) <= 1}
                          className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                        Omitir última página
                      </label>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-gray-500 font-medium">Firmantes</div>
                      {validSigners.map((signer) => {
                        const key = signer.email.trim().toLowerCase();
                        const selected = selectedPreviewSignerSet.has(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setPreviewSignerEmails((current) => {
                                if (current.includes(key)) {
                                  if (current.length <= 1) return current;
                                  return current.filter((email) => email !== key);
                                }
                                return [...current, key];
                              });
                            }}
                            className={`w-full text-left rounded px-1.5 py-1 border text-[11px] ${
                              selected
                                ? 'border-blue-400 bg-blue-50 text-blue-700'
                                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                            title={signer.email}
                          >
                            Firmante {signer.signingOrder}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
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
              onApply({
                fields: wizardFields,
                template,
                pageSizeMode,
                virtualWidth,
                virtualHeight: resolvedVirtualHeight
              });
            }}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Aplicar
          </button>
        </div>
      </div>
      {previewFullscreen && (
        <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4">
          <div className="relative w-[92vw] h-[86vh] rounded-xl bg-white p-3 overflow-hidden">
            <div className="absolute right-4 top-4 z-10 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPreviewRotation((prev) => (prev + 90) % 360)}
                className="h-7 w-7 inline-flex items-center justify-center rounded-md bg-white text-gray-600 hover:text-gray-900 border border-gray-200"
                title="Rotar documento"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewFullscreen(false)}
                className="h-7 w-7 inline-flex items-center justify-center rounded-md bg-white text-gray-600 hover:text-gray-900 border border-gray-200"
                title="Salir de pantalla completa"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
            <div className="w-full h-full border border-gray-200 rounded-md bg-gray-50 overflow-hidden relative">
              {previewIsPdf && pdfPreviewSrc ? (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ transform: `rotate(${previewRotation}deg)`, transformOrigin: 'center center' }}
                >
                  <PdfEditViewer
                    src={pdfPreviewSrc}
                    locked
                    virtualWidth={virtualWidth}
                    scale={0.82}
                    pageGap={0}
                    className="bg-transparent"
                  />
                </div>
              ) : previewUrl && !previewIsPdf ? (
                <img
                  src={previewUrl}
                  alt="Preview fullscreen"
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ transform: `rotate(${previewRotation}deg)`, transformOrigin: 'center center' }}
                />
              ) : null}
              {previewItemsVisible.map((field) => {
                const scaleX = virtualWidth * 0.82 / virtualWidth;
                const scaleY = resolvedVirtualHeight * 0.82 / resolvedVirtualHeight;
                return (
                  <div
                    key={`full-${field.id}`}
                    className="absolute border border-blue-400/80 bg-blue-100/40 text-[10px] text-blue-900 px-1 group"
                    style={{
                      left: field.x * scaleX,
                      top: field.y * scaleY,
                      width: field.width * scaleX,
                      height: field.height * scaleY
                    }}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setDragState({
                        id: field.id,
                        startX: event.clientX,
                        startY: event.clientY,
                        originX: field.x,
                        originY: field.y
                      });
                    }}
                  >
                    {field.metadata?.label || 'Campo'}
                    <button
                      type="button"
                      className="absolute -top-5 -right-5 h-4 w-4 rounded-sm border border-gray-300 bg-white text-gray-600 opacity-0 group-hover:opacity-100"
                      title="Eliminar campo"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setWizardFields((prev) => prev.filter((item) => item.id !== field.id));
                      }}
                    >
                      ×
                    </button>
                    <button
                      type="button"
                      className="absolute -bottom-2 -right-2 h-3.5 w-3.5 rounded-sm border border-gray-300 bg-white text-[9px] text-gray-600 opacity-0 group-hover:opacity-100 cursor-se-resize"
                      title="Cambiar tamaño"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setResizeState({
                          id: field.id,
                          startX: event.clientX,
                          startY: event.clientY,
                          originW: field.width,
                          originH: field.height
                        });
                      }}
                    >
                      ↘
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
