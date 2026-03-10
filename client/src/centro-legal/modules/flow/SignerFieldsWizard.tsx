import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronRight, Maximize2, Minimize2, Info, Move } from 'lucide-react';
import type { SignatureField } from '../../../types/signature-fields';
import { generateWorkflowFieldsFromWizard, type RepetitionRule, type WizardTemplate } from '../../../lib/workflowFieldTemplate';
import { PdfEditViewer } from '../../../components/pdf/PdfEditViewer';
import VirtualTextCanvas from '../../../components/virtual-canvas/VirtualTextCanvas';
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
  previewText?: string | null;
  previewPdfData?: ArrayBuffer | null;
  previewIsPdf?: boolean;
  previewPage?: number | null;
  initialPreviewRotation?: number;
  isWorkflowMode?: boolean;
  isSelfSignatureMode?: boolean;
  signingMode?: 'sequential' | 'parallel';
  onSigningModeChange?: (mode: 'sequential' | 'parallel') => void;
  finalDocumentVisibility?: 'owner_only' | 'participants';
  onFinalDocumentVisibilityChange?: (value: 'owner_only' | 'participants') => void;
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

function SignerFieldsWizardComponent({
  isOpen,
  onClose,
  signers,
  virtualWidth,
  detectedVirtualHeight,
  totalPages,
  detectedPageLabel,
  previewUrl,
  previewText = null,
  previewPdfData = null,
  previewIsPdf = false,
  previewPage,
  initialPreviewRotation = 0,
  isWorkflowMode = false,
  isSelfSignatureMode = false,
  signingMode,
  onSigningModeChange,
  finalDocumentVisibility,
  onFinalDocumentVisibilityChange,
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
  const normalizeRotation = (rotation: number) => ((rotation % 360) + 360) % 360;
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [pdfPreviewFailed, setPdfPreviewFailed] = useState(false);
  const [wizardFields, setWizardFields] = useState<SignatureField[]>([]);
  const [dragState, setDragState] = useState<{
    id: string;
    batchId?: string;
    moveBatch: boolean;
    anchorContentX: number;
    anchorContentY: number;
    originX: number;
    originAbsoluteY: number;
    batchOrigins?: Record<string, { x: number; absoluteY: number; width: number; height: number }>;
  } | null>(null);
  const [resizeState, setResizeState] = useState<{
    id: string;
    anchorContentX: number;
    anchorContentY: number;
    originW: number;
    originH: number;
  } | null>(null);
  const [openSections, setOpenSections] = useState<Record<'signatures' | 'size' | 'preview', boolean>>({
    signatures: false,
    size: false,
    preview: false
  });
  const [personalizeBySigner, setPersonalizeBySigner] = useState(false);

  // Colapsar todas las secciones al cerrar el modal
  useEffect(() => {
    if (!isOpen) {
      setOpenSections({
        signatures: false,
        size: false,
        preview: false
      });
    }
  }, [isOpen]);
  const fullscreenScrollRef = useRef<HTMLDivElement | null>(null);
  const fullscreenViewportRef = useRef<HTMLDivElement | null>(null);
  const fullscreenContentRef = useRef<HTMLDivElement | null>(null);
  const dragPointerRef = useRef<{ x: number; y: number } | null>(null);
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null);
  const autoScrollRafRef = useRef<number | null>(null);
  const pointerMoveRafRef = useRef<number | null>(null);
  const FULL_SCALE_MAX = 0.82;
  const [fullscreenScale, setFullscreenScale] = useState(FULL_SCALE_MAX);
  const AUTO_SCROLL_EDGE_PX = 56;
  const AUTO_SCROLL_MAX_STEP_PX = 18;
  const [openSignatureBlock, setOpenSignatureBlock] = useState<'final' | 'perPage' | null>('final');
  const effectiveSigningMode = signingMode ?? 'sequential';
  const effectiveFinalVisibility = finalDocumentVisibility ?? 'owner_only';
  const showSigningModeControl = Boolean(isWorkflowMode && onSigningModeChange && signers.length > 1);
  const showFinalVisibilityControl = Boolean(isWorkflowMode && onFinalDocumentVisibilityChange && !isSelfSignatureMode);
  const showFinalFlowControls = showSigningModeControl || showFinalVisibilityControl;
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const previewRotation = normalizeRotation(initialPreviewRotation);

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
  const pagesCount = Math.max(1, totalPages ?? 1);
  const resolvedVirtualHeight =
    pageSizeMode === 'document'
      ? detectedVirtualHeight
      : Math.round(virtualWidth * PAGE_RATIOS[pageSizeMode]);
  const normalizedPreviewRotation = normalizeRotation(previewRotation);
  const isQuarterTurn = normalizedPreviewRotation === 90 || normalizedPreviewRotation === 270;
  const layoutVirtualWidth = isQuarterTurn ? resolvedVirtualHeight : virtualWidth;
  const layoutVirtualHeight = isQuarterTurn ? virtualWidth : resolvedVirtualHeight;
  const fullDocBaseWidth = virtualWidth;
  const fullDocBaseHeight = Math.max(1, pagesCount * resolvedVirtualHeight);
  const rotatedDocWidth = isQuarterTurn ? fullDocBaseHeight : fullDocBaseWidth;
  const rotatedDocHeight = isQuarterTurn ? fullDocBaseWidth : fullDocBaseHeight;
  const viewportFitBaseWidth = isQuarterTurn ? resolvedVirtualHeight : virtualWidth;
  const viewportFitBaseHeight = isQuarterTurn ? virtualWidth : resolvedVirtualHeight;

  const mapFieldFromLayoutToBase = (field: SignatureField): SignatureField => {
    if (normalizedPreviewRotation === 0) return field;

    const baseWidth = virtualWidth;
    const baseHeight = resolvedVirtualHeight;
    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

    if (normalizedPreviewRotation === 180) {
      const nextWidth = field.width;
      const nextHeight = field.height;
      const mappedX = baseWidth - field.x - nextWidth;
      const mappedY = baseHeight - field.y - nextHeight;
      return {
        ...field,
        x: clamp(mappedX, 0, Math.max(0, baseWidth - nextWidth)),
        y: clamp(mappedY, 0, Math.max(0, baseHeight - nextHeight)),
      };
    }

    if (normalizedPreviewRotation === 90) {
      const nextWidth = field.height;
      const nextHeight = field.width;
      const mappedX = field.y;
      const mappedY = baseHeight - field.x - field.width;
      return {
        ...field,
        x: clamp(mappedX, 0, Math.max(0, baseWidth - nextWidth)),
        y: clamp(mappedY, 0, Math.max(0, baseHeight - nextHeight)),
        width: nextWidth,
        height: nextHeight,
      };
    }

    // 270
    const nextWidth = field.height;
    const nextHeight = field.width;
    const mappedX = baseWidth - field.y - field.height;
    const mappedY = field.x;
    return {
      ...field,
      x: clamp(mappedX, 0, Math.max(0, baseWidth - nextWidth)),
      y: clamp(mappedY, 0, Math.max(0, baseHeight - nextHeight)),
      width: nextWidth,
      height: nextHeight,
    };
  };

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
    const upperBandStart = Math.max(24, Math.round(layoutVirtualHeight * 0.18));
    const upperBandEnd = Math.max(upperBandStart + 110, Math.round(layoutVirtualHeight * 0.50));
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
          ? Math.max(marginX, layoutVirtualWidth - marginX - signatureSize.w)
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
        virtualWidth: layoutVirtualWidth,
        virtualHeight: layoutVirtualHeight,
        totalPages,
        targetPage
      }),
    [validSigners, template, layoutVirtualWidth, layoutVirtualHeight, totalPages, targetPage]
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
      layoutVirtualWidth,
      layoutVirtualHeight
    ]
  );

  const autoFields = useMemo(
    () => [...previewBaseFields, ...previewPerPageFields].map(mapFieldFromLayoutToBase),
    [previewBaseFields, previewPerPageFields, normalizedPreviewRotation, virtualWidth, resolvedVirtualHeight]
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
  const textPreviewSrc = !previewIsPdf && previewText ? previewText : null;
  const miniPreviewWidth = 180;
  const miniPreviewHeight = Math.max(150, Math.round((miniPreviewWidth * resolvedVirtualHeight) / virtualWidth));
  const miniPreviewScale = miniPreviewWidth / Math.max(1, virtualWidth);
  const fieldLabelCounterRotationStyle =
    normalizedPreviewRotation === 0
      ? undefined
      : {
          transform: `rotate(${-normalizedPreviewRotation}deg)`,
          transformOrigin: 'center center',
          maxWidth: '100%',
          maxHeight: '100%',
        };

  const getFullscreenPointerInContent = useCallback(
    (clientX: number, clientY: number) => {
      const content = fullscreenContentRef.current;
      if (!content) return null;

      const rect = content.getBoundingClientRect();
      const scaledWidth = fullDocBaseWidth * fullscreenScale;
      const scaledHeight = Math.max(1, fullDocBaseHeight * fullscreenScale);

      if (normalizedPreviewRotation === 0) {
        const x = (clientX - rect.left) / fullscreenScale;
        const y = (clientY - rect.top) / fullscreenScale;
        return {
          x: Math.max(0, Math.min(fullDocBaseWidth, x)),
          y: Math.max(0, Math.min(fullDocBaseHeight, y))
        };
      }

      const centerClientX = rect.left + rect.width / 2;
      const centerClientY = rect.top + rect.height / 2;
      const dx = clientX - centerClientX;
      const dy = clientY - centerClientY;
      const radians = (normalizedPreviewRotation * Math.PI) / 180;

      // Convert viewport pointer from rotated space back into base document coordinates.
      const cos = Math.cos(-radians);
      const sin = Math.sin(-radians);
      const unrotatedX = dx * cos - dy * sin;
      const unrotatedY = dx * sin + dy * cos;

      const baseX = (unrotatedX + scaledWidth / 2) / fullscreenScale;
      const baseY = (unrotatedY + scaledHeight / 2) / fullscreenScale;
      return {
        x: Math.max(0, Math.min(fullDocBaseWidth, baseX)),
        y: Math.max(0, Math.min(fullDocBaseHeight, baseY))
      };
    },
    [fullDocBaseHeight, fullDocBaseWidth, fullscreenScale, normalizedPreviewRotation]
  );

  useEffect(() => {
    // Reset when source changes / wizard reopens.
    setPdfPreviewFailed(false);
  }, [pdfPreviewSrc, previewPdfData, previewIsPdf, isOpen]);

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
    if (normalizedPreviewRotation !== 0) {
      fullscreenScrollRef.current.scrollTop = 0;
      return;
    }
    const lowestAbsY = previewItemsVisible.reduce((max, f) => {
      return Math.max(max, (f.page - 1) * resolvedVirtualHeight + f.y + f.height);
    }, 0);
    const containerH = fullscreenScrollRef.current.clientHeight;
    const targetScroll = lowestAbsY * fullscreenScale - containerH * 0.7;
    fullscreenScrollRef.current.scrollTop = Math.max(0, targetScroll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewFullscreen, fullscreenScale, normalizedPreviewRotation, previewItemsVisible, resolvedVirtualHeight]);

  // Fit-to-viewport en fullscreen para evitar zoom excesivo al forzar A4/Oficio.
  useEffect(() => {
    if (!previewFullscreen) {
      setFullscreenScale(FULL_SCALE_MAX);
      return;
    }

    const recalc = () => {
      const container = fullscreenScrollRef.current;
      if (!container) return;
      const fitScaleWidth = (container.clientWidth - 24) / Math.max(1, viewportFitBaseWidth);
      const fitScaleHeight = (container.clientHeight - 24) / Math.max(1, viewportFitBaseHeight);
      const fitScale = Math.min(fitScaleWidth, fitScaleHeight);
      setFullscreenScale(Math.max(0.28, Math.min(FULL_SCALE_MAX, fitScale)));
    };

    recalc();
    const container = fullscreenScrollRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => recalc());
    observer.observe(container);
    window.addEventListener('resize', recalc);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recalc);
    };
  }, [previewFullscreen, viewportFitBaseHeight, viewportFitBaseWidth]);

  // Al rotar en fullscreen, reposicionar al origen para evitar "pantalla vacía"
  // cuando la rotación previa dejó scroll en una zona sin contenido visible.
  useEffect(() => {
    if (!previewFullscreen) return;
    const container = fullscreenScrollRef.current;
    if (!container) return;
    container.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [previewRotation, previewFullscreen, pageSizeMode]);

  useEffect(() => {
    if (!previewFullscreen) return;

    const maxXBase = virtualWidth;
    const totalDocHeight = pagesCount * resolvedVirtualHeight;

    const stopAutoScrollLoop = () => {
      if (autoScrollRafRef.current !== null) {
        cancelAnimationFrame(autoScrollRafRef.current);
        autoScrollRafRef.current = null;
      }
    };
    const stopMoveLoop = () => {
      if (pointerMoveRafRef.current !== null) {
        cancelAnimationFrame(pointerMoveRafRef.current);
        pointerMoveRafRef.current = null;
      }
    };

    const fromAbsoluteY = (absoluteY: number, fieldHeight: number) => {
      const maxAbsY = Math.max(0, totalDocHeight - fieldHeight);
      const clampedAbsY = Math.max(0, Math.min(maxAbsY, absoluteY));
      const page = Math.min(pagesCount, Math.floor(clampedAbsY / resolvedVirtualHeight) + 1);
      const pageTop = (page - 1) * resolvedVirtualHeight;
      const y = clampedAbsY - pageTop;
      return { page, y };
    };

    const applyPointerMovement = (clientX: number, clientY: number) => {
      const pointer = getFullscreenPointerInContent(clientX, clientY);
      if (!pointer) return;

      if (dragState) {
        const dx = pointer.x - dragState.anchorContentX;
        const dy = pointer.y - dragState.anchorContentY;

        if (dragState.moveBatch && dragState.batchId && dragState.batchOrigins) {
          let clampedDx = dx;
          let clampedDy = dy;
          for (const origin of Object.values(dragState.batchOrigins)) {
            clampedDx = Math.max(-origin.x, Math.min(clampedDx, maxXBase - origin.width - origin.x));
            clampedDy = Math.max(-origin.absoluteY, Math.min(clampedDy, totalDocHeight - origin.height - origin.absoluteY));
          }

          setWizardFields((prev) =>
            prev.map((field) => {
              if (field.batchId !== dragState.batchId) return field;
              const origin = dragState.batchOrigins?.[field.id];
              if (!origin) return field;
              const nextX = Math.max(0, Math.min(maxXBase - field.width, origin.x + clampedDx));
              const { page, y } = fromAbsoluteY(origin.absoluteY + clampedDy, field.height);
              return { ...field, x: nextX, y, page };
            })
          );
        } else {
          setWizardFields((prev) =>
            prev.map((field) => {
              if (field.id !== dragState.id) return field;
              const nextX = Math.max(0, Math.min(maxXBase - field.width, dragState.originX + dx));
              const { page, y } = fromAbsoluteY(dragState.originAbsoluteY + dy, field.height);
              return { ...field, x: nextX, y, page };
            })
          );
        }
      }

      if (resizeState) {
        const dx = pointer.x - resizeState.anchorContentX;
        const dy = pointer.y - resizeState.anchorContentY;
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

    const autoScrollStep = () => {
      autoScrollRafRef.current = null;
      const container = fullscreenScrollRef.current;
      const pointer = dragPointerRef.current;
      if (!container || !pointer || (!dragState && !resizeState)) return;

      const rect = container.getBoundingClientRect();
      const topZone = rect.top + AUTO_SCROLL_EDGE_PX;
      const bottomZone = rect.bottom - AUTO_SCROLL_EDGE_PX;
      let deltaY = 0;

      if (pointer.y < topZone) {
        const ratio = Math.min(1, (topZone - pointer.y) / AUTO_SCROLL_EDGE_PX);
        deltaY = -Math.max(1, Math.round(AUTO_SCROLL_MAX_STEP_PX * ratio));
      } else if (pointer.y > bottomZone) {
        const ratio = Math.min(1, (pointer.y - bottomZone) / AUTO_SCROLL_EDGE_PX);
        deltaY = Math.max(1, Math.round(AUTO_SCROLL_MAX_STEP_PX * ratio));
      }

      if (deltaY !== 0) {
        const prevScrollTop = container.scrollTop;
        const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
        container.scrollTop = Math.max(0, Math.min(maxScrollTop, prevScrollTop + deltaY));
        if (container.scrollTop !== prevScrollTop) {
          applyPointerMovement(pointer.x, pointer.y);
          autoScrollRafRef.current = requestAnimationFrame(autoScrollStep);
          return;
        }
      }

      stopAutoScrollLoop();
    };

    const onMove = (event: MouseEvent) => {
      const nextPointer = { x: event.clientX, y: event.clientY };
      dragPointerRef.current = nextPointer;
      pendingPointerRef.current = nextPointer;
      if (pointerMoveRafRef.current === null) {
        pointerMoveRafRef.current = requestAnimationFrame(() => {
          pointerMoveRafRef.current = null;
          const pointer = pendingPointerRef.current;
          if (!pointer) return;
          applyPointerMovement(pointer.x, pointer.y);
        });
      }
      if (autoScrollRafRef.current === null) {
        autoScrollRafRef.current = requestAnimationFrame(autoScrollStep);
      }
    };

    const onUp = () => {
      setDragState(null);
      setResizeState(null);
      dragPointerRef.current = null;
      pendingPointerRef.current = null;
      stopMoveLoop();
      stopAutoScrollLoop();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      pendingPointerRef.current = null;
      stopMoveLoop();
      stopAutoScrollLoop();
    };
  }, [previewFullscreen, dragState, resizeState, pagesCount, virtualWidth, resolvedVirtualHeight, fullscreenScale, normalizedPreviewRotation, getFullscreenPointerInContent]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-[480px] rounded-2xl bg-white shadow-xl flex flex-col max-h-[86vh]">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 flex-shrink-0">
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

        <div className="px-4 py-3 space-y-2 flex-1 overflow-y-auto">
          {/* Sección 1: Firmas del documento */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('signatures')}
              className="w-full flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200"
            >
              <div className="text-left">
                <p className="text-xs font-semibold text-gray-700">1. Configuración de campos</p>
                <p className="text-[11px] text-gray-500">Firma final y firma en cada página</p>
              </div>
              <div className="flex items-center gap-2">
                {validSigners.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPersonalizeBySigner((prev) => !prev);
                    }}
                    className="h-5 px-1.5 rounded border border-gray-200 bg-gray-50 text-[10px] text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0"
                  >
                    {personalizeBySigner ? 'Todos' : 'Personalizar'}
                  </button>
                )}
                {openSections.signatures ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
              </div>
            </button>
            {openSections.signatures && (
              <div className="p-2 space-y-2">
                <p className="text-[11px] text-gray-500 px-1">¿Dónde querés que aparezca la firma? Podés activar una o las dos.</p>
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
                      className="w-full px-3 py-2 flex items-center gap-2 border-b border-gray-200 text-left"
                    >
                      <label className="flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={includeFinalSignature}
                          onChange={(e) => setIncludeFinalSignature(e.target.checked)}
                          className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                      </label>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-semibold text-gray-800">Firma al final del documento</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Una sola vez, al pie del documento.</p>
                        {openSignatureBlock !== 'final' && includeFinalSignature && (
                          <p className="text-[10px] text-blue-600 mt-0.5">
                            {['Firma', includeName && 'Nombre', includeDate && 'Fecha', includeId && 'Identidad', ...customFields.map((f) => f.label)].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      {openSignatureBlock === 'final' ? <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />}
                    </button>
                    {openSignatureBlock === 'final' && (
                      <div className={`p-2 ${includeFinalSignature ? '' : 'opacity-50 pointer-events-none'}`}>
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
                      className="w-full px-3 py-2 flex items-center gap-2 border-b border-gray-200 text-left"
                    >
                      <label className="flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={includePerPageSignature}
                          onChange={(e) => setIncludePerPageSignature(e.target.checked)}
                          className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                      </label>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-semibold text-gray-800 inline-flex items-center gap-1">
                          Firma en cada página
                          <span className="text-gray-400 hover:text-gray-600" title="Las firmas por página se ubican inicialmente en zona media-superior.">
                            <Info className="w-3 h-3" />
                          </span>
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Se repite en cada hoja, en el margen que elijas.</p>
                        {openSignatureBlock !== 'perPage' && includePerPageSignature && (
                          <p className="text-[10px] text-blue-600 mt-0.5">
                            {['Firma', includePerPageName && 'Nombre', includePerPageDate && 'Fecha', isRightSelected && isLeftSelected ? 'Ambos márgenes' : isRightSelected ? 'Margen der.' : isLeftSelected ? 'Margen izq.' : null].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      {openSignatureBlock === 'perPage' ? <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />}
                    </button>
                    {openSignatureBlock === 'perPage' && (
                      <div className={`p-2 ${includePerPageSignature ? '' : 'opacity-50 pointer-events-none'}`}>
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

          {/* Sección 2: Previsualización */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('preview')}
              className="w-full flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200"
            >
              <div className="text-left">
                <p className="text-xs font-semibold text-gray-700">2. Previsualización</p>
                <p className="text-[11px] text-gray-500">Vista del documento y tamaño de página</p>
              </div>
              {openSections.preview ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
            </button>
            {openSections.preview && (
              <div className="p-3 space-y-3">
                <div className="flex items-start gap-3">
                  <div
                    data-testid="wizard-mini-preview"
                    className="relative border border-gray-200 rounded-md bg-gray-50 overflow-hidden"
                    style={{ width: miniPreviewWidth, height: miniPreviewHeight }}
                  >
                    <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewFullscreen(true)}
                        className="h-6 w-6 inline-flex items-center justify-center rounded-md bg-white/90 text-gray-600 hover:text-gray-900 border border-gray-200 shadow-sm"
                        title="Ver en pantalla completa"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {previewIsPdf && (pdfPreviewSrc || previewPdfData) && !pdfPreviewFailed ? (
                      <div
                        className="absolute inset-0"
                        style={{ transform: `rotate(${previewRotation}deg)`, transformOrigin: 'center center' }}
                      >
                        <PdfEditViewer
                          src={pdfPreviewSrc}
                          pdfData={previewPdfData}
                          locked={false}
                          virtualWidth={virtualWidth}
                          scale={miniPreviewScale}
                          fitToContainer={false}
                          forceVerticalScrollbar
                          pageGap={8}
                          className="h-full bg-transparent"
                          onError={(error) => {
                            console.warn('[SignerFieldsWizard] Mini paged preview error', error);
                            setPdfPreviewFailed(true);
                          }}
                          renderPageOverlay={(pageNumber, metrics) => (
                            <div className="absolute inset-0 pointer-events-none">
                              {previewItemsVisible
                                .filter((field) => field.page === pageNumber)
                                .map((field) => {
                                  const scaleX = metrics.width / virtualWidth;
                                  const scaleY = metrics.height / resolvedVirtualHeight;
                                  return (
                                    <div
                                      key={`mini-field-${field.id}`}
                                      className="absolute border border-blue-400/80 bg-blue-100/40 text-[8px] text-blue-900 overflow-hidden"
                                      style={{
                                        left: field.x * scaleX,
                                        top: field.y * scaleY,
                                        width: field.width * scaleX,
                                        height: field.height * scaleY
                                      }}
                                    >
                                      <span
                                        className="absolute inset-0 flex items-center justify-center text-center leading-tight px-0.5"
                                        style={fieldLabelCounterRotationStyle}
                                      >
                                        {field.metadata?.label || 'Campo'}
                                      </span>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        />
                      </div>
                    ) : (!previewIsPdf && (previewUrl || textPreviewSrc)) ? (
                      <div
                        className="absolute inset-0"
                        style={{ transform: `rotate(${previewRotation}deg)`, transformOrigin: 'center center' }}
                      >
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="absolute inset-0 w-full h-full object-contain"
                          />
                        ) : (
                          <VirtualTextCanvas
                            text={textPreviewSrc ?? ''}
                            className="h-full bg-white"
                            textClassName="text-[10px] leading-4 text-gray-700"
                            observeResize={false}
                            forceVerticalScrollbar
                          />
                        )}
                        {previewItemsVisible
                          .filter((field) => field.page === 1)
                          .map((field) => {
                            const scaleX = miniPreviewWidth / virtualWidth;
                            const scaleY = miniPreviewHeight / resolvedVirtualHeight;
                            return (
                              <div
                                key={field.id}
                                className="absolute border border-blue-400/80 bg-blue-100/40 text-[8px] text-blue-900 overflow-hidden"
                                style={{
                                  left: field.x * scaleX,
                                  top: field.y * scaleY,
                                  width: field.width * scaleX,
                                  height: field.height * scaleY
                                }}
                              >
                                <span
                                  className="absolute inset-0 flex items-center justify-center text-center leading-tight px-0.5"
                                  style={fieldLabelCounterRotationStyle}
                                >
                                  {field.metadata?.label || 'Campo'}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex-1 text-[11px] text-gray-500 pt-0.5 space-y-1.5">
                    <p>{personalizeBySigner && activeSignerEmail
                      ? `Vista de ${activeSignerEmail}`
                      : 'Vista de todos los firmantes'}</p>
                    <p className="text-[10px] text-gray-400">Para mover o redimensionar, usá pantalla completa.</p>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-2">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Tamaño de página</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <label className="flex items-center gap-1.5 text-[11px] text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={pageSizeMode === 'document'} onChange={() => setPageSizeMode('document')} className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer" />
                      <span>Auto ({detectedPageLabel})</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={pageSizeMode === 'a4'} onChange={() => setPageSizeMode('a4')} className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer" />
                      <span>A4</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={pageSizeMode === 'oficio'} onChange={() => setPageSizeMode('oficio')} className="eco-checkbox rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer" />
                      <span>Oficio</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {showFinalFlowControls && (
          <div className="mx-4 mb-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div className="text-sm font-semibold text-gray-900 mb-3">Configuración final del flujo</div>
            <div className="space-y-3">
              {showSigningModeControl && (
                <div>
                  <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">Orden de firma</div>
                  <label className="flex items-center gap-2 text-sm text-gray-800 mb-2">
                    <input
                      type="radio"
                      name="signing-mode"
                      checked={effectiveSigningMode === 'sequential'}
                      onChange={() => onSigningModeChange?.('sequential')}
                      className="eco-checkbox rounded-full border-gray-300"
                    />
                    Secuencial (cada firmante espera su turno)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-800">
                    <input
                      type="radio"
                      name="signing-mode"
                      checked={effectiveSigningMode === 'parallel'}
                      onChange={() => onSigningModeChange?.('parallel')}
                      className="eco-checkbox rounded-full border-gray-300"
                    />
                    Paralelo (todos pueden firmar desde el inicio)
                  </label>
                </div>
              )}
              {showFinalVisibilityControl && (
                <label className="flex items-start gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={effectiveFinalVisibility === 'participants'}
                    onChange={(e) =>
                      onFinalDocumentVisibilityChange?.(e.target.checked ? 'participants' : 'owner_only')
                    }
                    className="eco-checkbox rounded border-gray-300 mt-0.5"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Permitir descarga final a firmantes</div>
                    <div className="text-xs text-gray-600">
                      Al cerrar el flujo, cada firmante podrá descargar el PDF final y el ECO desde el verificador público.
                    </div>
                  </div>
                </label>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3 flex-shrink-0">
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
              data-testid="wizard-fullscreen-scroll"
              className="flex-1 overflow-auto bg-gray-100 rounded-b-xl"
              onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedFieldId(null); }}
            >
              {/* Canvas: natural document size */}
              <div
                ref={fullscreenViewportRef}
                data-testid="wizard-fullscreen-viewport"
                className="relative mx-auto"
                style={{
                  width: rotatedDocWidth * fullscreenScale,
                  minHeight: rotatedDocHeight * fullscreenScale
                }}
                onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedFieldId(null); }}
              >
                <div
                  ref={fullscreenContentRef}
                  className="absolute left-1/2 top-1/2"
                  style={{
                    width: fullDocBaseWidth * fullscreenScale,
                    minHeight: fullDocBaseHeight * fullscreenScale,
                    transform: `translate(-50%, -50%)${previewRotation ? ` rotate(${previewRotation}deg)` : ''}`,
                    transformOrigin: 'center center',
                    willChange: 'transform'
                  }}
                  onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedFieldId(null); }}
                >
                  {/* PDF / image layer */}
                  {previewIsPdf && (pdfPreviewSrc || previewPdfData) && !pdfPreviewFailed ? (
                    <div className="absolute inset-0 pointer-events-none">
                      <PdfEditViewer
                        src={pdfPreviewSrc}
                        pdfData={previewPdfData}
                        locked
                        virtualWidth={virtualWidth}
                        scale={fullscreenScale}
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
                  ) : textPreviewSrc && !previewIsPdf ? (
                    <div className="absolute inset-0 pointer-events-none">
                      <VirtualTextCanvas
                        text={textPreviewSrc}
                        className="h-full bg-white"
                        textClassName="text-sm leading-6 text-gray-700"
                        observeResize={false}
                        forceVerticalScrollbar
                      />
                    </div>
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
                          left: (box.x - pad) * fullscreenScale,
                          top: box.y * fullscreenScale - pad,
                          width: (box.w + pad * 2) * fullscreenScale,
                          height: box.h * fullscreenScale + pad * 2,
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
                          const pointer = getFullscreenPointerInContent(e.clientX, e.clientY);
                          if (!pointer) return;
                          const batchOrigins = Object.fromEntries(
                            wizardFields
                              .filter((field) => field.batchId === batchKey)
                              .map((field) => [
                                field.id,
                                {
                                  x: field.x,
                                  absoluteY: (field.page - 1) * resolvedVirtualHeight + field.y,
                                  width: field.width,
                                  height: field.height
                                }
                              ])
                          );
                          setSelectedFieldId(leadField.id);
                          setDragState({
                            id: leadField.id,
                            batchId: batchKey,
                            moveBatch: true,
                            anchorContentX: pointer.x,
                            anchorContentY: pointer.y,
                            originX: leadField.x,
                            originAbsoluteY: (leadField.page - 1) * resolvedVirtualHeight + leadField.y,
                            batchOrigins
                          });
                        }}
                      />
                    );
                  })}

                  {/* Individual field overlays */}
                  {previewItemsVisible.map((field) => {
                    const pageOffsetY = (field.page - 1) * resolvedVirtualHeight * fullscreenScale;
                    const isSelected = selectedFieldId === field.id;
                    return (
                      <div
                        key={`full-${field.id}`}
                        className={`absolute select-none group overflow-hidden ${
                          isSelected
                            ? 'border-2 border-blue-600'
                            : 'border border-blue-400/70 hover:border-blue-500'
                        }`}
                        style={{
                          left: field.x * fullscreenScale,
                          top: pageOffsetY + field.y * fullscreenScale,
                          width: field.width * fullscreenScale,
                          height: field.height * fullscreenScale,
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
                        <span
                          className="absolute inset-0 flex items-center justify-center text-center px-1 text-[10px] font-medium text-blue-700 pointer-events-none leading-tight select-none overflow-hidden"
                          style={fieldLabelCounterRotationStyle}
                        >
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
                            const pointer = getFullscreenPointerInContent(e.clientX, e.clientY);
                            if (!pointer) return;
                            setSelectedFieldId(field.id);
                            setDragState({
                              id: field.id,
                              batchId: field.batchId,
                              moveBatch: false,
                              anchorContentX: pointer.x,
                              anchorContentY: pointer.y,
                              originX: field.x,
                              originAbsoluteY: (field.page - 1) * resolvedVirtualHeight + field.y
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
                            const pointer = getFullscreenPointerInContent(e.clientX, e.clientY);
                            if (!pointer) return;
                            setSelectedFieldId(field.id);
                            setResizeState({
                              id: field.id,
                              anchorContentX: pointer.x,
                              anchorContentY: pointer.y,
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
        </div>
      )}
    </div>
  );
}

export const SignerFieldsWizard = memo(SignerFieldsWizardComponent);
