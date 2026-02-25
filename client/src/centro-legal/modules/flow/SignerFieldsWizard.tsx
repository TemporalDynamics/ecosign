import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronRight, RotateCw, Maximize2, Minimize2, Info, Move } from 'lucide-react';
import type { SignatureField } from '../../../types/signature-fields';
import { generateWorkflowFieldsFromWizard, type RepetitionRule, type WizardTemplate } from '../../../lib/workflowFieldTemplate';
import { PdfEditViewer } from '../../../components/pdf/PdfEditViewer';
import { getDocument } from 'pdfjs-dist/build/pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist/build/pdf';
import { ensurePdfJsWorkerConfigured } from '../../../components/pdf/pdfjsRuntime';

ensurePdfJsWorkerConfigured();

type Props = {
  isOpen: boolean;
  onClose: () => void;
  signers: { email: string; signingOrder: number }[];
  virtualWidth: number;
  detectedVirtualHeight: number;
  totalPages: number | null;
  detectedPageLabel: string;
  previewUrl?: string | null;
  previewPdfData?: ArrayBuffer | null;
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

function createFieldId() {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  return `wfz-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function SignerFieldsWizard({
  isOpen,
  onClose,
  signers,
  virtualWidth,
  detectedVirtualHeight,
  totalPages,
  detectedPageLabel,
  previewUrl,
  previewPdfData = null,
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
  const [includePerPageName, setIncludePerPageName] = useState(false);
  const [includePerPageDate, setIncludePerPageDate] = useState(false);
  const [activeSignerEmail, setActiveSignerEmail] = useState<string>('');
  const [perSignerPlacement, setPerSignerPlacement] = useState<Record<string, PerSignerPlacement>>({});
  const [previewRotation, setPreviewRotation] = useState(0);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [pdfPreviewFailed, setPdfPreviewFailed] = useState(false);
  const [pdfPreviewThumb, setPdfPreviewThumb] = useState<string | null>(null);
  const [wizardFields, setWizardFields] = useState<SignatureField[]>([]);
  const [dragState, setDragState] = useState<{
    id: string;
    batchId?: string;
    moveBatch: boolean;
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
  const [openSections, setOpenSections] = useState<Record<'signatures' | 'size' | 'preview', boolean>>({
    signatures: true,
    size: false,
    preview: true
  });
  const [personalizeBySigner, setPersonalizeBySigner] = useState(false);
  const fullscreenScrollRef = useRef<HTMLDivElement | null>(null);
  const FULL_SCALE = 0.82;
  const [openSignatureBlock, setOpenSignatureBlock] = useState<'final' | 'perPage' | null>('final');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

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

  const targetPage = Math.max(1, totalPages ?? 1);
  const resolvedVirtualHeight =
    pageSizeMode === 'document'
      ? detectedVirtualHeight
      : Math.round(virtualWidth * PAGE_RATIOS[pageSizeMode]);

  const template: WizardTemplate = useMemo(() => {
    const fields: WizardTemplate['fields'] = [];
    if (includeFinalSignature) {
      fields.push({ kind: 'signature' });
      if (includeName) fields.push({ kind: 'name', required: true });
      if (includeId) fields.push({ kind: 'id_number', required: true });
      if (includeDate) fields.push({ kind: 'date', required: true });
      customFields.forEach((cf) => {
        fields.push({ kind: 'text', required: true, label: cf.label || 'Texto' });
      });
    }
    return { fields, repetitionRule };
  }, [includeFinalSignature, includeName, includeId, includeDate, customFields]);

  const selectedPerPageSigners = useMemo(() => {
    if (!includePerPageSignature) return [];
    return validSigners;
  }, [includePerPageSignature, validSigners]);

  const selectedSignerEmails = useMemo(() => {
    if (personalizeBySigner && activeSignerEmail) return [activeSignerEmail];
    return validSigners.map((signer) => signer.email);
  }, [personalizeBySigner, activeSignerEmail, validSigners]);

  useEffect(() => {
    const validEmails = validSigners.map((signer) => signer.email);
    if (validEmails.length === 0) {
      setActiveSignerEmail('');
      return;
    }
    setActiveSignerEmail((current) => (validEmails.includes(current) ? current : validEmails[0]));
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

  const applyPlacementToActiveSigner = (patch: Partial<PerSignerPlacement>) => {
    selectedSignerEmails.forEach((email) => updateSignerPlacement(email, patch));
  };

  const scopePlacements = selectedSignerEmails.map((email) => getSignerPlacement(email));
  const isRightSelected = scopePlacements.length > 0 && scopePlacements.every((placement) => placement.side === 'right');
  const isLeftSelected = scopePlacements.length > 0 && scopePlacements.every((placement) => placement.side === 'left');
  const isOmitLastSelected = scopePlacements.length > 0 && scopePlacements.every((placement) => placement.omitLastPage);

  const toggleMarginSide = (side: MarginSide, checked: boolean) => {
    if (!includePerPageSignature || !activeSignerEmail) return;
    if (!checked) return; // comportamiento exclusivo tipo radio manteniendo estética checkbox
    applyPlacementToActiveSigner({ side });
  };

  const buildPerPageFields = () => {
    if (!includePerPageSignature || selectedPerPageSigners.length === 0) {
      return [] as SignatureField[];
    }
    const pagesCount = Math.max(1, totalPages ?? 1);
    const marginX = 24;
    const upperBandStart = Math.max(24, Math.round(resolvedVirtualHeight * 0.18));
    const upperBandEnd = Math.max(upperBandStart + 110, Math.round(resolvedVirtualHeight * 0.50));
    const rowGap = 8;
    const signatureSize = { w: 220, h: 58 };
    const fieldSize = { w: 180, h: 28 };
    const stackGap = 6;
    const stackHeight =
      signatureSize.h +
      (includePerPageName ? fieldSize.h + stackGap : 0) +
      (includePerPageDate ? fieldSize.h + stackGap : 0);

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
      const batchId = createFieldId();
      const x =
        placement.side === 'right'
          ? Math.max(marginX, virtualWidth - marginX - signatureSize.w)
          : marginX;
      const preferredY = upperBandStart + signerIdx * (stackHeight + rowGap);
      const y = Math.max(24, Math.min(preferredY, upperBandEnd - stackHeight));

      pages.forEach((page) => {
        out.push({
          id: createFieldId(),
          batchId,
          assignedTo: signer.email,
          type: 'signature',
          page,
          x,
          y,
          width: signatureSize.w,
          height: signatureSize.h,
          required: true,
          applyToAllPages: false,
          metadata: {
            label: 'Firma',
            logical_field_kind: 'signature',
            logical_field_id: 'signature',
            repetition_rule: { kind: 'pages', pages }
          }
        });

        let cursorY = y + signatureSize.h + stackGap;
        if (includePerPageName) {
          out.push({
            id: createFieldId(),
            batchId,
            assignedTo: signer.email,
            type: 'text',
            page,
            x,
            y: cursorY,
            width: fieldSize.w,
            height: fieldSize.h,
            required: true,
            metadata: {
              label: 'Nombre',
              logical_field_kind: 'name',
              logical_field_id: 'name',
              repetition_rule: { kind: 'pages', pages }
            }
          });
          cursorY += fieldSize.h + stackGap;
        }
        if (includePerPageDate) {
          out.push({
            id: createFieldId(),
            batchId,
            assignedTo: signer.email,
            type: 'date',
            page,
            x,
            y: cursorY,
            width: fieldSize.w,
            height: fieldSize.h,
            required: true,
            metadata: {
              label: 'Fecha',
              logical_field_kind: 'date',
              logical_field_id: 'date',
              repetition_rule: { kind: 'pages', pages }
            }
          });
        }
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
      includePerPageName,
      includePerPageDate,
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

  useEffect(() => {
    if (validationErrors.length === 0) return;
    setValidationErrors(evaluateWizardValidation());
    // Re-evaluate only when signature-relevant state changes after an error is shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeFinalSignature, includePerPageSignature, includePerPageName, includePerPageDate, wizardFields, validSigners]);

  const previewItems = wizardFields;
  const previewItemsVisible = activeSignerEmail
    ? (personalizeBySigner
      ? previewItems.filter((field) => {
        const assigned = (field.assignedTo || '').trim().toLowerCase();
        return assigned.length > 0 && assigned === activeSignerEmail;
      })
      : previewItems)
    : previewItems;
  // Bounding boxes for each batch group (absolute Y, accounting for page offset)
  const batchBoundingBoxes = useMemo(() => {
    const boxes = new Map<string, { x: number; y: number; w: number; h: number }>();
    for (const field of previewItemsVisible) {
      const batchKey = field.batchId || field.id;
      const absY = (field.page - 1) * resolvedVirtualHeight + field.y;
      const existing = boxes.get(batchKey);
      if (!existing) {
        boxes.set(batchKey, { x: field.x, y: absY, w: field.width, h: field.height });
      } else {
        const minX = Math.min(existing.x, field.x);
        const minY = Math.min(existing.y, absY);
        const maxX = Math.max(existing.x + existing.w, field.x + field.width);
        const maxY = Math.max(existing.y + existing.h, absY + field.height);
        boxes.set(batchKey, { x: minX, y: minY, w: maxX - minX, h: maxY - minY });
      }
    }
    return boxes;
  }, [previewItemsVisible, resolvedVirtualHeight]);

  const pdfPreviewSrc = previewIsPdf && previewUrl ? previewUrl : null;
  const miniPreviewWidth = 250;
  const miniPreviewHeight = Math.max(150, Math.round((miniPreviewWidth * resolvedVirtualHeight) / virtualWidth));

  useEffect(() => {
    // Reset when source changes / wizard reopens.
    setPdfPreviewFailed(false);
    setPdfPreviewThumb(null);
  }, [pdfPreviewSrc, previewPdfData, previewIsPdf, isOpen]);

  useEffect(() => {
    let cancelled = false;

    if (!previewIsPdf || !previewPdfData) {
      setPdfPreviewThumb(null);
      return () => {
        cancelled = true;
      };
    }

    const buildThumb = async () => {
      try {
        const doc: PDFDocumentProxy = await getDocument({ data: previewPdfData.slice(0) }).promise;
        if (!doc) {
          setPdfPreviewThumb(null);
          return;
        }
        const page = await doc.getPage(1);
        const base = page.getViewport({ scale: 1 });
        const thumbWidth = miniPreviewWidth;
        const scale = thumbWidth / Math.max(1, base.width);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const context = canvas.getContext('2d');
        if (!context) {
          setPdfPreviewThumb(null);
          return;
        }
        await page.render({ canvasContext: context, viewport }).promise;
        if (cancelled) return;
        setPdfPreviewThumb(canvas.toDataURL('image/jpeg', 0.75));
      } catch {
        if (!cancelled) {
          setPdfPreviewThumb(null);
          setPdfPreviewFailed(true);
        }
      }
    };

    buildThumb();
    return () => {
      cancelled = true;
    };
  }, [previewIsPdf, previewPdfData, miniPreviewWidth]);

  const evaluateWizardValidation = () => {
    const errors: string[] = [];

    if (!includeFinalSignature && !includePerPageSignature) {
      errors.push('Debes activar al menos una opción: "Incluir firma final" o "Incluir firma en cada página".');
    }

    const signatureCounts = new Map<string, number>();
    validSigners.forEach((signer) => signatureCounts.set(signer.email, 0));

    wizardFields.forEach((field) => {
      if (field.type !== 'signature') return;
      const assigned = (field.assignedTo || '').trim().toLowerCase();
      if (!assigned || !signatureCounts.has(assigned)) return;
      signatureCounts.set(assigned, (signatureCounts.get(assigned) || 0) + 1);
    });

    validSigners.forEach((signer) => {
      if ((signatureCounts.get(signer.email) || 0) < 1) {
        errors.push(`El firmante ${signer.signingOrder} no tiene ningún campo de firma asignado.`);
      }
    });

    return errors;
  };

  const toggleSection = (section: 'signatures' | 'size' | 'preview') => {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }));
  };

  // Auto-scroll to show the signature fields when fullscreen opens
  useEffect(() => {
    if (!previewFullscreen || !fullscreenScrollRef.current) return;
    const lowestAbsY = previewItemsVisible.reduce((max, f) => {
      return Math.max(max, (f.page - 1) * resolvedVirtualHeight + f.y + f.height);
    }, 0);
    const containerH = fullscreenScrollRef.current.clientHeight;
    const targetScroll = lowestAbsY * FULL_SCALE - containerH * 0.7;
    fullscreenScrollRef.current.scrollTop = Math.max(0, targetScroll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewFullscreen]);

  useEffect(() => {
    if (!previewFullscreen) return;
    const maxXBase = virtualWidth;
    const maxYBase = resolvedVirtualHeight;
    const onMove = (event: MouseEvent) => {
      if (dragState) {
        const dx = (event.clientX - dragState.startX) / FULL_SCALE;
        const dy = (event.clientY - dragState.startY) / FULL_SCALE;
        if (dragState.moveBatch && dragState.batchId) {
          setWizardFields((prev) => {
            const batchFields = prev.filter((f) => f.batchId === dragState.batchId);
            // Compute max delta that keeps every field in bounds
            let clampedDx = dx;
            let clampedDy = dy;
            for (const f of batchFields) {
              clampedDx = Math.max(-f.x, Math.min(clampedDx, maxXBase - f.width - f.x));
              clampedDy = Math.max(-f.y, Math.min(clampedDy, maxYBase - f.height - f.y));
            }
            return prev.map((field) => {
              if (field.batchId !== dragState.batchId) return field;
              return { ...field, x: field.x + clampedDx, y: field.y + clampedDy };
            });
          });
          setDragState((current) =>
            current ? { ...current, startX: event.clientX, startY: event.clientY } : current
          );
        } else {
          setWizardFields((prev) =>
            prev.map((field) => {
              if (field.id !== dragState.id) return field;
              return {
                ...field,
                x: Math.max(0, Math.min(maxXBase - field.width, dragState.originX + dx)),
                y: Math.max(0, Math.min(maxYBase - field.height, dragState.originY + dy))
              };
            })
          );
        }
      }
      if (resizeState) {
        const dx = (event.clientX - resizeState.startX) / FULL_SCALE;
        const dy = (event.clientY - resizeState.startY) / FULL_SCALE;
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
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl">
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

        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* Sección 1: Firmas del documento */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white border-b border-gray-200">
              <button
                type="button"
                onClick={() => toggleSection('signatures')}
                className="flex-1 min-w-0 flex items-center justify-between text-left"
              >
                <div className="text-left">
                  <p className="text-xs font-semibold text-gray-700">1. Configuración de campos por firmante</p>
                  <p className="text-[11px] text-gray-500">Configurá firma final y firma en cada página</p>
                </div>
                {openSections.signatures ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
              </button>
              <div className="h-7 px-2 rounded-md border border-gray-200 bg-gray-50 text-[11px] text-gray-600 inline-flex items-center gap-2">
                <span>{personalizeBySigner ? 'Personalizando por firmante' : 'Aplica a todos'}</span>
                {validSigners.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPersonalizeBySigner((prev) => !prev)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {personalizeBySigner ? 'Volver a todos' : 'Personalizar por firmante'}
                  </button>
                )}
              </div>
            </div>
            {openSections.signatures && (
              <div className="p-3 space-y-3">
                {personalizeBySigner && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                    <div className="flex flex-wrap gap-1.5">
                      {validSigners.map((signer) => {
                        const selected = activeSignerEmail === signer.email;
                        return (
                          <button
                            key={signer.email}
                            type="button"
                            onClick={() => setActiveSignerEmail(signer.email)}
                            className={`h-7 px-2 rounded-md border text-[11px] transition-colors ${
                              selected
                                ? 'border-blue-300 bg-blue-50 text-blue-700'
                                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                            title={signer.email}
                          >
                            Firmante {signer.signingOrder}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <div className={`rounded-lg border ${includeFinalSignature ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'}`}>
                    <button
                      type="button"
                      onClick={() => setOpenSignatureBlock((prev) => (prev === 'final' ? null : 'final'))}
                      className="w-full px-3 py-2 flex items-center justify-between border-b border-gray-200"
                    >
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeFinalSignature}
                          onChange={(e) => setIncludeFinalSignature(e.target.checked)}
                          className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                        <span>Firma al final del documento</span>
                      </label>
                      {openSignatureBlock === 'final' ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                    </button>
                    {openSignatureBlock === 'final' && (
                      <div className={`p-3 ${includeFinalSignature ? '' : 'opacity-50 pointer-events-none'}`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <p className="text-[11px] font-medium text-gray-600">Campos incluidos</p>
                            <label className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer">
                              <input type="checkbox" checked={true} disabled className="eco-checkbox rounded border-gray-300 text-gray-400 cursor-not-allowed" />
                              <span>Firma</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer">
                              <input type="checkbox" checked={includeName} onChange={(e) => setIncludeName(e.target.checked)} className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer" />
                              <span>Nombre completo</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer">
                              <input type="checkbox" checked={includeDate} onChange={(e) => setIncludeDate(e.target.checked)} className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer" />
                              <span>Fecha</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer">
                              <input type="checkbox" checked={includeId} onChange={(e) => setIncludeId(e.target.checked)} className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer" />
                              <span>Identidad</span>
                            </label>
                          </div>
                          <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l border-gray-200 pt-2 sm:pt-0 sm:pl-3">
                            <p className="text-[11px] font-medium text-gray-600">Campos personalizados</p>
                            {customFields.map((field) => (
                              <div key={field.id} className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={(e) => updateCustomFieldLabel(field.id, e.target.value)}
                                  placeholder="Nuevo campo"
                                  className="w-full h-7 px-2 py-0 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500"
                                />
                                <button type="button" onClick={() => removeCustomField(field.id)} className="text-gray-400 hover:text-red-600 transition-colors p-0.5" title="Eliminar campo">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            <button type="button" onClick={addCustomField} className="h-7 px-2 inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors border border-dashed border-gray-300 rounded-md">
                              <Plus className="w-3 h-3" />
                              Nuevo campo
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`rounded-lg border ${includePerPageSignature ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'}`}>
                    <button
                      type="button"
                      onClick={() => setOpenSignatureBlock((prev) => (prev === 'perPage' ? null : 'perPage'))}
                      className="w-full px-3 py-2 flex items-center justify-between border-b border-gray-200"
                    >
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includePerPageSignature}
                          onChange={(e) => setIncludePerPageSignature(e.target.checked)}
                          className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="inline-flex items-center gap-1">
                          Firma en cada página
                          <span className="inline-flex items-center text-gray-400 hover:text-gray-600" title="Las firmas por página se ubican inicialmente en zona media-superior.">
                            <Info className="w-3 h-3" />
                          </span>
                        </span>
                      </label>
                      {openSignatureBlock === 'perPage' ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                    </button>
                    {openSignatureBlock === 'perPage' && (
                      <div className={`p-3 ${includePerPageSignature ? '' : 'opacity-50 pointer-events-none'}`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <p className="text-[11px] font-medium text-gray-600">Campos incluidos</p>
                            <label className="flex items-center gap-2 text-xs text-gray-800">
                              <input type="checkbox" checked={true} disabled className="eco-checkbox rounded border-gray-300 text-gray-400 cursor-not-allowed" />
                              <span>Firma</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={includePerPageName}
                                onChange={(e) => setIncludePerPageName(e.target.checked)}
                                className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                              />
                              <span>Nombre</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={includePerPageDate}
                                onChange={(e) => setIncludePerPageDate(e.target.checked)}
                                className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                              />
                              <span>Fecha</span>
                            </label>
                          </div>
                          <div className="space-y-2 border-t sm:border-t-0 sm:border-l border-gray-200 pt-2 sm:pt-0 sm:pl-3">
                            <p className="text-[11px] font-medium text-gray-600">Opciones</p>
                            <label className="flex items-center gap-1.5 text-[11px] text-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                              checked={includePerPageSignature && isRightSelected}
                              onChange={(e) => toggleMarginSide('right', e.target.checked)}
                              disabled={!includePerPageSignature || selectedSignerEmails.length === 0}
                              className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            />
                            Margen derecho
                            </label>
                            <label className="flex items-center gap-1.5 text-[11px] text-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                              checked={includePerPageSignature && isLeftSelected}
                              onChange={(e) => toggleMarginSide('left', e.target.checked)}
                              disabled={!includePerPageSignature || selectedSignerEmails.length === 0}
                              className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            />
                            Margen izquierdo
                            </label>
                            <label className="flex items-center gap-1.5 text-[11px] text-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                              checked={includePerPageSignature && isOmitLastSelected}
                              onChange={(e) => applyPlacementToActiveSigner({ omitLastPage: e.target.checked })}
                              disabled={!includePerPageSignature || selectedSignerEmails.length === 0 || (totalPages ?? 1) <= 1}
                              className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            />
                            Omitir última página
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sección 2: Tamaño */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('size')}
              className="w-full flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200"
            >
              <div className="text-left">
                <p className="text-xs font-semibold text-gray-700">2. Tamaño de página</p>
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

          {/* Sección 3: Previsualización */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('preview')}
              className="w-full flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200"
            >
              <div className="text-left">
                <p className="text-xs font-semibold text-gray-700">3. Previsualización</p>
                <p className="text-[11px] text-gray-500">Vista simplificada del documento y campos</p>
              </div>
              {openSections.preview ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
            </button>
            {openSections.preview && (
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className="relative border border-gray-200 rounded-md bg-gray-50 overflow-hidden"
                    style={{ width: miniPreviewWidth, height: miniPreviewHeight }}
                  >
                    <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewRotation((prev) => (prev + 90) % 360)}
                        className="h-6 w-6 inline-flex items-center justify-center rounded-md bg-white/90 text-gray-600 hover:text-gray-900 border border-gray-200 shadow-sm"
                        title="Rotar documento"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewFullscreen(true)}
                        className="h-6 w-6 inline-flex items-center justify-center rounded-md bg-white/90 text-gray-600 hover:text-gray-900 border border-gray-200 shadow-sm"
                        title="Ver en pantalla completa"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {previewIsPdf && !pdfPreviewFailed ? (
                      pdfPreviewThumb ? (
                        <img
                          src={pdfPreviewThumb}
                          alt="Preview PDF"
                          className="absolute inset-0 w-full h-full object-contain"
                          style={{ transform: `rotate(${previewRotation}deg)`, transformOrigin: 'center center' }}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gray-50" />
                      )
                    ) : previewUrl && !previewIsPdf ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="absolute inset-0 w-full h-full object-contain"
                        style={{ transform: `rotate(${previewRotation}deg)`, transformOrigin: 'center center' }}
                      />
                    ) : null}
                    {previewItemsVisible.map((field) => {
                      const scaleX = miniPreviewWidth / virtualWidth;
                      const scaleY = miniPreviewHeight / resolvedVirtualHeight;
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
                  <div className="text-[11px] text-gray-500 pt-1">
                    {personalizeBySigner && activeSignerEmail
                      ? `Vista de ${activeSignerEmail}`
                      : 'Vista de todos los firmantes'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
          {validationErrors.length > 0 && (
            <div className="mr-auto text-xs text-red-600 space-y-1">
              {validationErrors.map((message) => (
                <div key={message}>{message}</div>
              ))}
            </div>
          )}
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
              const errors = evaluateWizardValidation();
              setValidationErrors(errors);
              if (errors.length > 0) return;
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
          <div className="relative w-[92vw] h-[90vh] rounded-xl bg-white flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 flex-shrink-0">
              <p className="text-xs text-gray-400 select-none">
                Arrastrá el marco punteado para mover el grupo · arrastrá el campo individual para reposicionarlo
              </p>
              <div className="flex items-center gap-1">
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
            </div>

            {/* Scrollable document area */}
            <div
              ref={fullscreenScrollRef}
              className="flex-1 overflow-auto bg-gray-100 rounded-b-xl"
              onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedFieldId(null); }}
            >
              {/* Canvas: natural document size */}
              <div
                className="relative mx-auto"
                style={{
                  width: virtualWidth * FULL_SCALE,
                  minHeight: (totalPages ?? 1) * resolvedVirtualHeight * FULL_SCALE,
                  transform: previewRotation ? `rotate(${previewRotation}deg)` : undefined,
                  transformOrigin: 'top center'
                }}
                onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedFieldId(null); }}
              >
                {/* PDF / image layer */}
                {previewIsPdf && (pdfPreviewSrc || previewPdfData) && !pdfPreviewFailed ? (
                  <div className="absolute inset-0 pointer-events-none">
                    <PdfEditViewer
                      key={`full-${pdfPreviewSrc}-${previewPdfData?.byteLength}`}
                      src={pdfPreviewSrc}
                      pdfData={previewPdfData}
                      locked
                      virtualWidth={virtualWidth}
                      scale={FULL_SCALE}
                      pageGap={0}
                      className="bg-transparent"
                      onError={() => setPdfPreviewFailed(true)}
                    />
                  </div>
                ) : previewUrl && !previewIsPdf ? (
                  <img
                    src={previewUrl}
                    alt="Preview fullscreen"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  />
                ) : null}

                {/* Batch group frames — dashed crosshatch border, draggable */}
                {Array.from(batchBoundingBoxes.entries()).map(([batchKey, box]) => {
                  const pad = 8;
                  const leadField = previewItemsVisible.find((f) => (f.batchId || f.id) === batchKey);
                  return (
                    <div
                      key={`batch-frame-${batchKey}`}
                      className="absolute cursor-move"
                      style={{
                        left: (box.x - pad) * FULL_SCALE,
                        top: box.y * FULL_SCALE - pad,
                        width: (box.w + pad * 2) * FULL_SCALE,
                        height: box.h * FULL_SCALE + pad * 2,
                        border: '2px dashed rgba(59,130,246,0.45)',
                        borderRadius: 6,
                        backgroundImage:
                          'repeating-linear-gradient(45deg,rgba(59,130,246,0.04) 0px,rgba(59,130,246,0.04) 1px,transparent 1px,transparent 7px)',
                        zIndex: 10
                      }}
                      title="Mover todos los campos de este firmante"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!leadField) return;
                        setSelectedFieldId(leadField.id);
                        setDragState({
                          id: leadField.id,
                          batchId: batchKey,
                          moveBatch: true,
                          startX: e.clientX,
                          startY: e.clientY,
                          originX: leadField.x,
                          originY: leadField.y
                        });
                      }}
                    />
                  );
                })}

                {/* Individual field overlays */}
                {previewItemsVisible.map((field) => {
                  const pageOffsetY = (field.page - 1) * resolvedVirtualHeight * FULL_SCALE;
                  const isSelected = selectedFieldId === field.id;
                  return (
                    <div
                      key={`full-${field.id}`}
                      className={`absolute select-none group ${
                        isSelected
                          ? 'border-2 border-blue-600'
                          : 'border border-blue-400/70 hover:border-blue-500'
                      }`}
                      style={{
                        left: field.x * FULL_SCALE,
                        top: pageOffsetY + field.y * FULL_SCALE,
                        width: field.width * FULL_SCALE,
                        height: field.height * FULL_SCALE,
                        backgroundColor: isSelected ? 'rgba(219,234,254,0.5)' : 'rgba(219,234,254,0.3)',
                        borderRadius: 3,
                        zIndex: 20
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedFieldId(field.id);
                      }}
                    >
                      {/* Label */}
                      <span className="absolute top-0.5 left-1.5 text-[9px] font-medium text-blue-700 pointer-events-none leading-tight select-none">
                        {field.metadata?.label || 'Campo'}
                      </span>

                      {/* Individual drag handle — center of field */}
                      <div
                        className={`absolute inset-0 flex items-center justify-center cursor-move transition-opacity ${
                          isSelected ? 'opacity-50' : 'opacity-0 group-hover:opacity-40'
                        }`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedFieldId(field.id);
                          setDragState({
                            id: field.id,
                            batchId: field.batchId,
                            moveBatch: false,
                            startX: e.clientX,
                            startY: e.clientY,
                            originX: field.x,
                            originY: field.y
                          });
                        }}
                      >
                        <Move className="w-4 h-4 text-blue-500 pointer-events-none" />
                      </div>

                      {/* Resize handle — inside bottom-right corner */}
                      <div
                        className={`absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-center justify-center transition-opacity ${
                          isSelected ? 'opacity-80' : 'opacity-0 group-hover:opacity-60'
                        }`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedFieldId(field.id);
                          setResizeState({
                            id: field.id,
                            startX: e.clientX,
                            startY: e.clientY,
                            originW: field.width,
                            originH: field.height
                          });
                        }}
                      >
                        <svg viewBox="0 0 10 10" className="w-3 h-3 text-blue-500 pointer-events-none">
                          <path d="M9 1L1 9M5 9L9 9L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
