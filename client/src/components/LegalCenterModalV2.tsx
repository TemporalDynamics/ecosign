import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ChangeEvent } from 'react';
import { X, ArrowLeft, ChevronDown, ChevronUp, CheckCircle2, FileCheck, FileText, HelpCircle, Highlighter, Loader2, Maximize2, Minimize2, Shield, Type, Upload, Users, RefreshCw, MoreVertical, FileUp, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ToastOptions as HotToastOptions } from 'react-hot-toast';
import '../styles/legalCenterAnimations.css';
import { certifyFile, downloadEcox } from '../lib/basicCertificationWeb';
import { persistSignedPdfToStorage, saveUserDocument } from '../utils/documentStorage';
import { startSignatureWorkflow } from '../lib/signatureWorkflowService';
import { useSignatureCanvas } from '../hooks/useSignatureCanvas';
import { applySignatureToPDF, blobToFile, addSignatureSheet, applyOverlaySpecToPdf, appendSignaturePage, type SignaturePageMode } from '../utils/pdfSignature';
import type { ForensicData } from '../utils/pdfSignature';
import { signWithSignNow } from '../lib/signNowService';
import { EventHelpers } from '../utils/eventLogger';
import { getSupabase } from '../lib/supabaseClient';
import { hashSource, hashSigned, hashWitness } from '../lib/canonicalHashing';
import {
  createSourceTruth,
  ensureWitnessCurrent,
  appendTransform,
  advanceLifecycle,
  ensureSigned,
  emitEcoVNext
} from '../lib/documentEntityService';
import { isGuestMode } from '../utils/guestMode';
import InhackeableTooltip from './InhackeableTooltip';
import { useLegalCenterGuide } from '../hooks/useLegalCenterGuide';
import LegalCenterWelcomeModal from './LegalCenterWelcomeModal';
import { trackEvent } from '../lib/analytics';
import { isPDFEncrypted } from '../lib/e2e/documentEncryption';
import { validatePDFStructure, checkPDFPermissions } from '../lib/pdfValidation';
import { validateTSAConnectivity } from '../lib/tsaValidation';
import { CertifyProgress } from './CertifyProgress';
import type { CertifyStage } from '../lib/errorRecovery';
import { determineIfWorkSaved, canRetryFromStage } from '../lib/errorRecovery';
import { translateError } from '../lib/errorTranslation';
import { CustodyConfirmationModal } from './CustodyConfirmationModal';
import { PdfEditViewer, type PdfPageMetrics } from './pdf/PdfEditViewer';
import { storeEncryptedCustody } from '../lib/custodyStorageService';
import type { CustodyMode } from '../lib/documentEntityService';
import { convertToOverlaySpec } from '../utils/overlaySpecConverter';
import { loadDraftFile, saveDraftOperation } from '../lib/draftOperationsService';
import { saveWorkflowFields, loadWorkflowFields } from '../lib/workflowFieldsService';
import { resolveBatchAssignments } from '../lib/batches';
import { storeSignFlowContext } from '../lib/signFlowContext';

// PASO 3: Módulos refactorizados
import { 
  ProtectionToggle,
  ProtectionInfoModal,
  ProtectionWarningModal
} from '../centro-legal/modules/protection';
import { MySignatureToggle } from '../centro-legal/modules/signature';
import { SignatureFlowToggle } from '../centro-legal/modules/flow';
import { SignerFieldsWizard } from '../centro-legal/modules/flow/SignerFieldsWizard';
import { NdaToggle, NdaPanel, NDA_COPY } from '../centro-legal/modules/nda';
import { reorderFieldsBySignerBatches } from '../lib/workflowFieldTemplate';

// PASO 3.3: Layout y scenes
import { LegalCenterShell } from './centro-legal/layout/LegalCenterShell';
import { resolveGridColumns } from './centro-legal/orchestration/resolveGridLayout';
import { SceneRenderer } from './centro-legal/layout/SceneRenderer';
import { resolveActiveScene } from './centro-legal/orchestration/resolveActiveScene';
import type { SignatureField } from '../types/signature-fields';

// FASE 2: Stage con canvas invariante (modelo de capas)
import { LegalCenterStage } from './centro-legal/stage';

// Feature flags
const USE_SCENE_RENDERER = true; // FASE 1: SceneRenderer
const USE_NEW_STAGE = true;      // FASE 2: Stage (canvas invariante - modelo de capas)

// NOTE: TSA evidence is appended server-side via jobs (run-tsa).
// The client must not call append-tsa-event.

type InitialAction = 'sign' | 'workflow' | 'nda' | 'certify';
type SignatureType = 'legal' | 'certified' | null;
type SignatureMode = 'none' | 'canvas' | 'signnow';
type SignatureTab = 'draw' | 'type' | 'upload';
type PreviewMode = 'compact' | 'expanded' | 'fullscreen';
type AnnotationKind = 'signature' | 'highlight' | 'text';
type ProtectionLevel = 'ACTIVE' | 'REINFORCED' | 'TOTAL' | string;

interface ForensicConfig {
  useLegalTimestamp: boolean;
  usePolygonAnchor: boolean;
  useBitcoinAnchor: boolean;
}

interface EmailInput {
  email: string;
  name: string;
  requireLogin: boolean;
  requireNda: boolean;
}

interface Signer {
  email: string;
  name?: string;
  signingOrder: number;
  requireLogin: boolean;
  requireNda: boolean;
  quickAccess: boolean;
}

interface Annotation {
  type: AnnotationKind;
  page?: number;
  text?: string;
  color?: string;
  position?: { x: number; y: number };
}

interface CertificateData {
  fileName: string;
  ecoxBuffer?: ArrayBuffer | Uint8Array | null;
  ecoDownloadUrl?: string;
  ecoFileName?: string;
  signedPdfUrl?: string;
  signedPdfName?: string;
  pdfStoragePath?: string | null;
  documentId?: string;
  downloadEnabled?: boolean;
  bitcoinPending?: boolean;
  protectionLevel?: ProtectionLevel;
  [key: string]: unknown;
}

type ToastKind = 'success' | 'error' | 'default' | 'info' | 'warning';
type ToastConfig = HotToastOptions & { type?: ToastKind };

interface LegalCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAction?: InitialAction | null;
}

/**
 * Centro Legal V2 - Reimplementación siguiendo LEGAL_CENTER_CONSTITUTION.md
 * 
 * FUENTE DE VERDAD: /LEGAL_CENTER_CONSTITUTION.md v2.0
 * 
 * Principio Rector:
 * "EcoSign acompaña, no dirige. Informa cuando hace falta, no interrumpe. Da seguridad, no ansiedad."
 * 
 * Axioma de Control:
 * "El usuario se siente en control, incluso cuando no interviene."
 * 
 * CAMBIOS VS LEGACY:
 * - Estados limpios según Constitución (añadido: documentLoaded)
 * - CTA dinámico: getCTAText() e isCTAEnabled() (funciones puras del estado)
 * - Toasts inmutables según Constitución
 * - Reglas de visibilidad: acciones solo si (documentLoaded || initialAction)
 * - Copy refinado ("Documento listo", tooltips actualizados)
 * 
 * LO QUE SE MANTIENE INTACTO:
 * - Grid layout 3 columnas con colapso suave
 * - Diseño visual completo (colores, spacing, tipografía)
 * - Preview de documento con altura fija por modo
 * - Modal de firma dentro del preview
 * - Panels NDA y Flujo
 * - Sistema de pasos (1: Elegir y Configurar, 2: Guardar/Descargar)
 * - Lógica de certificación completa (handleCertify)
 * - Contrato con backend (estados, tipos)
 */
const LegalCenterModalV2: React.FC<LegalCenterModalProps> = ({ isOpen, onClose, initialAction = null }) => {
  // Router navigation (soft navigation without page reload)
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estados del flujo
  const [step, setStep] = useState<number>(1); // 1: Elegir y Configurar, 2: Guardar/Descargar
  const [file, setFile] = useState<File | null>(null);
  const [documentLoaded, setDocumentLoaded] = useState(false); // CONSTITUCIÓN: Control de visibilidad de acciones
  const [loading, setLoading] = useState(false);
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);

  // FASE 3.A/3.B: Certify progress state (P0.5 - visible progress, P0.4/P0.7 - errors)
  const [certifyProgress, setCertifyProgress] = useState<{
    stage: CertifyStage | null;
    message: string;
    error?: string;
    workSaved?: boolean;
  }>({
    stage: null,
    message: '',
    error: undefined,
    workSaved: undefined
  });

  // Estados de paneles colapsables
  const [sharePanelOpen, setSharePanelOpen] = useState(false);
  const [showProtectionModal, setShowProtectionModal] = useState(false);
  const [showUnprotectedWarning, setShowUnprotectedWarning] = useState(false);

  // Duplicate name warning (early UX guard; not canonical)
  const [duplicateNamePrompt, setDuplicateNamePrompt] = useState<null | {
    entityId: string;
    fileName: string;
    createdAt: string;
    hasProtectionStarted: boolean;
  }>(null);

  // Sprint 4: Custody mode
  const [showCustodyModal, setShowCustodyModal] = useState(false);
  const [custodyModeChoice, setCustodyModeChoice] = useState<CustodyMode>('hash_only');

  // Configuración de protección legal (activo por defecto con TSA + Polygon + Bitcoin)
  const [forensicEnabled, setForensicEnabled] = useState(true);
  const [isValidatingTSA, setIsValidatingTSA] = useState(false); // P0.3: TSA connectivity check
  const [forensicConfig, setForensicConfig] = useState<ForensicConfig>({
    useLegalTimestamp: true,    // RFC 3161 TSA
    usePolygonAnchor: true,      // Polygon
    useBitcoinAnchor: true       // Bitcoin
  });

  // Acciones (pueden estar múltiples activas simultáneamente)
  const [mySignature, setMySignature] = useState<boolean>(initialAction === 'sign');
  const [workflowEnabled, setWorkflowEnabled] = useState<boolean>(initialAction === 'workflow');
  const [ndaEnabled, setNdaEnabled] = useState<boolean>(initialAction === 'nda');
  
  // Estado interno para saber si ya se dibujó/aplicó firma
  const [userHasSignature, setUserHasSignature] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  
  // Confirmación de modo (aparece temporalmente en el header)
  const [modeConfirmation, setModeConfirmation] = useState('');
  
  // NDA editable (panel izquierdo)
  const [ndaText, setNdaText] = useState<string>(NDA_COPY.EMPTY_MESSAGE);
  const [ndaDefined, setNdaDefined] = useState(false);
  const [ndaDirty, setNdaDirty] = useState(false);
  const [ndaSavedText, setNdaSavedText] = useState<string | null>(null);
  
  const [emailInputs, setEmailInputs] = useState<EmailInput[]>([
    { email: '', name: '', requireLogin: true, requireNda: true }
  ]); // 1 campo por defecto - usuarios agregan más según necesiten

  // Placeholder para campos de firma visual (SceneRenderer los consumirá)
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [isCanvasLocked, setIsCanvasLocked] = useState(true);
  const [workflowPageSizeMode, setWorkflowPageSizeMode] = useState<SignaturePageMode>('document');
  const [workflowVirtualSize, setWorkflowVirtualSize] = useState({ width: 1000, height: 1414 });

  // P1 UX: explicit confirmation step for signer assignment (UI-only)
  const [workflowAssignmentConfirmed, setWorkflowAssignmentConfirmed] = useState(false);
  const workflowAssignmentCtaRef = useRef<HTMLDivElement | null>(null);
  const workflowAssignmentSectionRef = useRef<HTMLDivElement | null>(null);
  const [expandedSignerIndex, setExpandedSignerIndex] = useState<number | null>(null);
  const [showSignerFieldsWizard, setShowSignerFieldsWizard] = useState(false);
  const [pdfPageMetrics, setPdfPageMetrics] = useState<PdfPageMetrics[]>([]);
  const [signaturePreview, setSignaturePreview] = useState<{ type: 'image' | 'text'; value: string } | null>(null);
  const [signaturePlacement, setSignaturePlacement] = useState({ x: 120, y: 180, width: 220, height: 80 });
  const [signaturePlacementPct, setSignaturePlacementPct] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isSignatureDragging, setIsSignatureDragging] = useState(false);
  const [pdfEditError, setPdfEditError] = useState(false);
  const [virtualScale, setVirtualScale] = useState(1);
  const [previewRotation, setPreviewRotation] = useState(0);

  const handlePdfMetrics = useCallback((metrics: PdfPageMetrics[]) => {
    setPdfPageMetrics(metrics);
    setPdfEditError(false);
  }, []);

  const handlePdfError = useCallback(() => {
    setPdfEditError(true);
  }, []);

  // Firma digital
  const [signatureType, setSignatureType] = useState<SignatureType>(null); // 'legal' | 'certified' | null
  const [showCertifiedModal, setShowCertifiedModal] = useState(false);
  const [certifiedSubType, setCertifiedSubType] = useState<'qes' | 'mifiel' | 'international' | null>(null); // 'qes' | 'mifiel' | 'international' | null

  // MIGRACIÓN: Opciones de descarga/guardado (del legacy)
  const [savePdfChecked, setSavePdfChecked] = useState(true); // Guardar en Supabase
  const [downloadPdfChecked, setDownloadPdfChecked] = useState(false); // Descargar localmente

  // Saldos de firma (mock data - en producción viene de la DB)
  const [ecosignUsed, setEcosignUsed] = useState(30); // Firmas usadas
  const [ecosignTotal, setEcosignTotal] = useState(50); // Total del plan
  const [signnowUsed, setSignnowUsed] = useState(5); // Firmas usadas
  const [signnowTotal, setSignnowTotal] = useState(15); // Total del plan
  const [isEnterprisePlan, setIsEnterprisePlan] = useState(false); // Plan enterprise tiene ilimitadas

  // Sistema de guía "Mentor Ciego"
  const guide = useLegalCenterGuide();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Control de toasts
  const [toastsEnabled, setToastsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('ecosign_toasts_enabled');
    return saved === null ? true : saved === 'true';
  });
  const [showToastConfirmModal, setShowToastConfirmModal] = useState(false);
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
  const [closeConfirmSelection, setCloseConfirmSelection] = useState<'discard' | 'save'>('save');
  const [isMobile, setIsMobile] = useState(false);
  const [ndaAccordionOpen, setNdaAccordionOpen] = useState(false);
  const [workflowAccordionOpen, setWorkflowAccordionOpen] = useState(false);
  const [ndaPanelOpen, setNdaPanelOpen] = useState(false);
  const [flowPanelOpen, setFlowPanelOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const workflowAutoCollapsed = useRef(false);

  // Ajustar configuración inicial según la acción con la que se abrió el modal
  useEffect(() => {
    if (!isOpen || !documentLoaded) {
      setModeConfirmation('');
      return;
    }
    setMySignature(initialAction === 'sign');
    setWorkflowEnabled(initialAction === 'workflow');
    setNdaEnabled(initialAction === 'nda');
    setPreviewMode('compact');

    // Mostrar modal de bienvenida (solo primera vez)
    if (guide.showWelcomeModal()) {
      setShowWelcomeModal(true);
    }
  }, [initialAction, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (isGuestMode()) return;
    const supabase = getSupabase();
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.warn('Failed to load owner email:', error);
        return;
      }
      setOwnerEmail(data?.user?.email ?? null);
    });
  }, [isOpen]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile || !isOpen) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isMobile, isOpen]);

  const assignmentFingerprint = useMemo(() => {
    const byBatch = new Map<string, { assignedTo: string; count: number; types: Record<string, number> }>();
    for (const f of signatureFields) {
      const bid = f.batchId || f.id;
      const assigned = (f.assignedTo ?? '').trim().toLowerCase();
      const current = byBatch.get(bid) || { assignedTo: assigned, count: 0, types: {} };
      current.assignedTo = assigned;
      current.count += 1;
      current.types[f.type] = (current.types[f.type] || 0) + 1;
      byBatch.set(bid, current);
    }

    return Array.from(byBatch.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bid, v]) => {
        const typeKey = Object.entries(v.types)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([t, n]) => `${t}:${n}`)
          .join(',');
        return `${bid}:${v.assignedTo}:${v.count}:${typeKey}`;
      })
      .join('|');
  }, [signatureFields]);

  const workflowAssignmentStatus = useMemo(() => {
    if (!workflowEnabled) {
      return {
        isComplete: false,
        groupsCount: 0,
        signersCount: 0
      };
    }

    // Silent (no toasts): this is used for UI gating/derived state.
    const normalizeEmailLocal = (email: string | null | undefined) => (email ?? '').trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    const commonTypos = ['gmial.com', 'gmai.com', 'yahooo.com', 'hotmial.com'];
    const isValidEmailLocal = (email: string) => {
      const trimmed = email.trim();
      if (!emailRegex.test(trimmed)) return false;
      const domain = trimmed.split('@')[1];
      if (commonTypos.includes(domain)) return false;
      return true;
    };

    const validSigners: { email: string }[] = [];
    const seen = new Set<string>();
    for (const input of emailInputs) {
      const trimmed = input.email.trim();
      if (!trimmed) continue;
      if (!isValidEmailLocal(trimmed)) continue;
      if (seen.has(trimmed)) continue;
      seen.add(trimmed);
      validSigners.push({ email: trimmed });
    }

    const { batches, unassignedBatches } = resolveBatchAssignments(signatureFields, validSigners);

    const signerEmailSet = new Set(validSigners.map((s) => normalizeEmailLocal(s.email)));
    const invalidAssignedCount = batches.filter((b) => {
      const assigned = normalizeEmailLocal(b.assignedSignerEmail);
      return Boolean(assigned) && !signerEmailSet.has(assigned);
    }).length;

    const assignedEmails = new Set(
      batches
        .map((b) => normalizeEmailLocal(b.assignedSignerEmail))
        .filter((email) => Boolean(email) && signerEmailSet.has(email))
    );
    const missingFor = validSigners
      .map((s) => s.email.trim().toLowerCase())
      .filter((email) => !assignedEmails.has(email));

    const groupsCount = batches.length;
    const signersCount = validSigners.length;
    const isComplete =
      invalidAssignedCount === 0 &&
      unassignedBatches.length === 0 &&
      missingFor.length === 0 &&
      groupsCount > 0 &&
      signersCount > 0;

    return { isComplete, groupsCount, signersCount };
  }, [workflowEnabled, emailInputs, signatureFields, assignmentFingerprint]);

  // Auto-confirmation: confirmation is derived from structure, not a manual click.
  useEffect(() => {
    if (!workflowEnabled) {
      setWorkflowAssignmentConfirmed(false);
      return;
    }
    setWorkflowAssignmentConfirmed(workflowAssignmentStatus.isComplete);
  }, [workflowEnabled, workflowAssignmentStatus.isComplete]);

  const ensurePreviewPdfData = async () => {
    if (!file || file.type !== 'application/pdf') return;
    if (documentPreviewPdfData) return;
    try {
      const buffer = await file.arrayBuffer();
      setDocumentPreviewPdfData(buffer);
      setPdfEditError(false);
    } catch (error) {
      console.warn('No se pudo preparar pdfData para wizard:', error);
    }
  };

  const openSignerFieldsWizard = async () => {
    setFlowPanelOpen(true);
    await ensurePreviewPdfData();
    setShowSignerFieldsWizard(true);
    setTimeout(() => {
      workflowAssignmentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const openMySignatureWizard = async () => {
    if (!ownerEmail) {
      showToast('Necesitás iniciar sesión para firmar tu documento.', { type: 'error' });
      return;
    }
    await ensurePreviewPdfData();
    setShowSignerFieldsWizard(true);
  };

  // Handlers para el modal de bienvenida
  const handleWelcomeAccept = () => {
    setShowWelcomeModal(false);
    // Solo cierra el modal, no marca nada permanente
    // La guía permanece habilitada
  };

  const handleWelcomeReject = () => {
    setShowWelcomeModal(false);
    guide.disableGuide(); // Deshabilita la guía de toasts
    // El modal volverá a aparecer la próxima vez
  };

  const handleWelcomeNeverShow = () => {
    setShowWelcomeModal(false);
    guide.neverShowWelcome(); // Marca permanentemente para no volver a mostrar
    guide.disableGuide(); // También deshabilita la guía de toasts
  };

  // Mostrar confirmación de modo cuando cambian las acciones
  useEffect(() => {
    if (!isOpen) return;
    
    const modes = [];
    if (ndaEnabled) modes.push('NDA');
    if (mySignature) modes.push('Mi Firma');
    if (workflowEnabled) modes.push('Flujo de Firmas');
    
    if (modes.length > 0) {
      setModeConfirmation(`Modo seleccionado: ${modes.join(' + ')}`);
      
      // Desvanecer después de 3.5 segundos
      const timer = setTimeout(() => {
        setModeConfirmation('');
      }, 3500);
      
      return () => clearTimeout(timer);
    } else {
      setModeConfirmation('');
    }
  }, [mySignature, workflowEnabled, ndaEnabled, isOpen, documentLoaded]);

  // Firma legal (opcional)
  const [signatureMode, setSignatureMode] = useState<SignatureMode>('none'); // 'none', 'canvas', 'signnow'
  const [signatureTab, setSignatureTab] = useState<SignatureTab>('draw'); // 'draw', 'type', 'upload'
  const [typedSignature, setTypedSignature] = useState('');
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null);
  const { canvasRef, hasSignature, clearCanvas, getSignatureData, handlers } = useSignatureCanvas();
  const finalizeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Preview del documento
  const PREVIEW_BASE_HEIGHT = 'h-[400px]';
  const previewBaseHeight = isMobile ? 'h-[40vh]' : PREVIEW_BASE_HEIGHT;
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [documentPreviewPdfData, setDocumentPreviewPdfData] = useState<ArrayBuffer | null>(null);
  const [workflowPreviewUrl, setWorkflowPreviewUrl] = useState<string | null>(null);
  const [workflowPreviewPdfData, setWorkflowPreviewPdfData] = useState<ArrayBuffer | null>(null);
  const workflowPreviewKeyRef = useRef<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('compact'); // 'compact' | 'expanded' | 'fullscreen'
  const [showSignatureOnPreview, setShowSignatureOnPreview] = useState(false);
  const [focusView, setFocusView] = useState<'document' | 'nda' | null>(null);
  const [isFieldDragging, setIsFieldDragging] = useState(false);
  const fieldDragRef = useRef<{ id: string; page: number; startX: number; startY: number; originX: number; originY: number; width: number; height: number } | null>(null);
  const [isGroupDragging, setIsGroupDragging] = useState(false);
  const groupDragRef = useRef<{
    batchId: string;
    startX: number;
    startY: number;
    originById: Record<string, { x: number; y: number; width: number; height: number; page: number }>;
  } | null>(null);
  const [isFieldResizing, setIsFieldResizing] = useState(false);
  const fieldResizeRef = useRef<{ id: string; startX: number; startY: number; originWidth: number; originHeight: number } | null>(null);
  const signatureDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const pdfScrollRef = useRef<HTMLDivElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  // TODO: FEATURE PARCIAL - UI de anotaciones existe pero no hay lógica de escritura sobre el PDF
  const [annotationMode, setAnnotationMode] = useState<AnnotationKind | null>(null); // 'signature', 'highlight', 'text'
  const [annotations, setAnnotations] = useState<Annotation[]>([]); // Lista de anotaciones (highlights y textos)

  // Helper: Convertir base64 a Blob
  const base64ToBlob = (base64: string) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'application/pdf' });
  };

  // Helper para mostrar toasts con X (solo si están habilitados)
  const showToast = (message: string, options: ToastConfig = {}) => {
    if (!toastsEnabled) return;

    const {type = 'default', ...restOptions} = options;

    const toastMethod = type === 'success' ? toast.success
                      : type === 'error' ? toast.error
                      : toast;

    return toastMethod(
      (t) => (
        <div className="flex items-start justify-between gap-3 w-full">
          <span className="flex-1">{message}</span>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              setShowToastConfirmModal(true);
            }}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            title="Desactivar notificaciones"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ),
      {
        ...restOptions,
        style: {
          ...restOptions.style,
          minWidth: '300px'
        }
      }
    );
  };

  // Handlers para el modal de confirmación de toasts
  const handleDisableToasts = () => {
    setToastsEnabled(false);
    localStorage.setItem('ecosign_toasts_enabled', 'false');
    setShowToastConfirmModal(false);
    toast('Notificaciones desactivadas. Podés reactivarlas desde configuración.', {
      duration: 4000,
      position: 'bottom-center'
    });
  };

  const handleKeepToasts = () => {
    setShowToastConfirmModal(false);
  };

  if (!isOpen) return null;

  const runPostFileSelectionEffects = useCallback((selectedFile: File) => {
    // BLOQUE 1: Toast inicial si protección está activa
    if (forensicEnabled) {
      toast('🛡️ Protección activada — Este documento quedará respaldado por EcoSign.', {
        duration: 3000,
        position: 'top-right'
      });
    }

    // Track analytics
    trackEvent('uploaded_doc', {
      fileType: selectedFile.type,
      fileSize: selectedFile.size,
      fileName: selectedFile.name.split('.').pop() || 'unknown' // solo extensión
    });

    // Generar preview según el tipo de archivo
    if (selectedFile.type.startsWith('image/')) {
      setDocumentPreviewPdfData(null);
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const result = event?.target?.result;
        if (typeof result === 'string') {
          setDocumentPreview(result);
        }
      };
      reader.readAsDataURL(selectedFile);
    } else if (selectedFile.type === 'application/pdf') {
      // Para PDFs, usar el URL directo
      const url = URL.createObjectURL(selectedFile);
      setDocumentPreview(url);
      selectedFile.arrayBuffer().then((buffer) => {
        setDocumentPreviewPdfData(buffer);
      }).catch(() => {
        setDocumentPreviewPdfData(null);
      });
    } else {
      // Para otros tipos, mostrar icono genérico
      setDocumentPreview(null);
      setDocumentPreviewPdfData(null);
    }

    // CONSTITUCIÓN: Toast unificado "Documento listo"
    showToast('Documento listo.\nEcoSign no ve tu documento.\nLa certificación está activada por defecto.', {
      icon: '✓',
      position: 'top-right',
      duration: 4000
    });

    // CONSTITUCIÓN: Abrir wizard de campos si corresponde (Mi firma)
    if (initialAction === 'sign' || mySignature) {
      setIsCanvasLocked(true);
      openMySignatureWizard();

      showToast('Configurá los campos antes de firmar.', {
        icon: '✍️',
        position: 'top-right',
        duration: 3000
      });
    }
  }, [forensicEnabled, initialAction, mySignature, showToast, openMySignatureWizard]);

  const applySelectedFile = useCallback(async (selectedFile: File, opts?: { resetInput?: () => void }) => {
    // Detectar si es un PDF encriptado
    if (selectedFile.type === 'application/pdf') {
      const isEncrypted = await isPDFEncrypted(selectedFile);
      if (isEncrypted) {
        toast.error(
          'Documento bloqueado\n\nEste archivo tiene una contraseña.\n\nLos documentos protegidos no pueden usarse para generar evidencia digital verificable.\n\nSubí una versión sin contraseña para continuar.',
          {
            duration: 8000,
            position: 'bottom-right',
            style: {
              whiteSpace: 'pre-line',
              maxWidth: '500px'
            }
          }
        );
        opts?.resetInput?.();
        return false;
      }

      // P0.1: Validar estructura PDF (antes de continuar)
      const isPDFValid = await validatePDFStructure(selectedFile);
      if (!isPDFValid) {
        toast.error(
          'Este PDF está dañado o tiene una estructura inválida.\n\nProbá abrirlo en un lector de PDF (Adobe Reader, Foxit) y volvé a guardarlo.',
          {
            duration: 8000,
            position: 'bottom-right',
            style: {
              whiteSpace: 'pre-line',
              maxWidth: '500px'
            }
          }
        );
        opts?.resetInput?.();
        return false;
      }

      // P0.2: Advertir sobre permisos PDF (warning, no bloqueante)
      const permissions = await checkPDFPermissions(selectedFile);
      if (permissions.restricted) {
        toast(
          'Este PDF tiene restricciones de edición.\n\nSi tenés problemas al certificar, pedí al creador que quite las restricciones.',
          {
            icon: '⚠️',
            duration: 8000,
            position: 'bottom-right',
            style: {
              whiteSpace: 'pre-line',
              maxWidth: '500px',
              background: '#FEF3C7',
              color: '#92400E'
            }
          }
        );
      }
    }

    setFile(selectedFile);
    setDocumentLoaded(true); // CONSTITUCIÓN: Controlar visibilidad de acciones
    setPreviewError(false);
    console.log('Archivo seleccionado:', selectedFile.name);

    // Early warning: same filename already exists (do not block).
    try {
      if (!isGuestMode()) {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: existing } = await supabase
            .from('document_entities')
            .select('id, created_at, events')
            .eq('owner_id', user.id)
            .eq('source_name', selectedFile.name)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existing?.id) {
            const eventsArr = Array.isArray((existing as any).events) ? (existing as any).events : [];
            const hasProtectionStarted = eventsArr.some((ev: any) =>
              ev?.kind === 'document.protected.requested' || ev?.kind === 'tsa.confirmed'
            );

            setDuplicateNamePrompt({
              entityId: existing.id,
              fileName: selectedFile.name,
              createdAt: existing.created_at,
              hasProtectionStarted,
            });
          }
        }
      }
    } catch (dupErr) {
      console.warn('Duplicate name check skipped:', dupErr);
    }

    return true;
  }, [setFile, setDocumentLoaded, setPreviewError, setDuplicateNamePrompt]);

  useEffect(() => {
    if (!isOpen) return;
    if (file) return;
    if (initialAction !== 'certify') return;

    const raw = localStorage.getItem('ecosign_draft_to_open');
    if (!raw) return;
    localStorage.removeItem('ecosign_draft_to_open');

    const opRaw = localStorage.getItem('ecosign_draft_operation_id');
    localStorage.removeItem('ecosign_draft_operation_id');

    let draftFileRef: string | null = null;
    let operationId: string | null = opRaw || null;
    try {
      // Back-compat: some builds stored a JSON payload in this key.
      if (raw.trim().startsWith('{')) {
        const parsed = JSON.parse(raw);
        draftFileRef = typeof parsed?.draftFileRef === 'string' ? parsed.draftFileRef : null;
        operationId = typeof parsed?.operationId === 'string' ? parsed.operationId : operationId;
      } else {
        draftFileRef = raw;
      }
    } catch {
      draftFileRef = raw;
    }

    if (!draftFileRef) return;

    let active = true;
    (async () => {
      try {
        const file = await loadDraftFile(draftFileRef);
        if (!active) return;
        if (!file) {
          showToast('Este borrador no está disponible para continuar todavía.', { type: 'error' });
          return;
        }
        const ok = await applySelectedFile(file);
        if (ok) {
          runPostFileSelectionEffects(file);
        }

        // Best-effort state restore (server drafts)
        if (operationId && draftFileRef.startsWith('server:')) {
          try {
            const supabase = getSupabase();
            const { data: row, error: rowError } = await supabase
              .from('operation_documents')
              .select('draft_metadata')
              .eq('operation_id', operationId)
              .eq('draft_file_ref', draftFileRef)
              .maybeSingle();

            if (rowError) {
              console.warn('Failed to load draft metadata', rowError);
            } else {
              const draftState = (row as any)?.draft_metadata?.draft_state;
              if (draftState && typeof draftState === 'object') {
                if (typeof (draftState as any).ndaEnabled === 'boolean') setNdaEnabled((draftState as any).ndaEnabled);
                if (typeof (draftState as any).ndaText === 'string') setNdaText((draftState as any).ndaText);
                if (typeof (draftState as any).workflowEnabled === 'boolean') setWorkflowEnabled((draftState as any).workflowEnabled);
                if (Array.isArray((draftState as any).emailInputs)) setEmailInputs((draftState as any).emailInputs);
                if (Array.isArray((draftState as any).signatureFields)) setSignatureFields((draftState as any).signatureFields);
                if ((draftState as any).signaturePreview) setSignaturePreview((draftState as any).signaturePreview);
                if (typeof (draftState as any).custodyModeChoice === 'string') setCustodyModeChoice((draftState as any).custodyModeChoice);
                if (typeof (draftState as any).forensicEnabled === 'boolean') setForensicEnabled((draftState as any).forensicEnabled);
                if ((draftState as any).forensicConfig) setForensicConfig((draftState as any).forensicConfig);
                if (typeof (draftState as any).mySignature === 'boolean') setMySignature((draftState as any).mySignature);
                if ((draftState as any).signatureType) setSignatureType((draftState as any).signatureType);
                setWorkflowAssignmentConfirmed(false);
              }
            }
          } catch (err) {
            console.warn('Draft state restore skipped', err);
          }
        }
      } catch (err) {
        console.error('Failed to resume draft', err);
        showToast('No se pudo abrir el borrador.', { type: 'error' });
      }
    })();

    return () => {
      active = false;
    };
  }, [isOpen, file, initialAction, applySelectedFile]);

  const openExistingDocumentEntity = (entityId: string) => {
    // 1. Store flag in sessionStorage for DocumentsPage to detect
    try {
      sessionStorage.setItem('ecosign_open_document_entity_id', entityId);
    } catch {
      // ignore if sessionStorage unavailable
    }
    
    // 2. Close modal and context
    resetAndClose();
    if (onClose) onClose();
    
    // 3. Soft navigate using React Router (maintains session)
    // DocumentsPage will detect sessionStorage flag in useEffect and scroll/focus
    navigate('/documentos');
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf') {
      showToast('Solo se admiten documentos PDF.', { type: 'error', duration: 4000 });
      e.target.value = '';
      return;
    }

    const ok = await applySelectedFile(selectedFile, { resetInput: () => { e.target.value = ''; } });
    if (ok) {
      runPostFileSelectionEffects(selectedFile);
    }
  };
  // Cleanup de URLs de preview para evitar fugas
  useEffect(() => {
    return () => {
      if (documentPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(documentPreview);
      }
    };
  }, [documentPreview]);

  // Preview con página de firmas (solo para editar campos en workflow)
  useEffect(() => {
    let cancelled = false;

    const revoke = (url: string | null) => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    };

    const shouldBuildPreview = Boolean(
      file &&
      file.type === 'application/pdf' &&
      workflowEnabled &&
      signatureFields.length > 0
    );

    if (!shouldBuildPreview) {
      revoke(workflowPreviewUrl);
      setWorkflowPreviewUrl(null);
      setWorkflowPreviewPdfData(null);
      workflowPreviewKeyRef.current = null;
      return () => {
        cancelled = true;
      };
    }

    const currentFile = file;
    if (!currentFile) {
      return () => {
        cancelled = true;
      };
    }

    const key = [
      currentFile.name,
      currentFile.size,
      currentFile.lastModified,
      workflowPageSizeMode
    ].join('|');

    if (workflowPreviewKeyRef.current === key && workflowPreviewUrl) {
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const signaturePage = await appendSignaturePage(currentFile, workflowPageSizeMode);
        if (cancelled) return;
        const url = URL.createObjectURL(signaturePage.blob);
        const buffer = await signaturePage.blob.arrayBuffer();
        if (cancelled) return;
        revoke(workflowPreviewUrl);
        workflowPreviewKeyRef.current = key;
        setWorkflowPreviewUrl(url);
        setWorkflowPreviewPdfData(buffer);
      } catch (err) {
        console.warn('No se pudo generar preview con página de firmas:', err);
        revoke(workflowPreviewUrl);
        setWorkflowPreviewUrl(null);
        setWorkflowPreviewPdfData(null);
        workflowPreviewKeyRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file, workflowEnabled, signatureFields.length, workflowPageSizeMode]);

  useEffect(() => {
    if (!previewContainerRef.current) return;
    const recalcScale = (width: number) => {
      const availableWidth = Math.max(0, width - 16);
      const breathing = 0.98;
      const fitScale = availableWidth / VIRTUAL_PAGE_WIDTH;
      const scale = Math.min(1, fitScale * breathing);
      setVirtualScale(Math.max(0.2, scale));
    };

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect?.width) {
          recalcScale(entry.contentRect.width);
        }
      }
    });
    observer.observe(previewContainerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Recalcular autofit cuando cambia layout del modal/paneles.
    const run = () => {
      const width = previewContainerRef.current?.getBoundingClientRect().width ?? 0;
      if (!width) return;
      const availableWidth = Math.max(0, width - 16);
      const breathing = 0.98;
      const fitScale = availableWidth / VIRTUAL_PAGE_WIDTH;
      const scale = Math.min(1, fitScale * breathing);
      setVirtualScale(Math.max(0.2, scale));
    };
    const raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, previewMode, focusView, flowPanelOpen, ndaPanelOpen, isMobile, documentPreviewPdfData, workflowPreviewPdfData]);

  useEffect(() => {
    if (documentPreview || workflowPreviewUrl) {
      setPdfEditError(false);
    }
  }, [documentPreview, workflowPreviewUrl]);

  useEffect(() => {
    // Cuando ya tenemos binario en memoria, habilitamos de nuevo el viewer.
    if (documentPreviewPdfData || workflowPreviewPdfData) {
      setPdfEditError(false);
    }
  }, [documentPreviewPdfData, workflowPreviewPdfData]);

  useEffect(() => {
    setNdaPanelOpen(ndaEnabled);
  }, [ndaEnabled]);

  useEffect(() => {
    setFlowPanelOpen(workflowEnabled);
  }, [workflowEnabled]);

  // ✅ Realtime subscription: Update protection_level badge when workers complete
  // Listens to user_documents table changes and updates certificateData
  // (Ya no necesario porque no hay Step 2)
  useEffect(() => {
    if (!certificateData?.documentId) return;

    const supabase = getSupabase();
    const documentId = certificateData.documentId;

    console.log('👂 Subscribing to protection_level changes for document:', documentId);

    // Subscribe to changes on this specific document
    const channel = supabase
      .channel(`protection-level-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_documents',
          filter: `id=eq.${documentId}`
        },
        (payload: { new?: { protection_level?: ProtectionLevel }; old?: { protection_level?: ProtectionLevel } }) => {
          console.log('🔄 Protection level update received:', payload);

          const newProtectionLevel = payload.new?.protection_level;
          const oldProtectionLevel = payload.old?.protection_level;

          // Only update if protection_level actually changed
          if (newProtectionLevel && newProtectionLevel !== oldProtectionLevel) {
            console.log(`✨ Protection level upgraded: ${oldProtectionLevel} → ${newProtectionLevel}`);

            setCertificateData(prev => prev ? ({
              ...prev,
              protectionLevel: newProtectionLevel
            }) : prev);

            // Show toast notification
            const levelNames: Record<string, string> = {
              ACTIVE: 'Protección Activa',
              REINFORCED: 'Protección Reforzada',
              TOTAL: 'Protección Total'
            };

            showToast(`🛡️ ${levelNames[newProtectionLevel] || newProtectionLevel} confirmada`, {
              type: 'success',
              duration: 4000,
              position: 'top-right'
            });
          }
        }
      )
      .subscribe();

    // Cleanup subscription when component unmounts or step changes
    return () => {
      console.log('🔇 Unsubscribing from protection_level changes');
      supabase.removeChannel(channel);
    };
  }, [certificateData?.documentId, step]);

  const handleAddEmailField = () => {
    if (workflowAssignmentConfirmed) {
      showToast('Para agregar firmantes, reiniciá la asignación de campos.', {
        type: 'warning',
        duration: 2500,
        position: 'top-right'
      });
      return;
    }
    setEmailInputs([...emailInputs, { email: '', name: '', requireLogin: true, requireNda: true }]);
  };

  const handleRemoveEmailField = (index: number) => {
    if (workflowAssignmentConfirmed) {
      showToast('La asignación ya está confirmada. Reiniciá para editar firmantes.', {
        type: 'warning',
        duration: 2500,
        position: 'top-right'
      });
      return;
    }
    if (emailInputs.length <= 1) return; // Mantener al menos 1 campo
    
    // Si hay más de 3 firmantes, pedir confirmación
    if (emailInputs.length > 3) {
      if (!window.confirm('¿Estás seguro de eliminar este firmante?')) {
        return;
      }
    }
    
    const newInputs = emailInputs.filter((_, idx) => idx !== index);
    setEmailInputs(newInputs);
  };

  const handleEmailChange = (index: number, value: string) => {
    const newInputs = [...emailInputs];
    newInputs[index] = { ...newInputs[index], email: value };
    setEmailInputs(newInputs);
    // NO mostrar toast aquí - se muestra en onBlur para evitar spam mientras escribe
  };

  const extractEmailsFromText = (text: string): string[] => {
    const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    if (!matches) return [];
    return matches.map((email) => email.trim()).filter(Boolean);
  };

  // Validar email solo cuando el usuario termina de escribir (onBlur)
  const handleEmailBlur = (index: number) => {
    const email = emailInputs[index].email.trim();
    if (!email) return; // Campo vacío, no mostrar nada

    const validation = isValidEmail(email);
    if (validation.valid) {
      showToast('Destinatario agregado correctamente.', {
        type: 'success',
        duration: 2000,
        position: 'top-right'
      });
    } else if (validation.error) {
      showToast(validation.error, {
        type: 'error',
        duration: 3000,
        position: 'bottom-right'
      });
    }
  };

  const handleEmailPaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text');
    const extracted = extractEmailsFromText(text);
    if (extracted.length <= 1) return;

    event.preventDefault();

    const existing = new Set(
      emailInputs
        .map((input) => input.email.trim().toLowerCase())
        .filter(Boolean)
    );
    const unique: string[] = [];
    for (const raw of extracted) {
      const email = raw.toLowerCase();
      if (!email || existing.has(email)) continue;
      if (!isValidEmail(email).valid) continue;
      existing.add(email);
      unique.push(email);
    }

    if (unique.length === 0) {
      showToast('Los emails pegados ya estaban cargados.', {
        type: 'default',
        duration: 2500,
        position: 'top-right'
      });
      return;
    }

    const next = [...emailInputs];
    next[index] = { ...next[index], email: unique[0] };
    for (let i = 1; i < unique.length; i += 1) {
      next.push({ email: unique[i], name: '', requireLogin: true, requireNda: true });
    }
    setEmailInputs(next);

    showToast(`Se agregaron ${unique.length} firmante${unique.length > 1 ? 's' : ''}.`, {
      type: 'success',
      duration: 2000,
      position: 'top-right'
    });
  };

  const handleNameChange = (index: number, value: string) => {
    const newInputs = [...emailInputs];
    newInputs[index] = { ...newInputs[index], name: value };
    setEmailInputs(newInputs);
  };

  // Validación mejorada de email
  const isValidEmail = (email: string): { valid: boolean; error?: string } => {
    const trimmed = email.trim();
    // Regex más estricta: debe tener @ y dominio válido
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(trimmed)) return { valid: false, error: 'Formato de email inválido' };
    
    // No permitir dominios comunes mal escritos
    const commonTypos = ['gmial.com', 'gmai.com', 'yahooo.com', 'hotmial.com'];
    const domain = trimmed.split('@')[1];
    if (commonTypos.includes(domain)) {
      return { valid: false, error: 'Posible error de tipeo en el dominio' };
    }
    
    return { valid: true };
  };

  const buildSignersList = (options?: { showErrors?: boolean }): Signer[] => {
    const showErrors = options?.showErrors ?? false;
    // Construir lista de firmantes desde los campos con email
    const validSigners: Signer[] = [];
    const seen = new Set<string>();
    const errors: string[] = [];

    emailInputs.forEach((input, idx) => {
      const trimmed = input.email.trim().toLowerCase();
      if (!trimmed) return; // Campo vacío, ignorar

      const validation = isValidEmail(trimmed);

      if (!validation.valid) {
        errors.push(`Email ${idx + 1}: ${validation.error}`);
        return;
      }

      if (seen.has(trimmed)) {
        errors.push(`Email duplicado: ${trimmed}`);
        return;
      }

      seen.add(trimmed);
      validSigners.push({
        email: trimmed,
        name: input.name?.trim() || undefined,
        signingOrder: validSigners.length + 1,
        requireLogin: input.requireLogin,
        requireNda: ndaEnabled ? true : false,
        quickAccess: false
      });
    });

    // Mostrar errores si hay (posición abajo para errores)
    if (showErrors && errors.length > 0) {
      toast.error(errors[0], { duration: 4000, position: 'bottom-right' });
    }

    return validSigners;
  };

  // BLOQUE 1: Helper para interceptar acciones cuando protección está desactivada
  const handleActionWithProtectionCheck = (action: () => void) => {
    if (!forensicEnabled) {
      setShowUnprotectedWarning(true);
    } else {
      action();
    }
  };

  // Sprint 4: Wrapper para mostrar custody modal antes de proteger
  const handleProtectClick = async () => {
    if (!file) return;

    // Mi firma: requiere owner y al menos un campo
    if (mySignature && !workflowEnabled) {
      if (!ownerEmail) {
        toast.error('Necesitás iniciar sesión para firmar este documento.');
        return;
      }
      if (signatureFields.length === 0) {
        openMySignatureWizard();
        return;
      }
    }

    // UX hard-stop: si hay Flujo de Firmas activo, no abrir modales de custody/progreso
    // hasta que la asignacion estructural este completa.
    if (workflowEnabled) {
      const validSigners = buildSignersList({ showErrors: true });
      if (validSigners.length === 0) {
        toast.error('Agregá al menos un email válido para enviar el documento a firmar');
        setFlowPanelOpen(true);
        return;
      }

      if (signatureFields.length === 0) {
        toast.error('Necesitás aceptar la asignación de campos. Tocá "Asignar campos".');
        openSignerFieldsWizard();
        return;
      }

      const { batches, unassignedBatches } = resolveBatchAssignments(signatureFields, validSigners);

      const signerEmailSet = new Set(validSigners.map((s) => normalizeEmail(s.email)));
      const invalidAssignedBatches = batches.filter((b) => {
        const assigned = normalizeEmail(b.assignedSignerEmail);
        return Boolean(assigned) && !signerEmailSet.has(assigned);
      });

      if (invalidAssignedBatches.length > 0) {
        toast('Hay grupos asignados a emails que ya no están en la lista. Reasigná esos grupos.', { position: 'top-right' });
        openSignerFieldsWizard();
        return;
      }

      if (unassignedBatches.length > 0) {
        toast('Asigná los grupos de campos a los firmantes antes de enviar', { position: 'top-right' });
        openSignerFieldsWizard();
        return;
      }

      const assignedEmails = new Set(
        batches
          .map((b) => normalizeEmail(b.assignedSignerEmail))
          .filter((email) => Boolean(email) && signerEmailSet.has(email))
      );
      const missingFor = validSigners
        .map((s) => s.email.trim().toLowerCase())
        .filter((email) => !assignedEmails.has(email));
      if (missingFor.length > 0) {
        toast(`Faltan campos asignados para: ${missingFor.join(', ')}`, { position: 'top-right' });
        openSignerFieldsWizard();
        return;
      }

    }

    // Validación dura de TSA SOLO al ejecutar Proteger (no en el toggle).
    if (forensicEnabled) {
      setIsValidatingTSA(true);
      const tsaAvailable = await validateTSAConnectivity().catch(() => false);
      setIsValidatingTSA(false);
      if (!tsaAvailable) {
        toast(
          'No se pudo validar timestamping en este momento. Continuamos y se intentará server-side.',
          {
            duration: 5000,
            position: 'bottom-right'
          }
        );
      }
    }

    // Mostrar modal de custody para que usuario elija el modo
    setShowCustodyModal(true);
  };

  const handleCustodyConfirmed = (custodyMode: CustodyMode) => {
    setCustodyModeChoice(custodyMode);
    // Proceder con la protección
    handleCertify();
  };

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${label} timeout`));
      }, ms);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  const handleCertify = async () => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Solo se admiten documentos PDF.', { position: 'bottom-right' });
      return;
    }

    // Validar que si "Mi Firma" está activa, debe existir configuración de campos
    if (mySignature && signatureFields.length === 0) {
      toast.error('Debés configurar los campos antes de firmar. Hacé clic en "Mi Firma" y usá el wizard.', {
        position: 'bottom-right'
      });
      return;
    }

    // Validar que si "Mi Firma" está activa, debe elegir tipo de firma
    if (mySignature && signatureFields.length > 0 && !signatureType) {
      toast.error('Elegí el tipo de firma para continuar.', {
        position: 'bottom-right'
      });
      return;
    }

    // P1 UX gate (no irreversible/progress UI before structural decisions are confirmed)
    if (workflowEnabled) {
      const validSigners = buildSignersList();
      if (validSigners.length === 0) {
        toast.error('Agregá al menos un email válido para enviar el documento a firmar');
        return;
      }

      if (signatureFields.length === 0) {
        openSignerFieldsWizard();
        return;
      }

      const { batches, unassignedBatches } = resolveBatchAssignments(signatureFields, validSigners);

      const signerEmailSet = new Set(validSigners.map((s) => normalizeEmail(s.email)));
      const invalidAssignedBatches = batches.filter((b) => {
        const assigned = normalizeEmail(b.assignedSignerEmail);
        return Boolean(assigned) && !signerEmailSet.has(assigned);
      });

      if (invalidAssignedBatches.length > 0) {
        toast('Hay grupos asignados a emails que ya no están en la lista. Reasigná esos grupos.', { position: 'top-right' });
        openSignerFieldsWizard();
        return;
      }

      if (unassignedBatches.length > 0) {
        toast('Asigná los grupos de campos a los firmantes antes de enviar', { position: 'top-right' });
        openSignerFieldsWizard();
        return;
      }

      const assignedEmails = new Set(
        batches
          .map((b) => normalizeEmail(b.assignedSignerEmail))
          .filter((email) => Boolean(email) && signerEmailSet.has(email))
      );
      const missingFor = validSigners
        .map((s) => s.email.trim().toLowerCase())
        .filter((email) => !assignedEmails.has(email));
      if (missingFor.length > 0) {
        toast(`Faltan campos asignados para: ${missingFor.join(', ')}`, { position: 'top-right' });
        openSignerFieldsWizard();
        return;
      }

      // Auto-confirmation: if structure is complete, we can proceed.
    }

    setLoading(true);

    // FASE 3.C: Timeout tracking (P0.6)
    let timeoutWarning: ReturnType<typeof setTimeout> | null = null;
    let watchdog: ReturnType<typeof setTimeout> | null = null;

    // FASE 3.A: Show progress (P0.5)
    setCertifyProgress({
      stage: 'preparing',
      message: 'Iniciando protección...'
    });
    watchdog = setTimeout(() => {
      setCertifyProgress({
        stage: 'preparing',
        message: '',
        error: 'La operación tardó demasiado. Por favor, reintentá.',
        workSaved: false
      });
    }, 25000);

    try {
      if (isGuestMode()) {
        showToast('Demo: certificado generado (no se guarda ni se descarga en modo invitado).', { type: 'success' });

        // Ejecutar animación y cerrar (modo demo)
        playFinalizeAnimation();

        setTimeout(() => {
          resetAndClose();
          if (onClose) onClose();
        }, 100);

        setLoading(false);
        return;
      }
      const supabase = getSupabase();
      let canonicalDocumentId: string | null = null;
      let canonicalSourceHash: string | null = null;

      try {
        const sourceHash = await hashSource(file);
        canonicalSourceHash = sourceHash;

        setCertifyProgress({ stage: 'preparing', message: 'Creando entidad canónica...' });
        const tempCreated = await withTimeout(createSourceTruth({
          name: file.name,
          mime_type: file.type || 'application/pdf',
          size_bytes: file.size,
          hash: sourceHash,
          custody_mode: 'hash_only',
          storage_path: null
        }), 20000, 'createSourceTruth');
        canonicalDocumentId = tempCreated.id as string;

        if (!canonicalDocumentId) {
          throw new Error(
            'No se pudo crear la entidad canónica del documento (document_entities).'
          );
        }

        // Solo cifrar y subir el original si el usuario eligió encrypted_custody
        if (custodyModeChoice === 'encrypted_custody') {
          setCertifyProgress({
            stage: 'preparing',
            message: 'Cifrando archivo original...'
          });
          setCertifyProgress({ stage: 'preparing', message: 'Cifrando archivo original...' });
          const storagePath = await withTimeout(
            storeEncryptedCustody(file, canonicalDocumentId),
            20000,
            'storeEncryptedCustody'
          );

          const { error: updateError } = await supabase
            .from('document_entities')
            .update({
              custody_mode: 'encrypted_custody',
              source_storage_path: storagePath
            })
            .eq('id', canonicalDocumentId);

          if (updateError) {
            console.warn('Failed to update custody metadata:', updateError);
          } else {
            console.log('✅ Encrypted custody stored:', storagePath);
          }
        } else {
          console.log('ℹ️ Custody mode is hash_only, skipping encrypted upload');
        }
      } catch (err) {
        // Solo es error fatal si el usuario QUERÍA guardar el original
        if (custodyModeChoice === 'encrypted_custody') {
          console.error('Encrypted custody required but failed:', err);
          showToast('No se pudo cifrar y guardar el original. Intentá nuevamente.', { type: 'error' });
          setLoading(false);
          return;
        }
        // Si es hash_only, el error de custody no es bloqueante
        console.warn('Custody upload failed (non-blocking for hash_only):', err);
        if (!canonicalDocumentId) {
          throw new Error(
            'No se pudo crear la entidad canónica del documento (document_entities).'
          );
        }
      }
      if (canonicalDocumentId) {
        console.debug('Canonical document_entities created:', canonicalDocumentId);
      }

      // FLUJO 1B: Mi firma (workflow con 1 signer, sin mails, sin OTP)
      if (mySignature && !workflowEnabled) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          showToast('Necesitás iniciar sesión para firmar este documento', { type: 'error' });
          setLoading(false);
          return;
        }

        const ownerEmailValue = user.email || ownerEmail;
        if (!ownerEmailValue) {
          showToast('No pudimos determinar tu email. Iniciá sesión nuevamente.', { type: 'error' });
          setLoading(false);
          return;
        }

        if (signatureFields.length === 0) {
          openMySignatureWizard();
          setLoading(false);
          return;
        }

        const ownerName = (user.user_metadata as any)?.full_name || user.email || 'Owner';
        const selfSigner = {
          email: ownerEmailValue,
          name: ownerName,
          signingOrder: 1,
          quickAccess: true,
          requireLogin: false,
          requireNda: ndaEnabled
        };

        const selfFields = signatureFields.map((f) => ({
          ...f,
          assignedTo: ownerEmailValue,
          batchId: f.batchId || f.id
        }));

        // Reusar pipeline de workflow para generar PDF con campos
        let fileToSend = file;
        try {
          const signaturePage = await appendSignaturePage(fileToSend, workflowPageSizeMode);
          fileToSend = new File([signaturePage.blob], file.name, { type: 'application/pdf' });
        } catch (err) {
          console.error('❌ Error agregando página de firmas:', err);
          showToast('No se pudo agregar la página de firmas. Intentá nuevamente.', { type: 'error' });
          setLoading(false);
          return;
        }

        if (selfFields.length > 0) {
          try {
            console.log('📋 Estampando campos preparados para Mi firma...');

            const overlaySpec = convertToOverlaySpec(
              selfFields,
              null, // No incluir firma del owner en workflow
              workflowVirtualSize.width,
              workflowVirtualSize.height,
              'owner'
            );

            if (overlaySpec.length > 0) {
              const { validateOverlaySpec } = await import('../utils/overlaySpecConverter');
              if (validateOverlaySpec(overlaySpec)) {
                const stampedBlob = await applyOverlaySpecToPdf(file, overlaySpec);
                fileToSend = new File([stampedBlob], file.name, { type: 'application/pdf' });
                console.log('✅ Campos estampados en PDF para Mi firma');
              }
            }
          } catch (err) {
            console.warn('⚠️ Error estampando campos para Mi firma, enviando PDF sin campos:', err);
            // Continuar sin campos estampados
          }
        }

        const arrayBuffer = await fileToSend.arrayBuffer();
        const documentHash = await hashWitness(arrayBuffer);

        const sanitizedWorkflowFilename = file.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9.-]/g, '_')
          .replace(/__+/g, '_');

        const storagePath = `${user.id}/${Date.now()}-${sanitizedWorkflowFilename}`;
        const { error: uploadError } = await supabase.storage
          .from('user-documents')
          .upload(storagePath, fileToSend, {
            contentType: fileToSend.type || 'application/pdf',
            upsert: false
          });

        if (uploadError) {
          console.error('Error subiendo archivo para workflow (Mi firma):', uploadError);
          showToast('No se pudo subir el archivo para iniciar la firma', { type: 'error' });
          setLoading(false);
          return;
        }

        setCertifyProgress({ stage: 'preparing', message: 'Generando enlace seguro...' });
        const { data: signedUrlData, error: signedUrlError } = await withTimeout(
          supabase.storage
          .from('user-documents')
          .createSignedUrl(storagePath, 60 * 60 * 24 * 30),
          20000,
          'createSignedUrl'
        );

        if (signedUrlError || !signedUrlData?.signedUrl) {
          console.error('Error generando signed URL (Mi firma):', signedUrlError);
          showToast('No se pudo generar el enlace del documento', { type: 'error' });
          setLoading(false);
          return;
        }

        if (canonicalDocumentId) {
          try {
            storeEncryptedCustody(
              fileToSend,
              canonicalDocumentId,
              'witness'
            ).catch(err => console.warn('Custody backup skipped:', err));

            await advanceLifecycle(canonicalDocumentId, 'witness_ready');
          } catch (err) {
            console.error('❌ Canonical witness preparation failed (Mi firma):', err);
            showToast('No se pudo preparar la copia fiel (PDF witness).', { type: 'error' });
            setLoading(false);
            return;
          }
        }

        if (!canonicalDocumentId) {
          showToast('No se pudo preparar el documento canónico para la firma.', { type: 'error' });
          setLoading(false);
          return;
        }

        try {
          console.log('📋 Guardando campos de Mi firma en DB...');
          const savedFields = await saveWorkflowFields(
            selfFields,
            canonicalDocumentId,
            workflowVirtualSize.width,
            workflowVirtualSize.height
          );
          console.log(`✅ ${savedFields.length} campos guardados en workflow_fields`);
        } catch (fieldsError) {
          console.error('❌ Error guardando workflow fields (Mi firma):', fieldsError);
          showToast('No se pudieron guardar los campos asignados. Intentá nuevamente.', { type: 'error' });
          setLoading(false);
          return;
        }

        try {
          setIsCanvasLocked(true);
          setCertifyProgress({ stage: 'preparing', message: 'Iniciando flujo de firma...' });
          const workflowResult = await withTimeout(startSignatureWorkflow({
            documentUrl: signedUrlData.signedUrl,
            documentHash,
            originalFilename: file.name,
            documentEntityId: canonicalDocumentId || undefined,
            signatureType: signatureType === 'certified' ? 'SIGNNOW' : 'ECOSIGN',
            deliveryMode: 'link',
            ndaText: ndaEnabled ? (ndaSavedText ?? ndaText) : null,
            ndaEnabled,
            signers: [selfSigner],
            forensicConfig: {
              rfc3161: forensicEnabled && forensicConfig.useLegalTimestamp,
              polygon: forensicEnabled && forensicConfig.usePolygonAnchor,
              bitcoin: forensicEnabled && forensicConfig.useBitcoinAnchor
            }
          }), 60000, 'startSignatureWorkflow');

          const signUrl = workflowResult?.firstSignerUrl as string | null;
          if (signUrl) {
            const tokenPart = signUrl.split('/sign/')[1] || '';
            const tokenOnly = tokenPart.split('?')[0];
            if (tokenOnly) {
              const originRoute = `${location.pathname}${location.search}${location.hash}`;
              storeSignFlowContext(tokenOnly, {
                flowType: 'my_signature',
                originRoute,
                createdAt: new Date().toISOString()
              });
              resetAndClose();
              onClose();
              setLoading(false);
              navigate(`/sign/${tokenOnly}`);
              return;
            }
          }

          showToast('No se pudo abrir el flujo de firma. Intentá nuevamente.', { type: 'error' });
          throw new Error('missing_first_signer_url');
        } catch (workflowError) {
          console.error('❌ Error al iniciar workflow (Mi firma):', workflowError);
          const errorMessage =
            workflowError instanceof Error
              ? workflowError.message
              : typeof workflowError === 'string'
              ? workflowError
              : 'No se pudo iniciar la firma. Verificá los datos e intentá de nuevo.';
          showToast(errorMessage, { type: 'error' });
        }

        setLoading(false);
        return;
      }

      const hasWorkflowIntent =
        workflowEnabled ||
        emailInputs.some((input) => isValidEmail(input.email.trim()).valid);

      // FLUJO 1: Firmas Múltiples (Caso B) - Enviar emails y terminar
      if (hasWorkflowIntent) {
        // Validar que haya al menos un email
        const validSigners = buildSignersList();
        if (validSigners.length === 0) {
          toast.error('Agregá al menos un email válido para enviar el documento a firmar');
          setLoading(false);
          return;
        }

        // Obtener usuario autenticado
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          showToast('Necesitás iniciar sesión para enviar invitaciones', { type: 'error' });
          setLoading(false);
          return;
        }

        // P1: Contract - no signing without explicit batch assignment.
        if (signatureFields.length === 0) {
          openSignerFieldsWizard();
          setLoading(false);
          return;
        }

        const { batches, unassignedBatches } = resolveBatchAssignments(signatureFields, validSigners);

        const signerEmailSet = new Set(validSigners.map((s) => normalizeEmail(s.email)));
        const invalidAssignedBatches = batches.filter((b) => {
          const assigned = normalizeEmail(b.assignedSignerEmail);
          return Boolean(assigned) && !signerEmailSet.has(assigned);
        });

        if (invalidAssignedBatches.length > 0) {
          toast('Hay grupos asignados a emails que ya no están en la lista. Reasigná esos grupos.', { position: 'top-right' });
          openSignerFieldsWizard();
          setLoading(false);
          return;
        }

        // Block if any batch is not explicitly assigned.
        if (unassignedBatches.length > 0) {
          toast('Asigná los grupos de campos a los firmantes antes de enviar', { position: 'top-right' });
          openSignerFieldsWizard();
          setLoading(false);
          return;
        }

        // Block if any signer has no batch.
        const assignedEmails = new Set(
          batches
            .map((b) => normalizeEmail(b.assignedSignerEmail))
            .filter((email) => Boolean(email) && signerEmailSet.has(email))
        );

        const missingFor = validSigners
          .map((s) => s.email.trim().toLowerCase())
          .filter((email) => !assignedEmails.has(email));

        if (missingFor.length > 0) {
          toast(
            `Faltan campos asignados para: ${missingFor.join(', ')}`,
            { position: 'top-right' }
          );
          openSignerFieldsWizard();
          setLoading(false);
          return;
        }

        // Auto-confirmation: if structure is complete, we can proceed.

        // SPRINT 6: Agregar página de firmas + estampar campos antes de enviar
        let fileToSend = file;
        try {
          const signaturePage = await appendSignaturePage(fileToSend, workflowPageSizeMode);
          fileToSend = new File([signaturePage.blob], file.name, { type: 'application/pdf' });
        } catch (err) {
          console.error('❌ Error agregando página de firmas:', err);
          showToast('No se pudo agregar la página de firmas. Intentá nuevamente.', { type: 'error' });
          setLoading(false);
          return;
        }
        if (signatureFields.length > 0) {
          try {
            console.log('📋 Estampando campos preparados para firmantes...');

            const overlaySpec = convertToOverlaySpec(
              signatureFields,
              null, // No incluir firma del owner en workflow
              workflowVirtualSize.width,
              workflowVirtualSize.height,
              'owner'
            );

            if (overlaySpec.length > 0) {
              const { validateOverlaySpec } = await import('../utils/overlaySpecConverter');
              if (validateOverlaySpec(overlaySpec)) {
                const stampedBlob = await applyOverlaySpecToPdf(file, overlaySpec);
                fileToSend = new File([stampedBlob], file.name, { type: 'application/pdf' });
                console.log('✅ Campos estampados en PDF para workflow');
              }
            }
          } catch (err) {
            console.warn('⚠️ Error estampando campos para workflow, enviando PDF sin campos:', err);
            // Continuar sin campos estampados
          }
        }

        // Subir el PDF a Storage y obtener URL firmable
        const arrayBuffer = await fileToSend.arrayBuffer();
        const documentHash = await hashWitness(arrayBuffer);

        // Sanitize filename to prevent Storage errors
        const sanitizedWorkflowFilename = file.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9.-]/g, '_')
          .replace(/__+/g, '_');

        const storagePath = `${user.id}/${Date.now()}-${sanitizedWorkflowFilename}`;
        const { error: uploadError } = await supabase.storage
          .from('user-documents')
          .upload(storagePath, fileToSend, {
            contentType: fileToSend.type || 'application/pdf',
            upsert: false
          });

        if (uploadError) {
          console.error('Error subiendo archivo para workflow:', uploadError);
          showToast('No se pudo subir el archivo para enviar las invitaciones', { type: 'error' });
          setLoading(false);
          return;
        }

        // URL firmable (signed URL por 30 días)
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('user-documents')
          .createSignedUrl(storagePath, 60 * 60 * 24 * 30);

        if (signedUrlError || !signedUrlData?.signedUrl) {
          console.error('Error generando signed URL:', signedUrlError);
          showToast('No se pudo generar el enlace del documento', { type: 'error' });
          setLoading(false);
          return;
        }

        if (canonicalDocumentId) {
          try {
            // Subir backup cifrado a custody (no bloqueante)
            storeEncryptedCustody(
              fileToSend,
              canonicalDocumentId,
              'witness'
            ).catch(err => console.warn('Custody backup skipped:', err));

            // Usar el storagePath de user-documents para descarga (ya subido arriba)
            await ensureWitnessCurrent(canonicalDocumentId, {
              hash: documentHash,
              mime_type: 'application/pdf',
              storage_path: storagePath, // Path en user-documents (plaintext, descargable)
              status: 'generated'
            });

            if (canonicalSourceHash && file.type !== 'application/pdf') {
              await appendTransform(canonicalDocumentId, {
                from_mime: file.type,
                to_mime: 'application/pdf',
                from_hash: canonicalSourceHash,
                to_hash: documentHash,
                method: 'client',
                reason: 'visualization',
                executed_at: new Date().toISOString()
              });
            }

            await advanceLifecycle(canonicalDocumentId, 'witness_ready');
          } catch (err) {
            console.error('❌ Canonical witness preparation failed:', err);
            showToast('No se pudo preparar la copia fiel (PDF witness).', { type: 'error' });
            setLoading(false);
            return;
          }
        }

        // P1: Persisting workflow_fields is mandatory (source of truth for batch binding).
        if (!canonicalDocumentId) {
          showToast('No se pudo preparar el documento canónico para el flujo de firmas.', { type: 'error' });
          setLoading(false);
          return;
        }

        try {
          console.log('📋 Guardando campos de workflow en DB...');
          const savedFields = await saveWorkflowFields(
            signatureFields,
            canonicalDocumentId,
            workflowVirtualSize.width,
            workflowVirtualSize.height
          );
          console.log(`✅ ${savedFields.length} campos guardados en workflow_fields`);
        } catch (fieldsError) {
          console.error('❌ Error guardando workflow fields (bloqueante):', fieldsError);
          showToast('No se pudieron guardar los campos asignados. Intentá nuevamente.', { type: 'error' });
          setLoading(false);
          return;
        }

        // Iniciar workflow en backend (crea notificaciones y dispara send-pending-emails)
        try {
          // P2.1 - bloquear canvas para evitar mutaciones mientras se inicia el workflow
          setIsCanvasLocked(true);
          setCertifyProgress({ stage: 'preparing', message: 'Iniciando flujo de firma...' });
          const workflowResult = await withTimeout(startSignatureWorkflow({
            documentUrl: signedUrlData.signedUrl,
            documentHash,
            originalFilename: file.name,
            documentEntityId: canonicalDocumentId || undefined,
            signatureType: signatureType
              ? (signatureType === 'certified' ? 'SIGNNOW' : 'ECOSIGN')
              : undefined,
            ndaText: ndaEnabled ? (ndaSavedText ?? ndaText) : null,
            ndaEnabled,
            signers: validSigners,
            forensicConfig: {
              rfc3161: forensicEnabled && forensicConfig.useLegalTimestamp,
              polygon: forensicEnabled && forensicConfig.usePolygonAnchor,
              bitcoin: forensicEnabled && forensicConfig.useBitcoinAnchor
            }
          }), 60000, 'startSignatureWorkflow');

          console.log('✅ Workflow iniciado:', workflowResult);
          showToast(`Invitaciones enviadas a ${validSigners.length} firmante(s). Revisá tu email para el seguimiento.`, {
            type: 'success',
            duration: 6000
          });
        } catch (workflowError) {
          console.error('❌ Error al iniciar workflow:', workflowError);
          const errorMessage =
            workflowError instanceof Error
              ? workflowError.message
              : typeof workflowError === 'string'
              ? workflowError
              : 'No se pudo enviar las invitaciones. Verificá los datos e intentá de nuevo.';
          showToast(errorMessage, { type: 'error' });
          setLoading(false);
          return;
        }

        // Cerrar modal
        resetAndClose();
        onClose();
        setLoading(false);
        return;
      }

      // FLUJO 2: Firma Individual (Caso A) - Yo firmo ahora
      console.log('✍️ Caso A - Usuario logueado firma el documento');

      // Obtener datos de firma si está en modo canvas (ya aplicada al PDF)
      const signatureData: string | null = signatureMode === 'canvas' ? getSignatureData() : null;

      // ========================================
      // SPRINT 5: STAMPING DE OVERLAY_SPEC
      // ========================================
      // PASO 1: Convertir signatureFields + signaturePreview a overlay_spec
      let fileToProcess = file;

      const signatureOverlay =
        signaturePreview
          ? {
              x: signaturePlacement.x,
              y: signaturePlacement.y,
              width: signaturePlacement.width,
              height: signaturePlacement.height,
              page: 1,
              imageUrl: signaturePreview.type === 'image' ? signaturePreview.value : undefined,
              text: signaturePreview.type === 'text' ? signaturePreview.value : undefined
            }
          : null;

      const overlaySpec = convertToOverlaySpec(
        signatureFields,
        signatureOverlay,
        VIRTUAL_PAGE_WIDTH,
        VIRTUAL_PAGE_HEIGHT
      );

      if (overlaySpec.length > 0) {
        try {
          // SPRINT 5: Validar overlay_spec antes de aplicar
          const { validateOverlaySpec } = await import('../utils/overlaySpecConverter');
          if (!validateOverlaySpec(overlaySpec)) {
            console.error('❌ Overlay spec inválido:', overlaySpec);
            toast.error('Error en posicionamiento de firma/campos. Por favor reintentá.');
            setLoading(false);
            return;
          }

          console.log('✅ Overlay spec válido:', overlaySpec);

          setCertifyProgress({
            stage: 'preparing',
            message: 'Estampando firma y campos en PDF...'
          });

          const stampedBlob = await applyOverlaySpecToPdf(fileToProcess, overlaySpec);
          fileToProcess = new File([stampedBlob], file.name, { type: 'application/pdf' });

          console.log('✅ Stamping aplicado al PDF');

          // SPRINT 5: Agregar evento signature.applied al transform log
          if (canonicalDocumentId) {
            const stampedHash = await hashWitness(await fileToProcess.arrayBuffer());

            await appendTransform(canonicalDocumentId, {
              from_mime: 'application/pdf',
              to_mime: 'application/pdf',
              from_hash: canonicalSourceHash || stampedHash,
              to_hash: stampedHash,
              method: 'client',
              reason: 'visualization',  // Changed from 'signature_applied' which is not a valid enum value
              executed_at: new Date().toISOString(),
            });

            console.log('✅ Transform log: signature.applied registrado');
          }
        } catch (stampError) {
          console.error('❌ Error aplicando stamping:', stampError);
          toast.error('Error al estampar firma/campos en el PDF. Continuando sin stamping.', {
            position: 'bottom-right'
          });
          // Continuar sin stamping (fallback graceful)
          fileToProcess = file;
        }
      }
      // ========================================

      // Preparar archivo con Hoja de Auditoría (SOLO para Firma Legal)
      let witnessHash: string | null = null;
      let witnessStorageReady = false;

      // Solo agregar Hoja de Auditoría si es Firma Legal (NO para Firma Certificada)
      if (signatureType === 'legal') {
        // Obtener datos del usuario autenticado
        const { data: { user } } = await supabase.auth.getUser();
        const userName = user?.user_metadata?.full_name || user?.email || 'Usuario';
        const userEmail = user?.email || null;

        // Preparar datos forenses para la hoja de firmas
        const forensicData: ForensicData = {
          forensicEnabled: forensicEnabled,
          legalTimestamp: forensicEnabled && forensicConfig.useLegalTimestamp,
          polygonAnchor: forensicEnabled && forensicConfig.usePolygonAnchor,
          bitcoinAnchor: forensicEnabled && forensicConfig.useBitcoinAnchor,
          timestamp: new Date().toISOString(),
          // Datos del firmante (del perfil autenticado)
          signerName: userName,
          signerEmail: userEmail || undefined,
          signerCompany: (user?.user_metadata as any)?.company || undefined,
          signerJobTitle: (user?.user_metadata as any)?.job_title || undefined,
          // Metadata del documento
          documentName: file.name,
          documentSize: file.size,
        };

        // Agregar Hoja de Auditoría al PDF
        const pdfWithSheet = await addSignatureSheet(fileToProcess, signatureData, forensicData);
        fileToProcess = blobToFile(pdfWithSheet, file.name);
      }

      try {
        const witnessBytes = await fileToProcess.arrayBuffer();
        witnessHash = await hashWitness(witnessBytes);
        if (canonicalDocumentId) {
          // Obtener usuario para los paths de storage
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!currentUser) {
            throw new Error('Usuario no autenticado');
          }

          // 1. Subir versión SIN CIFRAR a user-documents (para descarga)
          // Sanitize filename to prevent Storage errors
          const sanitizedWitnessFilename = file.name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .replace(/__+/g, '_');

          const downloadPath = `${currentUser.id}/${Date.now()}-${sanitizedWitnessFilename}`;
          const { error: uploadError } = await supabase.storage
            .from('user-documents')
            .upload(downloadPath, fileToProcess, {
              contentType: 'application/pdf',
              upsert: false
            });

          if (uploadError) {
            throw new Error('WITNESS_UPLOAD_FAILED');
          } else {
            console.log('✅ Witness PDF uploaded to user-documents:', downloadPath);
            // NOTE: Do NOT update witness_current_storage_path here.
            // The canonical signed/... path will be set by apply-signer-signature function
            // after the signature is properly applied through the signing flow.
            witnessStorageReady = true;
          }

          // NOTE: Do NOT call ensureWitnessCurrent with mutable path.
          // The canonical witness will be set by apply-signer-signature function
          // after the signature is properly applied.

          // 2. Subir versión CIFRADA a custody (backup no bloqueante)
          storeEncryptedCustody(
            fileToProcess,
            canonicalDocumentId,
            'witness'
          ).catch(err => console.warn('Custody backup skipped:', err));

          if (canonicalSourceHash && file.type !== 'application/pdf') {
            await appendTransform(canonicalDocumentId, {
              from_mime: file.type,
              to_mime: 'application/pdf',
              from_hash: canonicalSourceHash,
              to_hash: witnessHash,
              method: 'client',
              reason: 'visualization',
              executed_at: new Date().toISOString()
            });
          }

          if (!witnessStorageReady) {
            throw new Error('INVARIANT_VIOLATION: witness path missing');
          }

          await advanceLifecycle(canonicalDocumentId, 'witness_ready');
        }
      } catch (err) {
        console.error('❌ Canonical witness preparation failed:', err);
        toast.error('No se pudo preparar la copia fiel (PDF witness).', {
          position: 'bottom-right'
        });
        setLoading(false);
        return;
      }

      // 1. Certificar con o sin SignNow según tipo de firma seleccionado
      type SignNowResult = {
        signed_pdf_base64?: string;
        signnow_document_id?: string;
        status?: string;
        [key: string]: unknown;
      };

      type CertifyResult = {
        ecoxBuffer?: ArrayBuffer | Uint8Array | null;
        ecoData?: unknown;
        fileName: string;
        [key: string]: unknown;
      };

      let certResult: CertifyResult;
      let signedPdfFromSignNow: File | null = null;
      let signNowResult: SignNowResult | null = null;

      // FASE 3.A: Update progress to timestamping (P0.5)
      setCertifyProgress({
        stage: 'timestamping',
        message: ''
      });

      // FASE 3.C: Timeout detection (P0.6)
      timeoutWarning = setTimeout(() => {
        setCertifyProgress(prev => ({
          ...prev,
          message: 'puede tardar'
        }));
      }, 5000); // Show warning after 5 seconds

      if (signatureType === 'certified') {
        // ✅ Usar SignNow API para firma legalizada (eIDAS, ESIGN, UETA)
        console.log('🔐 Usando SignNow API para firma legalizada');

        try {
          // Llamar a SignNow con la firma ya embebida
          // Obtener usuario autenticado
          const { data: { user } } = await supabase.auth.getUser();

          signNowResult = await signWithSignNow(fileToProcess, {
            documentName: fileToProcess.name,
            action: 'esignature',
            userEmail: user?.email || 'unknown@example.example.com',
            userName: user?.user_metadata?.full_name || user?.email || 'Usuario',
            signature: signatureData ? {
              image: signatureData,
              placement: {
                page: 1, // Última página (ya está en Hoja de Firmas)
                xPercent: 0.1,
                yPercent: 0.8,
                widthPercent: 0.3,
                heightPercent: 0.1
              }
            } : null,
            requireNdaEmbed: false,
            metadata: {
              forensicEnabled: forensicEnabled,
              useLegalTimestamp: forensicEnabled && forensicConfig.useLegalTimestamp,
              usePolygonAnchor: forensicEnabled && forensicConfig.usePolygonAnchor,
              useBitcoinAnchor: forensicEnabled && forensicConfig.useBitcoinAnchor
            }
          });

          console.log('✅ SignNow completado:', signNowResult);

          // Obtener el PDF firmado desde SignNow
          if (signNowResult?.signed_pdf_base64) {
            // Convertir base64 a File
            const signedBlob = base64ToBlob(signNowResult.signed_pdf_base64);
            signedPdfFromSignNow = blobToFile(signedBlob, fileToProcess.name);
          }

          // Usar el archivo firmado por SignNow para certificar
          certResult = await certifyFile(signedPdfFromSignNow || fileToProcess, {
            // TSA runs server-side via jobs (run-tsa)
            useLegalTimestamp: false,
            usePolygonAnchor: forensicEnabled && forensicConfig.usePolygonAnchor,
            useBitcoinAnchor: forensicEnabled && forensicConfig.useBitcoinAnchor,
            signatureData: null, // Ya está firmado por SignNow
            signNowDocumentId: signNowResult?.signnow_document_id
          });

        } catch (signNowError) {
          console.error('❌ Error con SignNow:', signNowError);
          const signNowMsg =
            signNowError instanceof Error
              ? signNowError.message
              : typeof signNowError === 'string'
              ? signNowError
              : 'Error desconocido con SignNow';

          showToast(`Error al procesar firma legal con SignNow: ${signNowMsg}. Se usará firma estándar.`, {
            type: 'error',
            duration: 6000
          });

          // Fallback a firma estándar
          certResult = await certifyFile(fileToProcess, {
            // TSA runs server-side via jobs (run-tsa)
            useLegalTimestamp: false,
            usePolygonAnchor: forensicEnabled && forensicConfig.usePolygonAnchor,
            useBitcoinAnchor: forensicEnabled && forensicConfig.useBitcoinAnchor,
            signatureData: signatureData
          });
        }
      } else {
        // ✅ Usar motor interno (Firma Legal)
        console.log('📝 Usando motor interno de Firma Legal');
        certResult = await certifyFile(fileToProcess, {
          // TSA runs server-side via jobs (run-tsa)
          useLegalTimestamp: false,
          usePolygonAnchor: forensicEnabled && forensicConfig.usePolygonAnchor,
          useBitcoinAnchor: forensicEnabled && forensicConfig.useBitcoinAnchor,
          signatureData: signatureData
        });
      }

      // FASE 3.C: Clear timeout warning (P0.6)
      clearTimeout(timeoutWarning);

      // TSA evidence is appended asynchronously by the server-side job pipeline.

      // 2. Guardar en Supabase (guardar el PDF procesado, no el original)
      // Status inicial: 'signed' si ya se firmó, 'draft' si no hay firmantes
      const initialStatus = (signatureType === 'legal' || signatureType === 'certified') ? 'signed' : 'draft';
      const overallStatus = initialStatus === 'signed' ? 'certified' : initialStatus;

      let signedStoragePath: string | null = null;
      let signedHash: string | null = null;
      try {
        const signedFileForCanon = signedPdfFromSignNow || fileToProcess;
        const signedBytes = await signedFileForCanon.arrayBuffer();
        signedHash = await hashSigned(signedBytes);
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
          throw new Error(authError?.message || 'Usuario no autenticado');
        }
        const { storagePath } = await persistSignedPdfToStorage(signedBytes, authUser.id);
        signedStoragePath = storagePath;

        // Mi Firma (flujo individual) no pasa por apply-signer-signature, por lo que
        // debemos fijar explícitamente el witness_current_* al artefacto final canónico.
        if (canonicalDocumentId && signedStoragePath) {
          await ensureWitnessCurrent(canonicalDocumentId, {
            hash: signedHash,
            mime_type: 'application/pdf',
            storage_path: signedStoragePath,
            status: 'signed'
          });
        }
      } catch (err) {
        console.warn('Canonical signed persistence skipped:', err);
      }

      // FASE 3.A: Update progress to generating certificate (P0.5)
      setCertifyProgress({
        stage: 'generating',
        message: ''
      });

      let ecoData = certResult.ecoData;
      let ecoPayloadBuffer = certResult?.ecoxBuffer ?? null;
      let ecoPayloadFileData = certResult?.ecoxBuffer ?? null;
      let ecoPayloadFileName = certResult?.fileName
        ? certResult.fileName.replace(/\.[^/.]+$/, '.eco')
        : file.name.replace(/\.[^/.]+$/, '.eco');

      if (canonicalDocumentId) {
        try {
          const { eco, json } = await emitEcoVNext(canonicalDocumentId);
          const encoded = new TextEncoder().encode(json);
          ecoData = eco;
          ecoPayloadBuffer = encoded;
          ecoPayloadFileData = encoded;
        } catch (err) {
          console.warn('Canonical ECO v2 generation skipped:', err);
        }
      }

      // ✅ REFACTOR: Blockchain anchors no bloquean certificación
      // Los anchors se marcan como 'pending' y se resuelven async
      const savedDoc = await saveUserDocument(fileToProcess, ecoData, {
        documentEntityId: canonicalDocumentId,
        hasLegalTimestamp: forensicEnabled && forensicConfig.useLegalTimestamp,
        hasPolygonAnchor: forensicEnabled && forensicConfig.usePolygonAnchor,
        hasBitcoinAnchor: forensicEnabled && forensicConfig.useBitcoinAnchor,
        initialStatus: initialStatus,
        overallStatus,
        downloadEnabled: true, // ✅ Siempre true - .eco disponible inmediatamente
        ecoBuffer: ecoPayloadBuffer,
        ecoFileData: ecoPayloadFileData, // ✅ Guardar buffer ECO para deferred download
        ecoFileName: ecoPayloadFileName,
        signNowDocumentId: signNowResult?.signnow_document_id || null,
        signNowStatus: signNowResult?.status || null,
        signedAt: signNowResult ? new Date().toISOString() : null,
        storePdf: true, // ✅ Guardar PDF cifrado para permitir compartir
        zeroKnowledgeOptOut: false // ✅ E2E encryption: guardar cifrado, no plaintext
      });

      if (canonicalDocumentId && signedHash && witnessHash) {
        try {
          const signedAuthority = signNowResult ? 'external' : 'internal';
          const signedAuthorityRef = signNowResult
            ? { id: 'signnow', type: 'provider' }
            : null;

          await appendTransform(canonicalDocumentId, {
            from_mime: 'application/pdf',
            to_mime: 'application/pdf',
            from_hash: witnessHash,
            to_hash: signedHash,
            method: 'client',
            reason: 'signature',
            executed_at: new Date().toISOString()
          });

          await ensureSigned(canonicalDocumentId, signedHash, signedAuthority, signedAuthorityRef);
        } catch (err) {
          console.warn('Canonical signed update skipped:', err);
        }
      }

      if (savedDoc) {
        window.dispatchEvent(new CustomEvent('ecosign:document-created', { detail: savedDoc }));

        // Track analytics
        trackEvent('cert_completed', {
          documentId: savedDoc.id,
          hasSignature: !!signatureType,
          signatureType: signatureType || 'none',
          forensicEnabled: forensicEnabled,
          fileSize: file.size,
          fileType: file.type
        });

        // === PROBATORY EVENT: document.protected.requested ===
        // Canonical ledger write: if this fails, the document is NOT protected.
        const useProtectV2 = String(import.meta.env.VITE_USE_PROTECT_V2 ?? 'true').toLowerCase() === 'true';
        if (forensicEnabled) {
          const { data, error } = await supabase.functions.invoke('record-protection-event', {
            body: {
              document_id: savedDoc.id,
              flow_version: useProtectV2 ? 'v2' : 'v1',
              protection_details: {
                signature_type: signatureType || 'none',
                forensic_enabled: forensicEnabled,
                tsa_requested: forensicEnabled && forensicConfig.useLegalTimestamp,
                polygon_requested: forensicEnabled && forensicConfig.usePolygonAnchor,
                bitcoin_requested: forensicEnabled && forensicConfig.useBitcoinAnchor
              }
            }
          });

	          if (error) {
	            throw new Error(`record-protection-event failed: ${error.message}`);
	          }
	          console.log('✅ protection events recorded:', data);

	          try {
	            const entityId = String((data as any)?.document_entity_id ?? '');
	            if (entityId) {
	              window.dispatchEvent(new CustomEvent('ecosign:protection-requested', { detail: { document_entity_id: entityId } }));
	            }
	          } catch {
	            // ignore
	          }
	        }
	      }

      // 3. Registrar evento 'created' (ChainLog)
      if (savedDoc?.id) {
        const userId = typeof savedDoc.user_id === 'string' ? savedDoc.user_id : String(savedDoc.user_id || '');
        await EventHelpers.logDocumentCreated(
          savedDoc.id,
          userId,
          {
            filename: file.name,
            fileSize: file.size,
            fileType: file.type,
            signatureType: signatureType || 'none',
            forensicEnabled: forensicEnabled,
            polygonAnchor: forensicEnabled && forensicConfig.usePolygonAnchor,
            bitcoinAnchor: forensicEnabled && forensicConfig.useBitcoinAnchor,
            legalTimestamp: forensicEnabled && forensicConfig.useLegalTimestamp
          }
        );
      }

      // ✅ ARCHITECTURE: Blockchain anchoring ahora es 100% server-side
      // - Polygon: process-polygon-anchors worker (cron 30s) detecta polygon_status='pending'
      // - Bitcoin: process-bitcoin-anchors worker (cron 1h) detecta bitcoin_status='pending'
      // - Workers llaman upgrade_protection_level() tras confirmación
      // - UI refleja cambios vía realtime subscription (líneas 318-376)
      // - NO más triggers frontend - confiabilidad server-side garantizada

      // 4. Enviar notificación por email (no bloqueante)
      if (savedDoc?.id && !hasWorkflowIntent) {
        console.log('📧 Enviando notificación por email...');
        supabase.functions.invoke('notify-document-certified', {
          body: { documentId: savedDoc.id }
        }).then(({ data, error }) => {
          if (error) {
            console.warn('⚠️ Error al enviar email (no crítico):', error);
          } else {
            console.log('✅ Email de notificación enviado:', data);
          }
        }).catch(err => {
          console.warn('⚠️ No se pudo enviar email:', err);
        });
      }

      // 5. Preparar datos para download (PDF firmado + archivo .ECO)
      // ✅ .eco disponible inmediatamente - workers procesan anchors en background
      const rawEcoBuffer = certResult.ecoxBuffer ?? new Uint8Array();
      const ecoBuffer: Uint8Array = rawEcoBuffer instanceof Uint8Array
        ? rawEcoBuffer
        : rawEcoBuffer instanceof ArrayBuffer
        ? new Uint8Array(rawEcoBuffer)
        : new Uint8Array();
      const ecoFileName = (certResult.fileName || 'document.pdf').replace(/\.[^/.]+$/, '.eco');
      setCertificateData({
        ...certResult,
        // URL para descargar el PDF firmado con audit trail
        signedPdfUrl: URL.createObjectURL(fileToProcess),
        signedPdfName: fileToProcess.name.replace(/\.pdf$/i, '_signed.pdf'),
        // URL para descargar el archivo .ECO (siempre disponible)
        ecoDownloadUrl: URL.createObjectURL(new Blob([ecoBuffer.slice().buffer], { type: 'application/octet-stream' })),
        ecoFileName,
        fileName: certResult.fileName || fileToProcess.name,
        documentId: savedDoc?.id,
        downloadEnabled: true, // ✅ Siempre true
        protectionLevel: `${savedDoc?.protection_level || 'ACTIVE'}`
      });

      // CONSTITUCIÓN: Toast de finalización exitosa (líneas 499-521)
      const hasFirma = signatureType === 'legal' || signatureType === 'certified';
      let successMessage = 'Documento protegido correctamente.';

      if (hasFirma) {
        successMessage = 'Documento firmado y protegido correctamente.';
      }

      showToast(successMessage, {
        type: 'success',
        duration: 3000,
        position: 'top-right'
      });

      // Ejecutar animación y cerrar (ya no hay Step 2)
      playFinalizeAnimation();

      // Pequeño delay para que se vea la animación antes de cerrar
      setTimeout(() => {
        resetAndClose();
        if (onClose) onClose();
      }, 100);
    } catch (error) {
      console.error('Error al certificar:', error);

      // FASE 3.C: Clear timeout on error (P0.6)
      if (timeoutWarning) {
        clearTimeout(timeoutWarning);
      }

      // FASE 3.B: Human-friendly error handling (P0.4, P0.7)
      const humanError = translateError(error);
      const workSaved = certifyProgress.stage ? determineIfWorkSaved(certifyProgress.stage) : false;

      // Show error in progress modal with translated message and work saved status
      setCertifyProgress({
        stage: certifyProgress.stage || 'preparing', // Preserve stage for context
        message: '',
        error: humanError,
        workSaved: workSaved
      });

      // Note: Error display now handled by CertifyProgress component
      // which will show error, work saved status, and retry button (FASE 3.C)
    } finally {
      if (watchdog) clearTimeout(watchdog);
      setLoading(false);
      // Note: Don't reset certifyProgress here if there's an error
      // The modal needs to stay visible to show the error state
    }
  };

  const resetAndClose = () => {
    // BLOQUE 1: Verificar protección antes de cerrar
    if (!forensicEnabled && documentLoaded) {
      setShowUnprotectedWarning(true);
      return;
    }

    console.log('🔒 Cerrando Centro Legal...');
    setStep(1);
    setFile(null);
    setPreviewError(false);
    setCertificateData(null);

    // FASE 3.B: Reset certify progress state
    setCertifyProgress({
      stage: null,
      message: '',
      error: undefined,
      workSaved: undefined
    });
    setSignatureMode('none');
    setEmailInputs([
      { email: '', name: '', requireLogin: true, requireNda: true }
    ]); // Reset a 1 campo vacío
    setForensicEnabled(true); // Reset a true (activo por defecto)
    setDocumentPreview(null);
    setPreviewMode('compact');
    setShowSignatureOnPreview(false);
    setAnnotationMode(null);
    setAnnotations([]);

    // Reset acciones
    setMySignature(false);
    setWorkflowEnabled(false);
    setNdaEnabled(false);

    // Reset de firma digital
    setSignatureType(null);
    setShowCertifiedModal(false);
    setCertifiedSubType(null);
    setUserHasSignature(false);

    // Reset de confirmación de modo
    setModeConfirmation('');

    // Reset de tabs de firma
    setSignatureTab('draw');
    setTypedSignature('');
    setUploadedSignature(null);

    clearCanvas();

    console.log('✅ Estados reseteados, llamando onClose()');
    if (typeof onClose === 'function') {
      onClose();
    } else {
      console.error('❌ onClose no es una función:', onClose);
    }
  };

  const playFinalizeAnimation = () => {
    try {
      console.log('🎬 Iniciando animación de documento volando...');
      const buttonEl = finalizeButtonRef.current;
      const targetEl =
        document.querySelector<HTMLAnchorElement>('a[href="/documentos"]') ||
        document.querySelector<HTMLAnchorElement>('a[href="/dashboard/documents"]');

      console.log('🎯 Elementos de animación:', {
        buttonEl: !!buttonEl,
        targetEl: !!targetEl,
        targetHref: targetEl?.getAttribute('href')
      });

      if (!buttonEl || !targetEl) {
        console.warn('⚠️ No se puede ejecutar animación: falta buttonEl o targetEl');
        return;
      }

      const startRect = buttonEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      if (targetRect.width === 0 && targetRect.height === 0) return;

      const startX = startRect.left + startRect.width / 2;
      const startY = startRect.top + startRect.height / 2;
      const targetX = targetRect.left + targetRect.width / 2;
      const targetY = targetRect.top + targetRect.height / 2;

      const ghost = document.createElement('div');
      ghost.innerHTML = `
        <svg viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
          <path fill="#111827" d="M22 0H6a2 2 0 0 0-2 2v36a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V10z"/>
          <path fill="#1f2937" d="M22 0v8a2 2 0 0 0 2 2h8z"/>
          <path fill="#f3f4f6" d="M10 14h12v2H10zm0 6h12v2H10zm0 6h8v2h-8z"/>
        </svg>
      `;
      ghost.style.position = 'fixed';
      ghost.style.left = `${startX}px`;
      ghost.style.top = `${startY}px`;
      ghost.style.transform = 'translate(-50%, -50%)';
      ghost.style.width = '32px';
      ghost.style.height = '40px';
      ghost.style.zIndex = '9999';
      ghost.style.pointerEvents = 'none';
      document.body.appendChild(ghost);

      console.log('✨ Elemento ghost creado, iniciando animación...');

      const duration = 850;
      const startTime = performance.now();

      const animate = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);

        const currentX = startX + (targetX - startX) * easeOut;
        const currentY = startY + (targetY - startY) * easeOut;
        const scale = 1 - 0.35 * easeOut;
        const opacity = 1 - 0.85 * easeOut;

        ghost.style.left = `${currentX}px`;
        ghost.style.top = `${currentY}px`;
        ghost.style.transform = `translate(-50%, -50%) scale(${scale})`;
        ghost.style.opacity = `${Math.max(opacity, 0)}`;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          console.log('🎉 Animación completada, removiendo ghost');
          ghost.remove();
        }
      };

      requestAnimationFrame(animate);
    } catch (error) {
      console.warn('⚠️ Animación de cierre no disponible:', error);
    }
  };

  const handleFinalizeClick = async () => {
    // CONSTITUCIÓN: Validaciones según estado
    if (!isCTAEnabled()) {
      // Determinar qué falta y mostrar toast específico
      if (mySignature && !signatureType) {
        toast.error('Elegí el tipo de firma para continuar.', {
          position: 'bottom-right'
        });
        return;
      }
      if (workflowEnabled && !emailInputs.some(e => e.email.trim())) {
        toast.error('Agregá al menos un correo para continuar.', {
          position: 'bottom-right'
        });
        return;
      }
      if (workflowEnabled && signatureFields.length === 0) {
        toast.error('Asigná los campos a los firmantes antes de enviar.', {
          position: 'bottom-right'
        });
        openSignerFieldsWizard();
        return;
      }
      if (workflowEnabled && !workflowAssignmentConfirmed) {
        toast.error('Necesitás aceptar la asignación de campos. Tocá "Asignar campos".', {
          position: 'bottom-right'
        });
        return;
      }
      return;
    }

    // Ejecutar acciones seleccionadas
    if (file && downloadPdfChecked) {
      // Preferir el PDF firmado si ya existe
      const sourceUrl = certificateData?.signedPdfUrl || URL.createObjectURL(file);
      const fileName = certificateData?.signedPdfName || file.name;

      // Fuerza descarga binaria para evitar previews agresivos
      let downloadUrl = sourceUrl;
      try {
        const blob = await fetch(sourceUrl).then((res) => res.blob());
        const arrayBuffer = await blob.arrayBuffer();
        const binaryBlob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
        downloadUrl = URL.createObjectURL(binaryBlob);
      } catch (err) {
        console.warn('Fallback a descarga directa:', err);
      }

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      link.target = '_self'; // evita nueva pestaña
      link.rel = 'noopener';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        if (!certificateData?.signedPdfUrl) {
          URL.revokeObjectURL(sourceUrl);
        }
        URL.revokeObjectURL(downloadUrl);
      }, 120);
      setTimeout(() => {
        window.focus();
        document.body?.focus?.();
      }, 100); // mantener foco en la app
    }

    if (savePdfChecked && certificateData?.documentId) {
      const saved = await persistPdfToStorage(certificateData.documentId);
      if (!saved) {
        return;
      }
    }

    // Guardar documento (si procede) — reutilizamos handleCertify si había archivo y aún no se guardó
    if (file && savePdfChecked && !certificateData) {
      try {
        await handleCertify();
      } catch (err) {
        console.error('Error guardando documento antes de finalizar:', err);
      }
    }

    // Animación + cierre + navegación
    playFinalizeAnimation();
    resetAndClose();
    if (onClose) onClose();
  };

  const persistPdfToStorage = async (documentId: string): Promise<boolean> => {
    try {
      const supabase = getSupabase();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        showToast('Necesitás iniciar sesión para guardar el PDF.', { type: 'error' });
        return false;
      }

      const { data: existingDoc, error: existingError } = await supabase
        .from('user_documents')
        .select('pdf_storage_path')
        .eq('id', documentId)
        .single();

      if (existingError) {
        console.warn('Error verificando PDF guardado:', existingError);
      }

      if (existingDoc?.pdf_storage_path) {
        setCertificateData(prev => prev ? ({
          ...prev,
          pdfStoragePath: existingDoc.pdf_storage_path
        }) : prev);
        return true;
      }

      let pdfFile: File | null = null;
      if (certificateData?.signedPdfUrl) {
        const response = await fetch(certificateData.signedPdfUrl);
        const blob = await response.blob();
        pdfFile = new File([blob], certificateData.signedPdfName || file?.name || 'documento.pdf', {
          type: blob.type || 'application/pdf'
        });
      } else if (file) {
        pdfFile = file;
      }

      if (!pdfFile) {
        showToast('No se pudo recuperar el PDF para guardarlo.', { type: 'error' });
        return false;
      }

      // Sanitize filename: remove special characters (accents, etc) that break Storage
      const sanitizedFilename = pdfFile.name
        .normalize('NFD') // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
        .replace(/__+/g, '_'); // Collapse multiple underscores

      const storagePath = `${user.id}/${Date.now()}-${sanitizedFilename}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(storagePath, pdfFile, {
          contentType: pdfFile.type || 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        console.error('Error subiendo PDF:', uploadError);
        showToast(`No se pudo guardar el PDF: ${uploadError.message}`, { type: 'error' });
        return false;
      }

      const finalPath = uploadData?.path || storagePath;
      const { error: updateError } = await supabase
        .from('user_documents')
        .update({
          pdf_storage_path: finalPath,
          zero_knowledge_opt_out: false,
          last_event_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (updateError) {
        console.error('Error actualizando pdf_storage_path:', updateError);
        showToast('No se pudo actualizar el documento guardado.', { type: 'error' });
        return false;
      }

      setCertificateData(prev => prev ? ({
        ...prev,
        pdfStoragePath: finalPath
      }) : prev);
      window.dispatchEvent(new CustomEvent('ecosign:document-updated', {
        detail: { id: documentId, pdf_storage_path: finalPath }
      }));
      return true;
    } catch (error) {
      console.error('Error guardando PDF:', error);
      showToast('No se pudo guardar el PDF. Intentá nuevamente.', { type: 'error' });
      return false;
    }
  };

  // ===== FUNCIONES HELPER (CONSTITUCIÓN: Funciones puras del estado) =====
  
  /**
   * Obtiene el texto del CTA según el estado actual
   * CONSTITUCIÓN: Certificación ("Proteger") siempre presente
   */
  const getCTAText = () => {
    const actions = ['Proteger']; // Siempre presente (certificación default)

    if (mySignature && signatureFields.length > 0 && signatureType) {
      actions.push('firmar');
    }

    // Solo prometer envío si el flujo está estructuralmente confirmado.
    if (workflowEnabled && workflowAssignmentConfirmed && emailInputs.some(e => isValidEmail(e.email.trim()).valid)) {
      actions.push('enviar mails');
    }

    // Gramática correcta: usar comas para 3+ acciones
    if (actions.length === 1) return actions[0];
    if (actions.length === 2) return actions.join(' y ');
    // 3 o más: "Proteger, firmar y enviar mails"
    return actions.slice(0, -1).join(', ') + ' y ' + actions[actions.length - 1];
  };
  
  /**
   * Determina si el CTA debe estar activo
   * CONSTITUCIÓN:
   * - Solo certificar → siempre activo
   * - Mi Firma → requiere firma aplicada + tipo elegido
   * - Flujo → requiere ≥1 mail válido (con formato correcto)
   */
  const isCTAEnabled = () => {
    // Solo certificar: siempre activo
    if (!mySignature && !workflowEnabled && !ndaEnabled) return true;

    // Si "Mi Firma" activa: debe tener firma Y tipo elegido
    if (mySignature) {
      if (signatureFields.length === 0) return false;
      if (!signatureType) return false;
    }

    // Si "Flujo" activo: debe tener ≥1 mail VÁLIDO, ≥1 campo, y confirmación explícita.
    if (workflowEnabled) {
      if (!emailInputs.some(e => isValidEmail(e.email.trim()).valid)) return false;
      if (signatureFields.length === 0) return false;
      if (!workflowAssignmentConfirmed) return false;
    }

    // NDA: requiere NDA guardado explícitamente
    if (ndaEnabled) {
      const trimmed = ndaText.trim();
      if (!trimmed || trimmed === NDA_COPY.EMPTY_MESSAGE.trim()) return false;
      if (!ndaDefined || ndaDirty) return false;
    }

    return true;
  };

  const signerCount = emailInputs.filter((input) => input.email.trim()).length;
  const hasWorkflowEmails = emailInputs.some((input) => isValidEmail(input.email.trim()).valid);
  const canAssignWorkflowFields = workflowEnabled && hasWorkflowEmails && !workflowAssignmentConfirmed;
  const hasUnsavedContent = Boolean(
    file ||
    documentLoaded ||
    signatureFields.length > 0 ||
    emailInputs.some((input) => input.email.trim().length > 0) ||
    ndaDirty ||
    (ndaText.trim().length > 0 && ndaText.trim() !== NDA_COPY.EMPTY_MESSAGE.trim()) ||
    mySignature ||
    workflowEnabled ||
    ndaEnabled
  );

  const handleBackdropClose = () => {
    if (showCloseConfirmModal) return;

    if (!hasUnsavedContent) {
      resetAndClose();
      return;
    }

    setShowCloseConfirmModal(true);
  };

  const handleDismissCloseConfirm = () => {
    setShowCloseConfirmModal(false);
  };

  const handleCloseWithoutSave = () => {
    setShowCloseConfirmModal(false);
    resetAndClose();
  };

  const handleSaveDraftAndClose = async () => {
    if (!file) {
      showToast('Seleccioná un archivo antes de guardar el borrador.', { type: 'error' });
      return;
    }
    setShowCloseConfirmModal(false);
    await handleSaveDraft();
  };

  useEffect(() => {
    if (!showCloseConfirmModal) return;
    setCloseConfirmSelection(file ? 'save' : 'discard');
  }, [showCloseConfirmModal, file]);

  useEffect(() => {
    if (!isMobile) return;
    if (ndaEnabled) {
      setNdaAccordionOpen(true);
    } else {
      setNdaAccordionOpen(false);
    }
  }, [isMobile, ndaEnabled]);

  useEffect(() => {
    if (!isMobile) return;
    if (workflowEnabled) {
      setWorkflowAccordionOpen(true);
    } else {
      setWorkflowAccordionOpen(false);
      workflowAutoCollapsed.current = false;
    }
  }, [isMobile, workflowEnabled]);

  useEffect(() => {
    if (!isMobile || !workflowEnabled) return;
    if (workflowAutoCollapsed.current) return;
    if (signerCount > 0 && workflowAccordionOpen) {
      setWorkflowAccordionOpen(false);
      workflowAutoCollapsed.current = true;
    }
  }, [isMobile, workflowEnabled, signerCount, workflowAccordionOpen]);

  useEffect(() => {
    if (isMobile && previewMode === 'expanded') {
      setPreviewMode('compact');
    }
    if (!isMobile && previewMode === 'fullscreen') {
      setPreviewMode('compact');
    }
  }, [isMobile, previewMode]);

  // ===== GRID LAYOUT =====
  // PASO 3.3: Usar helper de orquestación
  // Calcular escena activa para SceneRenderer (FASE 1 - sin efectos colaterales)
  const scene = resolveActiveScene({
    hasFile: !!file,
    ndaEnabled,
    mySignatureEnabled: mySignature,
    workflowEnabled,
    isReviewStep: step !== 1
  });

  // DESACTIVADO: Este es el "cerebro" del modelo de compresión
  // Cuando USE_NEW_STAGE=true, el layout NO reacciona a los paneles
  const gridTemplateColumns = USE_NEW_STAGE
    ? '1fr' // Dummy value (grid desactivado)
    : resolveGridColumns({
        ndaEnabled,
        rightPanelOpen: workflowEnabled,
        isMobile
      });
  const isPreviewFullscreen = isMobile && previewMode === 'fullscreen';
  const isFocusMode = focusView !== null;
  const isDocumentFocus = focusView === 'document';
  const isViewerLocked = true;
  const activePreviewUrl = workflowPreviewUrl ?? documentPreview;
  const activePreviewPdfData = workflowPreviewPdfData ?? documentPreviewPdfData;
  const isPdfPreview = file?.type === 'application/pdf';
  const usePdfEditMode = isPdfPreview && (!pdfEditError || Boolean(activePreviewPdfData));

  const createFieldId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `field-${Date.now()}`);
  const VIRTUAL_PAGE_WIDTH = 1000;
  const detectedVirtualHeight =
    pdfPageMetrics.length > 0 ? pdfPageMetrics[pdfPageMetrics.length - 1].height : 1414;
  const VIRTUAL_PAGE_HEIGHT = Math.round(detectedVirtualHeight || 1414);

  const detectedPageLabel = (() => {
    const ratio = VIRTUAL_PAGE_HEIGHT / VIRTUAL_PAGE_WIDTH;
    if (Math.abs(ratio - 842 / 595) < 0.04) return 'A4';
    if (Math.abs(ratio - 1008 / 612) < 0.05) return 'Oficio';
    return 'Personalizado';
  })();

  useEffect(() => {
    if (signatureFields.length === 0) {
      setWorkflowVirtualSize({ width: VIRTUAL_PAGE_WIDTH, height: VIRTUAL_PAGE_HEIGHT });
      setWorkflowPageSizeMode('document');
    }
  }, [VIRTUAL_PAGE_HEIGHT, VIRTUAL_PAGE_WIDTH, signatureFields.length]);

  const handleSaveDraft = async () => {
    setHeaderMenuOpen(false);
    if (!file) {
      showToast('Seleccioná un archivo antes de guardar el borrador.', { type: 'error' });
      return;
    }

    try {
      const overlaySpec = signatureFields.length > 0
        ? convertToOverlaySpec(signatureFields, null, VIRTUAL_PAGE_WIDTH, VIRTUAL_PAGE_HEIGHT, 'owner')
        : [];
      const signaturePreviewValue = signaturePreview?.value;

      const draftState = {
        ndaEnabled,
        ndaText,
        mySignature,
        signatureType,
        workflowEnabled,
        emailInputs,
        signatureFields,
        signaturePreview,
        custodyModeChoice,
        forensicEnabled,
        forensicConfig,
      };

      await saveDraftOperation(
        { name: file.name },
        [file],
        custodyModeChoice,
        overlaySpec,
        signaturePreviewValue,
        ndaEnabled,
        draftState
      );

      showToast('Borrador guardado.', { type: 'success', duration: 2000 });
      window.dispatchEvent(new Event('ecosign:draft-saved'));
      resetAndClose();
    } catch (error) {
      console.error('Error saving draft:', error);
      showToast('No se pudo guardar el borrador.', { type: 'error' });
    }
  };

  const getPageScale = () => ({ scaleX: virtualScale, scaleY: virtualScale });

  const resolveFieldRect = (field: SignatureField) => {
    const { scaleX, scaleY } = getPageScale();
    return {
      left: field.x * scaleX,
      top: field.y * scaleY,
      width: field.width * scaleX,
      height: field.height * scaleY
    };
  };

  const maybeAutoScroll = (clientY: number) => {
    const container = pdfScrollRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const threshold = 40;
    const speed = 16;
    if (clientY < rect.top + threshold) {
      container.scrollTop = Math.max(0, container.scrollTop - speed);
    } else if (clientY > rect.bottom - threshold) {
      container.scrollTop = Math.min(container.scrollHeight, container.scrollTop + speed);
    }
  };

  const updateFieldDragPosition = (clientX: number, clientY: number) => {
    if (!fieldDragRef.current) return;
    const { id, startX, startY, originX, originY, page, width, height } = fieldDragRef.current;
    const scrollContainer = pdfScrollRef.current;
    const container = scrollContainer?.getBoundingClientRect();
    if (!container) return;
    const currentX = clientX - container.left + (scrollContainer?.scrollLeft ?? 0);
    const currentY = clientY - container.top + (scrollContainer?.scrollTop ?? 0);
    const startLocalX = startX - container.left + (scrollContainer?.scrollLeft ?? 0);
    const startLocalY = startY - container.top + (scrollContainer?.scrollTop ?? 0);
    const dxPx = currentX - startLocalX;
    const dyPx = currentY - startLocalY;
    const { scaleX, scaleY } = getPageScale();
    const dx = dxPx / scaleX;
    const dy = dyPx / scaleY;
    maybeAutoScroll(clientY);
    setSignatureFields((prev) =>
      prev.map((field) =>
        field.id === id
          ? {
              ...field,
              x: Math.min(Math.max(0, originX + dx), VIRTUAL_PAGE_WIDTH - width),
              y: Math.min(Math.max(0, originY + dy), VIRTUAL_PAGE_HEIGHT - height),
              width,
              height
            }
          : field
      )
    );
  };

  const updateGroupDragPosition = (clientX: number, clientY: number) => {
    if (!groupDragRef.current) return;
    const { startX, startY, batchId, originById } = groupDragRef.current;

    const scrollContainer = pdfScrollRef.current;
    const container = scrollContainer?.getBoundingClientRect();
    if (!container) return;

    const currentX = clientX - container.left + (scrollContainer?.scrollLeft ?? 0);
    const currentY = clientY - container.top + (scrollContainer?.scrollTop ?? 0);
    const startLocalX = startX - container.left + (scrollContainer?.scrollLeft ?? 0);
    const startLocalY = startY - container.top + (scrollContainer?.scrollTop ?? 0);
    const dxPx = currentX - startLocalX;
    const dyPx = currentY - startLocalY;
    const { scaleX, scaleY } = getPageScale();
    const dx = dxPx / scaleX;
    const dy = dyPx / scaleY;

    maybeAutoScroll(clientY);

    setSignatureFields((prev) =>
      prev.map((field) => {
        const bid = field.batchId || field.id;
        if (bid !== batchId) return field;
        const origin = originById[field.id];
        if (!origin) return field;
        const nextX = Math.min(Math.max(0, origin.x + dx), VIRTUAL_PAGE_WIDTH - origin.width);
        const nextY = Math.min(Math.max(0, origin.y + dy), VIRTUAL_PAGE_HEIGHT - origin.height);
        return {
          ...field,
          x: nextX,
          y: nextY,
          width: origin.width,
          height: origin.height
        };
      })
    );
  };

  const updateFieldResize = (clientX: number, clientY: number) => {
    if (!fieldResizeRef.current) return;
    const { id, startX, startY, originWidth, originHeight } = fieldResizeRef.current;
    const container = previewContainerRef.current?.getBoundingClientRect();
    if (!container) return;
    const dxPx = clientX - startX;
    const dyPx = clientY - startY;
    const { scaleX, scaleY } = getPageScale();
    const dx = dxPx / scaleX;
    const dy = dyPx / scaleY;
    const minWidth = 80;
    const minHeight = 28;
    setSignatureFields((prev) =>
      prev.map((field) =>
        field.id === id
          ? {
              ...field,
              width: Math.max(minWidth, originWidth + dx),
              height: Math.max(minHeight, originHeight + dy)
            }
          : field
      )
    );
  };

  const stopFieldDrag = () => {
    const current = fieldDragRef.current;
    if (current) {
      setSignatureFields((prev) =>
        prev.map((field) =>
          field.id === current.id
            ? {
                ...field,
                metadata: {
                  ...field.metadata,
                  normalized: {
                    x: field.x / VIRTUAL_PAGE_WIDTH,
                    y: field.y / VIRTUAL_PAGE_HEIGHT,
                    width: field.width / VIRTUAL_PAGE_WIDTH,
                    height: field.height / VIRTUAL_PAGE_HEIGHT
                  }
                }
              }
            : field
        )
      );
    }
    fieldDragRef.current = null;
    setIsFieldDragging(false);
  };

  const stopGroupDrag = () => {
    const current = groupDragRef.current;
    if (current) {
      const batchId = current.batchId;
      setSignatureFields((prev) =>
        prev.map((field) => {
          const bid = field.batchId || field.id;
          if (bid !== batchId) return field;
          return {
            ...field,
            metadata: {
              ...field.metadata,
              normalized: {
                x: field.x / VIRTUAL_PAGE_WIDTH,
                y: field.y / VIRTUAL_PAGE_HEIGHT,
                width: field.width / VIRTUAL_PAGE_WIDTH,
                height: field.height / VIRTUAL_PAGE_HEIGHT
              }
            }
          };
        })
      );
    }
    groupDragRef.current = null;
    setIsGroupDragging(false);
  };

  const startGlobalDragListeners = () => {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
  };

  const stopGlobalDragListeners = () => {
    window.removeEventListener('mousemove', handleGlobalMouseMove);
    window.removeEventListener('mouseup', handleGlobalMouseUp);
  };

  const handleGlobalMouseMove = (event: MouseEvent) => {
    if (fieldResizeRef.current) {
      updateFieldResize(event.clientX, event.clientY);
      return;
    }
    if (groupDragRef.current) {
      updateGroupDragPosition(event.clientX, event.clientY);
      return;
    }
    if (fieldDragRef.current) {
      updateFieldDragPosition(event.clientX, event.clientY);
    }
    if (signatureDragRef.current) {
      updateSignatureDragPosition(event.clientX, event.clientY);
    }
  };

  const handleGlobalMouseUp = () => {
    if (fieldResizeRef.current) {
      const resizeId = fieldResizeRef.current.id;
      setSignatureFields((prev) =>
        prev.map((field) =>
          field.id === resizeId
            ? {
                ...field,
                metadata: {
                  ...field.metadata,
                  normalized: {
                    x: field.x / VIRTUAL_PAGE_WIDTH,
                    y: field.y / VIRTUAL_PAGE_HEIGHT,
                    width: field.width / VIRTUAL_PAGE_WIDTH,
                    height: field.height / VIRTUAL_PAGE_HEIGHT
                  }
                }
              }
            : field
        )
      );
      fieldResizeRef.current = null;
      setIsFieldResizing(false);
    }
    if (fieldDragRef.current) stopFieldDrag();
    if (groupDragRef.current) stopGroupDrag();
    if (signatureDragRef.current) stopSignatureDrag();
    stopGlobalDragListeners();
  };

  const updateSignatureDragPosition = (clientX: number, clientY: number) => {
    if (!signatureDragRef.current) return;
    const scrollContainer = pdfScrollRef.current;
    const container = scrollContainer?.getBoundingClientRect();
    if (!container) return;
    const { startX, startY, originX, originY } = signatureDragRef.current;
    const currentX = clientX - container.left + (scrollContainer?.scrollLeft ?? 0);
    const currentY = clientY - container.top + (scrollContainer?.scrollTop ?? 0);
    const startLocalX = startX - container.left + (scrollContainer?.scrollLeft ?? 0);
    const startLocalY = startY - container.top + (scrollContainer?.scrollTop ?? 0);
    const dxPx = currentX - startLocalX;
    const dyPx = currentY - startLocalY;
    const { scaleX, scaleY } = getPageScale();
    const dx = dxPx / scaleX;
    const dy = dyPx / scaleY;
    maybeAutoScroll(clientY);
    setSignaturePlacement((prev) => {
      const nextX = Math.min(Math.max(0, originX + dx), VIRTUAL_PAGE_WIDTH - prev.width);
      const nextY = Math.min(Math.max(0, originY + dy), VIRTUAL_PAGE_HEIGHT - prev.height);
      return { ...prev, x: nextX, y: nextY };
    });
  };

  const stopSignatureDrag = () => {
    setSignaturePlacementPct({
      x: signaturePlacement.x / VIRTUAL_PAGE_WIDTH,
      y: signaturePlacement.y / VIRTUAL_PAGE_HEIGHT,
      width: signaturePlacement.width / VIRTUAL_PAGE_WIDTH,
      height: signaturePlacement.height / VIRTUAL_PAGE_HEIGHT
    });
    signatureDragRef.current = null;
    setIsSignatureDragging(false);
  };

  const resolveSignatureRect = () => ({
    left: signaturePlacement.x * getPageScale().scaleX,
    top: signaturePlacement.y * getPageScale().scaleY,
    width: signaturePlacement.width * getPageScale().scaleX,
    height: signaturePlacement.height * getPageScale().scaleY
  });

  const addTextField = () => {
    if (isCanvasLocked) return;

    // UX: if workflow is enabled, do not allow creating fields without signers.
    if (workflowEnabled) {
      const validSigners = buildSignersList();
      if (validSigners.length === 0) {
        toast('Primero agregá los firmantes para poder crear campos.', { position: 'top-right' });
        setFlowPanelOpen(true);
        setTimeout(() => {
          workflowAssignmentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
        return;
      }
    }

    const x = Math.max(16, VIRTUAL_PAGE_WIDTH * 0.5 - 90);
    const y = Math.max(16, VIRTUAL_PAGE_HEIGHT * 0.2);

    const batchId = activeBatchId ?? createFieldId();
    // If user is adding to an existing batch, keep its assignment.
    const inheritedAssignedTo = activeBatchId
      ? signatureFields.find((f) => (f.batchId || f.id) === activeBatchId)?.assignedTo
      : undefined;
    const newField: SignatureField = {
      id: createFieldId(),
      batchId,
      type: 'text',
      page: 1,
      x,
      y,
      width: 180,
      height: 36,
      assignedTo: inheritedAssignedTo,
      required: true,
      metadata: {}
    };
    if (!activeBatchId) {
      setActiveBatchId(batchId);
    }
    setSignatureFields((prev) => [...prev, newField]);
  };

  const normalizeEmail = (email: string | null | undefined) => (email ?? '').trim().toLowerCase();

  const assignBatchToSignerEmail = (batchId: string, signerEmail: string | null) => {
    const normalized = signerEmail ? normalizeEmail(signerEmail) : null;
    setWorkflowAssignmentConfirmed(false);
    setSignatureFields((prev) =>
      prev.map((f) => {
        const bid = f.batchId || f.id;
        if (bid !== batchId) return f;
        return { ...f, assignedTo: normalized ?? undefined };
      })
    );
  };

  const createTextBatchForSigner = (signerEmail: string) => {
    if (isCanvasLocked) return;

    const normalized = normalizeEmail(signerEmail);
    const newBatchId = createFieldId();

    // Place near top-left-ish but within bounds.
    const x = Math.max(16, VIRTUAL_PAGE_WIDTH * 0.5 - 90);
    const y = Math.max(16, VIRTUAL_PAGE_HEIGHT * 0.2);

    const newField: SignatureField = {
      id: createFieldId(),
      batchId: newBatchId,
      type: 'text',
      page: 1,
      x,
      y,
      width: 180,
      height: 36,
      assignedTo: normalized,
      required: true,
      metadata: {}
    };

    setActiveBatchId(newBatchId);
    setWorkflowAssignmentConfirmed(false);
    setSignatureFields((prev) => [...prev, newField]);
  };

  const duplicateField = (id: string) => {
    if (isCanvasLocked) return;
    const field = signatureFields.find((item) => item.id === id);
    if (!field) return;
    const gap = 12;
    const nextY = field.y + field.height + gap;
    const copy = { ...field, id: createFieldId(), x: field.x, y: nextY, width: field.width, height: field.height };
    setSignatureFields((prev) => [...prev, copy]);
  };

  const duplicateBatch = () => {
    if (isCanvasLocked) return;
    if (signatureFields.length === 0) return;
    const sourceBatchId = activeBatchId ?? signatureFields.find((field) => field.batchId)?.batchId ?? null;
    const sourceFields = sourceBatchId
      ? signatureFields.filter((field) => field.batchId === sourceBatchId)
      : signatureFields;
    if (sourceFields.length === 0) return;
    const newBatchId = createFieldId();
    const gap = 16;
    const containerWidth = VIRTUAL_PAGE_WIDTH;
    const minY = Math.min(...sourceFields.map((field) => field.y));
    const maxY = Math.max(...sourceFields.map((field) => field.y + field.height));
    const minX = Math.min(...sourceFields.map((field) => field.x));
    const maxX = Math.max(...sourceFields.map((field) => field.x + field.width));
    const batchWidth = maxX - minX;
    const offsetX = batchWidth + gap;
    const spaceLeft = containerWidth !== null ? minX : 0;
    const spaceRight = containerWidth !== null ? containerWidth - maxX : 0;
    const canFitLeft = spaceLeft >= offsetX;
    const canFitRight = spaceRight >= offsetX;
    const moveLeft = canFitLeft && (!canFitRight || spaceLeft >= spaceRight);
    const moveRight = canFitRight && (!canFitLeft || spaceRight >= spaceLeft);
    const fallbackToLeft = !canFitLeft && !canFitRight && spaceLeft >= spaceRight;

    // Prefer placing the duplicated batch side-by-side. If it doesn't fit, place it below.
    const rawShiftX = moveRight
      ? offsetX
      : moveLeft
        ? -offsetX
        : fallbackToLeft
          ? -Math.min(offsetX, minX)
          : Math.min(offsetX, containerWidth ? containerWidth - maxX : offsetX);

    const cannotPlaceHorizontally = !canFitLeft && !canFitRight;
    const shiftX = cannotPlaceHorizontally ? 0 : rawShiftX;

    const batchHeight = maxY - minY;
    const offsetY = batchHeight + gap;
    const spaceBelow = VIRTUAL_PAGE_HEIGHT - maxY;
    const spaceAbove = minY;
    const canFitBelow = spaceBelow >= offsetY;
    const canFitAbove = spaceAbove >= offsetY;
    const shiftY = cannotPlaceHorizontally
      ? (canFitBelow ? offsetY : canFitAbove ? -offsetY : Math.min(offsetY, Math.max(0, VIRTUAL_PAGE_HEIGHT - maxY)))
      : 0;

    const clamp = (v: number, min: number, max: number) => Math.min(Math.max(min, v), max);

    const batch = sourceFields.map((field) => {
      const nextX = clamp(field.x + shiftX, 0, VIRTUAL_PAGE_WIDTH - field.width);
      const nextY = clamp(field.y + shiftY, 0, VIRTUAL_PAGE_HEIGHT - field.height);
      return {
        ...field,
        id: createFieldId(),
        batchId: newBatchId,
        x: nextX,
        y: nextY,
        width: field.width,
        height: field.height
      };
    });
    setSignatureFields((prev) => [...prev, ...batch]);
    setActiveBatchId(newBatchId);
  };

  const removeField = (id: string) => {
    if (isCanvasLocked) return;
    setSignatureFields((prev) => prev.filter((field) => field.id !== id));
  };

  const startFieldResize = (e: React.MouseEvent, id: string) => {
    if (isCanvasLocked) return;
    e.preventDefault();
    e.stopPropagation();
    const field = signatureFields.find((item) => item.id === id);
    if (!field) return;
    fieldResizeRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      originWidth: field.width,
      originHeight: field.height
    };
    setIsFieldResizing(true);
    startGlobalDragListeners();
  };

  const startGroupDrag = (e: React.MouseEvent, batchId: string) => {
    if (isCanvasLocked) return;
    e.preventDefault();
    e.stopPropagation();

    const originById: Record<string, { x: number; y: number; width: number; height: number; page: number }> = {};
    for (const field of signatureFields) {
      const bid = field.batchId || field.id;
      if (bid !== batchId) continue;
      originById[field.id] = {
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
        page: field.page
      };
    }

    if (Object.keys(originById).length === 0) return;

    groupDragRef.current = {
      batchId,
      startX: e.clientX,
      startY: e.clientY,
      originById
    };
    setIsGroupDragging(true);
    startGlobalDragListeners();
  };

  const startFieldDrag = (e: React.MouseEvent, id: string) => {
    if (isCanvasLocked) return;
    e.preventDefault();
    e.stopPropagation();
    const field = signatureFields.find((item) => item.id === id);
    if (!field) return;

    const batchId = field.batchId || field.id;
    setActiveBatchId(batchId);

    // Default: move the whole batch/group. Advanced: hold Alt to move a single field.
    if (!e.altKey) {
      startGroupDrag(e, batchId);
      return;
    }

    fieldDragRef.current = {
      id,
      page: field.page,
      startX: e.clientX,
      startY: e.clientY,
      originX: field.x,
      originY: field.y,
      width: field.width,
      height: field.height
    };
    setIsFieldDragging(true);
    startGlobalDragListeners();
  };

  const startSignatureDrag = (e: React.MouseEvent) => {
    if (isCanvasLocked) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = signaturePlacement;
    signatureDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: rect.x,
      originY: rect.y
    };
    setIsSignatureDragging(true);
    startGlobalDragListeners();
  };

  // Instrumentation: track active scene views (minimal, non-invasive)
  React.useEffect(() => {
    try {
      trackEvent('legal_center_scene_view', {
        scene,
        hasFile: !!file,
        ndaEnabled,
        workflowEnabled,
        mySignatureEnabled: mySignature,
        isMobile
      });
    } catch (e) {
      // swallow to avoid breaking UI
      console.warn('analytics.scene_view failed', e);
    }
  }, [scene, file, ndaEnabled, workflowEnabled, mySignature, isMobile]);

  // Instrumentation: preview errors
  React.useEffect(() => {
    if (!previewError) return;
    try {
      trackEvent('legal_center_preview_error', {
        fileType: file?.type || 'unknown',
        browser: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      });
    } catch (e) {
      console.warn('analytics.preview_error failed', e);
    }
  }, [previewError]);

  React.useEffect(() => {
    return () => {
      stopGlobalDragListeners();
    };
  }, []);


  return (
    <>
    <LegalCenterShell
      modeConfirmation={modeConfirmation}
      onClose={resetAndClose}
      onBackdropClick={handleBackdropClose}
      gridTemplateColumns={gridTemplateColumns}
      useGrid={!USE_NEW_STAGE} // Stage no necesita grid
      ndaOpen={ndaEnabled} // Panel NDA
      flowOpen={workflowEnabled} // Panel Flujo
    >
      {USE_NEW_STAGE ? (
        /* MODELO DE CAPAS: Stage con canvas invariante */
        <LegalCenterStage
          canvas={
            /* Center Panel (Main Content) - SIN CLASES GRID */
            <div className="h-full w-full flex flex-col">
              {!isFocusMode && (
                <div className="-mx-1.5 -mt-1.5 h-14 px-3 border-b border-gray-200 grid grid-cols-[28px_minmax(0,1fr)_28px] items-center bg-white">
                  <span aria-hidden="true" className="h-7 w-7" />
                  <div className="text-sm font-semibold leading-none text-gray-900 text-center">Centro Legal</div>
                  <div className="relative mr-2">
                    <button
                      type="button"
                      onClick={() => setHeaderMenuOpen((prev) => !prev)}
                      className="h-7 w-7 inline-flex items-center justify-center text-gray-500 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors"
                      title="Opciones"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {headerMenuOpen && (
                      <div className="absolute right-1 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        <button
                          type="button"
                          onClick={() => {
                            handleSaveDraft();
                          }}
                          className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                        >
                          Guardar borrador
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setHeaderMenuOpen(false);
                            resetAndClose();
                          }}
                          className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                        >
                          Cerrar sin guardar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="h-full w-full px-6 pt-3 pb-0 overflow-y-auto overflow-x-hidden">
            {/* PASO 1: ELEGIR ARCHIVO */}
            {step === 1 && (
              <div className={`space-y-2 ${isMobile ? 'pb-24' : ''}`}>
              <div>
                {/* Zona de drop / Preview del documento */}
                                  {!file ? (
                                    <label className="block border-2 border-dashed border-gray-300 rounded-xl py-10 md:py-20 min-h-[240px] md:min-h-[480px] text-center hover:border-gray-900 transition-colors cursor-pointer">
                                      <input
                                        type="file"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                        accept="application/pdf"
                                      />
                                      {/* Título principal */}
                                      <p className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
                                        Arrastrá tu documento o hacé clic para elegirlo
                                      </p>
                                      {/* Ícono del dropzone */}
                                      <FileText className="w-12 h-12 text-gray-900 mx-auto mb-4" />
                                      {/* Texto de formatos */}
      <p className="text-xs text-gray-500 mt-2">
        Solo PDF (máx 50MB)
      </p>
                                      <div className="mt-6 pt-4 border-t border-gray-200">
                                        {/* Texto de privacidad */}
                                        <p className="text-sm text-gray-700 font-medium flex items-center justify-center gap-2">
                                          <Shield className="w-4 h-4 text-gray-700" />
                                          Tu documento está protegido por defecto
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          No lo vemos ni podemos acceder a su contenido.
                                        </p>
                                      </div>
                                    </label>
                                  ) : (                  <div className={`border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-50 ${isPreviewFullscreen || isDocumentFocus ? 'fixed inset-0 z-50 rounded-none border-0 bg-white flex flex-col' : ''}`}>
                    {/* Header del preview */}
                    <div className={`bg-white border-b border-gray-200 h-11 px-3 flex items-center justify-between gap-3 ${isPreviewFullscreen ? 'sticky top-0 z-10' : ''}`}>
                        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                        {isDocumentFocus && (
                          <button
                            onClick={() => setFocusView(null)}
                            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                            title="Volver al Centro Legal"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">Volver</span>
                          </button>
                        )}
                        {/* Escudo de Protección Legal */}
                        <button
                          onClick={() => setShowProtectionModal(true)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            forensicEnabled
                              ? 'text-gray-900 hover:bg-gray-100'
                              : 'text-gray-400 hover:bg-gray-50'
                          }`}
                          title={forensicEnabled ? 'Protección legal activa' : 'Protección legal desactivada'}
                        >
                          <Shield className={`w-5 h-5 ${forensicEnabled ? 'fill-gray-900' : ''}`} />
                        </button>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                            {file.name}
                          </p>
                        </div>
                      </div>
                      {/* Iconos alineados en la misma línea */}
                      <div className="flex shrink-0 items-center gap-1.5">
                        {documentPreview && (
                          <button
                            onClick={() => {
                              setFocusView((prev) => (prev === 'document' ? null : 'document'));
                            }}
                            className="hidden md:inline-flex h-7 w-7 items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            title={isDocumentFocus ? 'Volver al Centro Legal' : 'Ver en grande'}
                          >
                            {isDocumentFocus ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {documentPreview && (
                          <button
                            type="button"
                            onClick={() => setPreviewRotation((prev) => (prev + 90) % 360)}
                            className="hidden md:inline-flex h-7 w-7 items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            title="Rotar documento"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {documentPreview && (
                          <button
                            onClick={() => {
                              setFocusView((prev) => (prev === 'document' ? null : 'document'));
                            }}
                            className="md:hidden text-xs font-semibold text-gray-900 px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
                          >
                            {isDocumentFocus ? 'Volver al Centro Legal' : 'Ver documento completo'}
                          </button>
                        )}
                        <label className="h-7 w-7 inline-flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer" title="Cambiar documento">
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleFileSelect}
                            accept="application/pdf"
                          />
                          <FileUp className="w-3.5 h-3.5" />
                        </label>
                      </div>
                    </div>

                    {/* Preview del contenido - altura fija según modo */}
                    {/* overflow-x-hidden: NUNCA scroll horizontal, overflow-y-auto: scroll vertical permitido */}
                    <div
                      ref={previewContainerRef}
                      className={`relative group ${
                        isPreviewFullscreen || isDocumentFocus ? 'flex-1' : previewMode === 'expanded' ? 'h-[60vh]' : previewBaseHeight
                      } bg-gray-100 overflow-x-hidden overflow-y-auto`}
                    >
                      <div
                        className="relative min-h-full"
                        style={{
                          transform: `rotate(${previewRotation}deg)`,
                          transformOrigin: 'center center',
                          transition: 'transform 200ms ease'
                        }}
                      >
                          {documentPreview && file.type.startsWith('image/') && (
                            <img
                              src={documentPreview}
                              alt="Preview"
                              className="block w-full h-auto max-w-full object-contain"
                            />
                          )}
                          
                          {activePreviewUrl && isPdfPreview && (
                            <>
                              {(
                                  <PdfEditViewer
                                    src={activePreviewUrl}
                                    pdfData={activePreviewPdfData}
                                    locked={isViewerLocked}
                                    virtualWidth={VIRTUAL_PAGE_WIDTH}
                                    scale={virtualScale}
                                    scrollRef={pdfScrollRef}
                                    onError={handlePdfError}
                                    onMetrics={handlePdfMetrics}
                                    renderPageOverlay={(pageNumber: number, metrics: PdfPageMetrics) => {
                                      const locked = isViewerLocked;
                                      return (
                                        <div className="absolute inset-0 pointer-events-auto">
                                        {pageNumber === 1 && mySignature && signaturePreview && (
                                          <div
                                            className="absolute pointer-events-auto group"
                                            style={resolveSignatureRect()}
                                            onMouseDown={startSignatureDrag}
                                          >
                                            {signaturePreview.type === 'image' ? (
                                              <img
                                                src={signaturePreview.value}
                                                alt="Firma"
                                                className="w-full h-full object-contain select-none pointer-events-none"
                                              />
                                            ) : (
                                              <span
                                                className="block w-full h-full text-4xl text-gray-900/90 select-none pointer-events-none"
                                                style={{ fontFamily: "'Dancing Script', cursive" }}
                                              >
                                                {signaturePreview.value}
                                              </span>
                                            )}
                                            {!locked && (
                                            <button
                                              type="button"
                                              onMouseDown={(event) => event.stopPropagation()}
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                setSignaturePreview(null);
                                                setUserHasSignature(false);
                                                setSignatureMode('none');
                                              }}
                                              className="absolute -top-6 -right-6 h-5 w-5 text-gray-700 text-[12px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                              title="Eliminar firma"
                                            >
                                              ×
                                            </button>
                                            )}
                                          </div>
                                        )}

                                        {signatureFields
                                          .filter((field) => field.page === pageNumber)
                                          .map((field) => {
                                            const rect = resolveFieldRect(field);
                                            return (
                                              <div
                                                key={field.id}
                                                className="absolute pointer-events-auto border border-blue-300 bg-blue-50/80 rounded-md px-2 py-2 shadow-sm group"
                                                style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
                                                onMouseDown={(event) => {
                                                  if (locked) return;
                                                  const target = event.target as HTMLElement;
                                                  if (target.tagName === 'INPUT') return;
                                                  startFieldDrag(event, field.id);
                                                }}
                                                onClick={() => setEditingFieldId(field.id)}
                                              >
                                                {!locked && (
                                                <button
                                                  type="button"
                                                  onMouseDown={(event) => event.stopPropagation()}
                                                  onClick={(event) => {
                                                    event.stopPropagation();
                                                    duplicateField(field.id);
                                                  }}
                                                  className="absolute -top-6 -left-6 h-5 w-5 text-gray-600 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                  title="Duplicar campo"
                                                >
                                                  ⧉
                                                </button>
                                                )}
                                                {!locked && (
                                                <button
                                                  type="button"
                                                  onMouseDown={(event) => startFieldDrag(event, field.id)}
                                                  className="absolute -top-6 left-1/2 -translate-x-1/2 h-5 w-5 text-gray-600 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-move"
                                                  title="Mover campo"
                                                >
                                                  ⠿
                                                </button>
                                                )}
                                                {!locked && (
                                                <button
                                                  type="button"
                                                  onMouseDown={(event) => event.stopPropagation()}
                                                  onClick={(event) => {
                                                    event.stopPropagation();
                                                    removeField(field.id);
                                                  }}
                                                  className="absolute -top-6 -right-6 h-5 w-5 text-gray-600 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                  title="Eliminar campo"
                                                >
                                                  ×
                                                </button>
                                                )}
                                                {!locked && (
                                                <button
                                                  type="button"
                                                  onMouseDown={(event) => startFieldResize(event, field.id)}
                                                  className="absolute -bottom-3 -right-3 h-5 w-5 text-gray-600 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-se-resize"
                                                  title="Cambiar tamaño"
                                                >
                                                  ↘
                                                </button>
                                                )}
                                                {editingFieldId === field.id ? (
                                                  <input
                                                    autoFocus
                                                    value={field.metadata?.label ?? ''}
                                                    onChange={(event) => {
                                                      const value = event.target.value;
                                                      setSignatureFields((prev) =>
                                                        prev.map((item) =>
                                                          item.id === field.id
                                                            ? {
                                                                ...item,
                                                                metadata: { ...item.metadata, label: value }
                                                              }
                                                            : item
                                                        )
                                                      );
                                                    }}
                                                    onBlur={() => setEditingFieldId(null)}
                                                    onKeyDown={(event) => {
                                                      if (event.key === 'Enter' || event.key === 'Escape') {
                                                        event.currentTarget.blur();
                                                      }
                                                    }}
                                                    onMouseDown={(event) => event.stopPropagation()}
                                                    placeholder="Texto"
                                                    className="w-full h-full text-xs bg-transparent border-0 focus:ring-0 p-0 text-blue-900 placeholder:text-blue-500"
                                                  />
                                                ) : (
                                                  <span className="text-xs text-blue-900/80 select-none">
                                                    {field.metadata?.label ?? ''}
                                                  </span>
                                                )}
                                              </div>
                                            );
                                          })}
                                      </div>
                                    );
                                  }}
                                />
                              )}
                            </>
                          )}
                          
                          {!activePreviewUrl && (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                              <div className="text-center">
                                <FileText className="w-16 h-16 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Vista previa no disponible</p>
                                <p className="text-xs">El archivo se procesará al certificar</p>
                              </div>
                            </div>
                          )}

                          {activePreviewUrl && !usePdfEditMode && isPdfPreview && (signatureFields.length > 0 || (mySignature && signaturePreview)) && (
                            <div
                              className={`absolute inset-0 ${showSignatureOnPreview || isCanvasLocked ? 'z-0 pointer-events-none' : 'z-20 pointer-events-none'}`}
                            >
                              {mySignature && signaturePreview && (
                                <div
                                  className="absolute pointer-events-auto group"
                                  style={resolveSignatureRect()}
                                  onMouseDown={startSignatureDrag}
                                >
                                  {signaturePreview.type === 'image' ? (
                                    <img
                                      src={signaturePreview.value}
                                      alt="Firma"
                                      className="w-full h-full object-contain select-none pointer-events-none"
                                    />
                                  ) : (
                                    <span
                                      className="block w-full h-full text-4xl text-gray-900/90 select-none pointer-events-none"
                                      style={{ fontFamily: "'Dancing Script', cursive" }}
                                    >
                                      {signaturePreview.value}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onMouseDown={(event) => event.stopPropagation()}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSignaturePreview(null);
                                      setUserHasSignature(false);
                                      setSignatureMode('none');
                                    }}
                                    className="absolute -top-6 -right-6 h-5 w-5 text-gray-700 text-[12px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Eliminar firma"
                                  >
                                    ×
                                  </button>
                                </div>
                              )}

                              {signatureFields.map((field) => (
                                <div
                                  key={field.id}
                                  className="absolute pointer-events-auto border border-blue-300 bg-blue-50/80 rounded-md px-2 py-2 shadow-sm group"
                                  style={resolveFieldRect(field)}
                                  onMouseDown={(event) => {
                                    if (isCanvasLocked) return;
                                    const target = event.target as HTMLElement;
                                    if (target.tagName === 'INPUT') return;
                                    startFieldDrag(event, field.id);
                                  }}
                                  onClick={() => setEditingFieldId(field.id)}
                                >
                                  <button
                                    type="button"
                                    onMouseDown={(event) => event.stopPropagation()}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      duplicateField(field.id);
                                    }}
                                    className="absolute -top-6 -left-6 h-5 w-5 text-gray-600 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Duplicar campo"
                                  >
                                    ⧉
                                  </button>
                                  <button
                                    type="button"
                                    onMouseDown={(event) => startFieldDrag(event, field.id)}
                                    className="absolute -top-6 left-1/2 -translate-x-1/2 h-5 w-5 text-gray-600 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-move"
                                    title="Mover campo"
                                  >
                                    ⠿
                                  </button>
                                  <button
                                    type="button"
                                    onMouseDown={(event) => event.stopPropagation()}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      removeField(field.id);
                                    }}
                                    className="absolute -top-6 -right-6 h-5 w-5 text-gray-600 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Eliminar campo"
                                  >
                                    ×
                                  </button>
                                  {editingFieldId === field.id ? (
                                    <input
                                      autoFocus
                                      value={field.metadata?.label ?? ''}
                                      onChange={(event) => {
                                        const value = event.target.value;
                                        setSignatureFields((prev) =>
                                          prev.map((item) =>
                                            item.id === field.id
                                              ? { ...item, metadata: { ...item.metadata, label: value } }
                                              : item
                                          )
                                        );
                                      }}
                                      onBlur={() => setEditingFieldId(null)}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === 'Escape') {
                                          event.currentTarget.blur();
                                        }
                                      }}
                                      onMouseDown={(event) => event.stopPropagation()}
                                      placeholder="Texto"
                                      className="w-full h-full text-xs bg-transparent border-0 focus:ring-0 p-0 text-blue-900 placeholder:text-blue-500"
                                    />
                                  ) : (
                                    <span className="text-xs text-blue-900/80 select-none">
                                      {field.metadata?.label ?? ''}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                      </div>

                          {/* Modal de firma con tabs */}
                          {showSignatureOnPreview && (
                            <div className={`${isMobile ? 'fixed inset-0 z-[70] bg-white' : 'absolute inset-0 bg-black/20 backdrop-blur-[1px]'} flex ${isMobile ? 'items-stretch' : 'items-center'} justify-center p-0 md:p-6`}>
                              <div className={`bg-white shadow-2xl w-full ${isMobile ? 'h-[100svh] rounded-none p-6 overflow-y-auto flex flex-col' : 'rounded-2xl p-8 max-w-2xl'}`}>
                                <div className="flex justify-between items-center mb-4">
                                  <h4 className="font-semibold text-gray-900">Firmá tu documento</h4>
                                  <button
                                    onClick={() => {
                                      setShowSignatureOnPreview(false);
                                      setSignatureTab('draw');
                                    }}
                                    className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm"
                                    title="Volver al documento"
                                  >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span className="hidden sm:inline">Volver</span>
                                  </button>
                                </div>

                                {/* Tabs */}
                                <div className="flex border-b border-gray-200 mb-4">
                                  <button
                                    onClick={() => setSignatureTab('draw')}
                                    className={`px-4 py-2 font-medium transition-colors ${
                                      signatureTab === 'draw'
                                        ? 'text-gray-900 border-b-2 border-gray-900'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                  >
                                    Dibujar
                                  </button>
                                  <button
                                    onClick={() => setSignatureTab('type')}
                                    className={`px-4 py-2 font-medium transition-colors ${
                                      signatureTab === 'type'
                                        ? 'text-gray-900 border-b-2 border-gray-900'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                  >
                                    Teclear
                                  </button>
                                  <button
                                    onClick={() => setSignatureTab('upload')}
                                    className={`px-4 py-2 font-medium transition-colors ${
                                      signatureTab === 'upload'
                                        ? 'text-gray-900 border-b-2 border-gray-900'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                  >
                                    Subir
                                  </button>
                                </div>

                                {/* Contenido según tab activo */}
                                <div className="mb-4">
                                  {signatureTab === 'draw' && (
                                    <canvas
                                      ref={canvasRef}
                                      className="w-full h-40 border-2 border-gray-300 rounded-lg cursor-crosshair bg-white"
                                      {...handlers}
                                    />
                                  )}

                                  {signatureTab === 'type' && (
                                    <div className="space-y-2">
                                      <input
                                        type="text"
                                        value={typedSignature}
                                        onChange={(e) => setTypedSignature(e.target.value)}
                                        placeholder="Escribí tu nombre"
                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                      />
                                      {typedSignature && (
                                        <div className="h-40 border-2 border-gray-300 rounded-lg bg-white flex items-center justify-center">
                                          <p className="text-5xl" style={{ fontFamily: "'Dancing Script', cursive" }}>
                                            {typedSignature}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {signatureTab === 'upload' && (
                                    <div className="space-y-2">
                                      <label className="block">
                                        <div className="h-40 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer flex flex-col items-center justify-center">
                                          {uploadedSignature ? (
                                            <img
                                              src={uploadedSignature}
                                              alt="Firma"
                                              className="max-h-32 max-w-full object-contain"
                                            />
                                          ) : (
                                            <>
                                              <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                              <p className="text-sm text-gray-600">Click para subir firma (PNG/JPG)</p>
                                            </>
                                          )}
                                        </div>
                                        <input
                                          type="file"
                                          className="hidden"
                                          accept="image/png,image/jpeg,image/jpg"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              const reader = new FileReader();
                                              reader.onload = (event) => {
                                                const result = event?.target?.result;
                                                if (typeof result === 'string') {
                                                  setUploadedSignature(result);
                                                }
                                              };
                                              reader.readAsDataURL(file);
                                            }
                                          }}
                                        />
                                      </label>
                                    </div>
                                  )}
                                </div>

                                {/* Botones */}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      if (signatureTab === 'draw') {
                                        clearCanvas();
                                      } else if (signatureTab === 'type') {
                                        setTypedSignature('');
                                      } else if (signatureTab === 'upload') {
                                        setUploadedSignature(null);
                                      }
                                    }}
                                    className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    Limpiar
                                  </button>
                                  <button
                                    onClick={async () => {
                                      // Validar que el archivo sea un PDF (según preview)
                                      if (!isPdfPreview) {
                                        toast.error('Solo se puede aplicar firma a archivos PDF. Por favor, seleccioná un archivo PDF.');
                                        return;
                                      }

                                      let preview: { type: 'image' | 'text'; value: string } | null = null;
                                      if (signatureTab === 'draw') {
                                        const dataUrl = getSignatureData();
                                        if (dataUrl) preview = { type: 'image', value: dataUrl };
                                      } else if (signatureTab === 'type') {
                                        preview = { type: 'text', value: typedSignature.trim() };
                                      } else if (signatureTab === 'upload') {
                                        if (uploadedSignature) preview = { type: 'image', value: uploadedSignature };
                                      }

                                      if (preview) {
                                        setSignaturePreview(preview);
                                        const nextWidth = preview.type === 'image' ? 220 : Math.max(160, preview.value.length * 12);
                                        const nextHeight = preview.type === 'image' ? 80 : 48;
                                        setSignaturePlacement((prev) => ({
                                          ...prev,
                                          width: nextWidth,
                                          height: nextHeight
                                        }));
                                        setSignaturePlacementPct((prev) => {
                                          const baseX = prev?.x ?? signaturePlacement.x;
                                          const baseY = prev?.y ?? signaturePlacement.y;
                                          return {
                                            x: baseX / VIRTUAL_PAGE_WIDTH,
                                            y: baseY / VIRTUAL_PAGE_HEIGHT,
                                            width: nextWidth / VIRTUAL_PAGE_WIDTH,
                                            height: nextHeight / VIRTUAL_PAGE_HEIGHT
                                          };
                                        });
                                      }

                                      // Marcar que el usuario ya tiene firma
                                      setUserHasSignature(true);
                                      setSignatureMode('canvas');

                                      // Cerrar el modo firma
                                      setShowSignatureOnPreview(false);

                                      // Toast simple de confirmación
                                      showToast('Firma aplicada correctamente.', {
                                        type: 'success',
                                        duration: 2000,
                                        icon: '✓'
                                      });
                                    }}
                                    className="flex-1 py-2 px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                                    disabled={
                                      (signatureTab === 'draw' && !hasSignature) ||
                                      (signatureTab === 'type' && !typedSignature) ||
                                      (signatureTab === 'upload' && !uploadedSignature)
                                    }
                                  >
                                    Aplicar firma
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

              {focusView === 'nda' && (
                <div className="fixed inset-0 z-50 bg-white">
                  <div className="h-full w-full max-w-5xl mx-auto flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <FileText className="w-4 h-4 text-gray-700" />
                        Acuerdo de confidencialidad
                      </div>
                      <button
                        onClick={() => setFocusView(null)}
                        className="text-sm text-gray-600 hover:text-gray-900"
                        title="Volver al Centro Legal"
                      >
                        Volver
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                      <textarea
                        value={ndaText}
                        onChange={(e) => {
                          setNdaText(e.target.value);
                          setNdaDefined(false);
                          setNdaDirty(true);
                        }}
                        className="w-full h-full min-h-[60vh] p-4 text-sm text-gray-800 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-900"
                        placeholder="Escribí aquí el texto del NDA..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CONSTITUCIÓN: Acciones solo visibles si documentLoaded */}
              {documentLoaded && !isFocusMode && (
              <div className="space-y-2 pt-0.5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {/* PASO 3.2.3: Toggle NDA - Módulo refactorizado (placeholder) */}
                  <NdaToggle
                    enabled={ndaEnabled}
                    onToggle={(next) => {
                      setNdaEnabled(next);
                      if (next) {
                        setNdaPanelOpen(true);
                        const hasSaved = ndaSavedText !== null && ndaSavedText === ndaText;
                        setNdaDefined(hasSaved);
                        setNdaDirty(!hasSaved);
                      } else {
                        setNdaPanelOpen(false);
                      }
                    }}
                    disabled={!file}
                  />
                  {/* BLOQUE 1: Toggle de Protección - Módulo refactorizado */}
                  <ProtectionToggle
                    enabled={forensicEnabled}
                    onToggle={async (newState) => {
                      if (newState) {
                        // UX: activar siempre la intención de protección.
                        // La validación dura corre al ejecutar "Proteger".
                        setForensicEnabled(true);
                        toast('🛡️ Protección activada — Este documento quedará respaldado por EcoSign.', {
                          duration: 3000,
                          position: 'top-right'
                        });
                      } else {
                        setForensicEnabled(false);
                        toast('Protección desactivada', {
                          duration: 2000,
                          position: 'top-right'
                        });
                      }
                    }}
                    disabled={!file}
                    isValidating={isValidatingTSA}
                  />
                  {/* PASO 3.2.1: Toggle Mi Firma - Módulo refactorizado */}
                  <MySignatureToggle
                    enabled={mySignature}
                    onToggle={(newState) => {
                      if (newState && workflowEnabled) {
                        showToast(
                          'Mi firma y Flujo de firmas son opciones excluyentes.\n\nSi querés firmar junto a otros, agregá tu correo dentro del flujo.',
                          { type: 'warning', duration: 5500, position: 'top-right' }
                        );
                        return;
                      }
                      if (newState) {
                        if (!ownerEmail) {
                          showToast('Necesitás iniciar sesión para firmar tu documento.', { type: 'error' });
                          setMySignature(false);
                          return;
                        }
                        setMySignature(true);
                        setIsCanvasLocked(true);
                        openMySignatureWizard();
                        return;
                      }
                      setMySignature(false);
                    }}
                    disabled={!file}
                    hasFile={!!file}
                  />
                  {/* PASO 3.2.2: Toggle Flujo - Módulo refactorizado */}
                  <SignatureFlowToggle
                    enabled={workflowEnabled}
                    onToggle={(next) => {
                      if (next && mySignature) {
                        showToast(
                          'Mi firma y Flujo de firmas son opciones excluyentes.\n\nSi querés firmar junto a otros, agregá tu correo dentro del flujo.',
                          { type: 'warning', duration: 5500, position: 'top-right' }
                        );
                        return;
                      }
                      setWorkflowEnabled(next);
                      if (next) {
                        setFlowPanelOpen(true);
                      } else {
                        setFlowPanelOpen(false);
                      }
                    }}
                    disabled={!file}
                  />
                </div>
              </div>
              )}

              {documentLoaded && isMobile && (ndaEnabled || workflowEnabled) && !isFocusMode && (
                <div className="space-y-3">
                  {ndaEnabled && (
                    <div className="border border-gray-200 rounded-xl bg-white">
                      <button
                        type="button"
                        onClick={() => setNdaAccordionOpen((prev) => !prev)}
                        className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-gray-900"
                      >
                        <span>NDA</span>
                        <span className="flex items-center gap-2 text-xs text-gray-500">
                          {!ndaAccordionOpen && ndaDefined && !ndaDirty && (
                            <span className="text-green-700">NDA guardado ✓</span>
                          )}
                          {ndaAccordionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </button>
                      {ndaAccordionOpen && (
                        <div className="px-4 pb-4">
                          <p className="text-xs text-gray-600 mb-3">
                            Editá el texto del NDA que los firmantes deberán aceptar antes de acceder al documento.
                          </p>
                          <textarea
                            value={ndaText}
                            onChange={(e) => {
                              setNdaText(e.target.value);
                              setNdaDefined(false);
                              setNdaDirty(true);
                            }}
                            className="w-full h-64 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none font-mono"
                            placeholder="Escribí aquí el texto del NDA..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const trimmed = ndaText.trim();
                              if (!trimmed || trimmed === NDA_COPY.EMPTY_MESSAGE.trim()) {
                                showToast('El NDA no puede estar vacío.', { type: 'error' });
                                return;
                              }
                              setNdaSavedText(ndaText);
                              setNdaDefined(true);
                              setNdaDirty(false);
                              showToast('NDA guardado.', { type: 'success', duration: 2000 });
                            }}
                            disabled={!ndaDirty || !ndaText.trim() || ndaText.trim() === NDA_COPY.EMPTY_MESSAGE.trim()}
                            className={`mt-3 w-full py-2 px-3 rounded text-xs font-medium transition ${
                              !ndaDirty || !ndaText.trim() || ndaText.trim() === NDA_COPY.EMPTY_MESSAGE.trim()
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-900 text-white hover:bg-gray-800'
                            }`}
                          >
                            Guardar NDA
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {workflowEnabled && (
                    <div className="border border-gray-200 rounded-xl bg-white">
                      <button
                        type="button"
                        onClick={() => setWorkflowAccordionOpen((prev) => !prev)}
                        className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-gray-900"
                      >
                        <span>Flujo de Firmas</span>
                        <span className="flex items-center gap-2 text-xs text-gray-500">
                          {!workflowAccordionOpen && signerCount > 0 && (
                            <span className="text-gray-700">
                              {signerCount === 1 ? '1 firmante cargado' : `${signerCount} firmantes cargados`}
                            </span>
                          )}
                          {workflowAccordionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </button>
                      {workflowAccordionOpen && (
                        <div className="px-4 pb-4">
                          <p className="text-xs text-gray-500 mb-4">
                            Agregá un email por firmante. Las personas firmarán en el orden que los agregues.
                          </p>

                          <div className="space-y-2 mb-4">
                            {emailInputs.map((input, index) => (
                              <div key={index} className="bg-white border border-gray-200 rounded-lg p-2 space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                    {index + 1}
                                  </div>
                                  <input
                                    type="email"
                                    value={input.email}
                                    onChange={(e) => handleEmailChange(index, e.target.value)}
                                    onPaste={(e) => handleEmailPaste(index, e)}
                                    onBlur={() => handleEmailBlur(index)}
                                    placeholder="email@ejemplo.com"
                                    disabled={workflowAssignmentConfirmed}
                                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:bg-gray-100 disabled:text-gray-500"
                                  />
                                  {emailInputs.length > 1 && (
                                    <button
                                      onClick={() => handleRemoveEmailField(index)}
                                      disabled={workflowAssignmentConfirmed}
                                      className="text-gray-400 hover:text-red-600 transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Eliminar firmante"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={input.name}
                                    onChange={(e) => handleNameChange(index, e.target.value)}
                                    placeholder="Juan Pérez (opcional)"
                                    disabled={workflowAssignmentConfirmed}
                                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:bg-gray-100 disabled:text-gray-500"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          <button
                            onClick={handleAddEmailField}
                            disabled={workflowAssignmentConfirmed}
                            className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors flex items-center justify-center gap-2 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Users className="w-4 h-4" />
                            Agregar otro firmante
                          </button>

                          <div className="p-3 bg-gray-100 border border-gray-200 rounded-lg">
                            <div className="flex gap-2">
                              <Shield className="w-4 h-4 text-gray-900 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-gray-900">
                                  Orden de firmantes
                                </p>
                                <p className="text-xs text-gray-700 mt-1">
                                  El flujo respeta el orden de los mails que agregás.
                                </p>
                                <p className="text-[11px] text-gray-600 mt-2">
                                  Tip: podés pegar varios correos juntos con{' '}
                                  <span className="inline-flex items-center gap-1 font-medium text-gray-900 group relative">
                                    Smart Paste
                                    <span className="text-[10px] leading-none text-gray-500 border border-gray-300 rounded-full w-3 h-3 inline-flex items-center justify-center">
                                      ?
                                    </span>
                                    <span className="invisible group-hover:visible absolute left-0 top-full mt-2 w-64 rounded-md bg-gray-900 px-2 py-1 text-[10px] text-white shadow-lg z-50">
                                      Copiá todos los correos juntos. Al pegarlos en el primer campo, EcoSign los separa y respeta el orden.
                                    </span>
                                  </span>
                                  , o usar la varita mágica para crear los campos.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tipo de Firma - Solo si hay campos listos (Mi firma) o workflow SIN mi firma */}
              {documentLoaded && ((mySignature && signatureFields.length > 0) || (workflowEnabled && !mySignature)) && !isFocusMode && (
              <div className="space-y-2 animate-fadeScaleIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Firma Legal */}
                  <button
                    type="button"
                    onClick={() => {
                      setSignatureType('legal');
                      showToast('Firma legal seleccionada', { type: 'success', duration: 2000 });
                    }}
                    className={`h-11 px-4 rounded-lg border text-left transition ${
                      signatureType === 'legal'
                        ? 'border-blue-900 text-blue-900 bg-transparent'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        Firma Legal
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500">
                          {!isEnterprisePlan ? `${ecosignUsed}/${ecosignTotal}` : '∞'}
                        </p>
                        <div className="group relative">
                          <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                          <div className="invisible group-hover:visible absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50">
                            Firma válida para acuerdos cotidianos. Rápida, privada y simple.
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Firma Certificada */}
                  <button
                    type="button"
                    onClick={() => {
                      setSignatureType('certified');
                      setShowCertifiedModal(true);
                      showToast('Firma certificada seleccionada', { type: 'success', duration: 2000 });
                    }}
                    className={`h-11 px-4 rounded-lg border text-left transition ${
                      signatureType === 'certified'
                        ? 'border-blue-900 text-blue-900 bg-transparent'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        Firma Certificada
                      </p>
                      <div className="group relative">
                        <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                        <div className="invisible group-hover:visible absolute right-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50">
                          Para contratos que exigen certificación oficial según tu país.
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
              )}

              {/* Botón principal */}
              {!isFocusMode && (
              <div className="hidden md:block sticky bottom-0 z-10 -mx-6 border-t border-gray-200 bg-white px-6 py-2 mt-0">
                <button
                  ref={finalizeButtonRef}
                  onClick={handleProtectClick}
                  disabled={!file || loading || !isCTAEnabled()}
                  className="w-full h-11 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-5 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Protegiendo tu documento…
                    </>
                  ) : (
                    // CONSTITUCIÓN: Usar getCTAText() para consistencia
                    getCTAText()
                  )}
                </button>
              </div>
              )}
              {!isFocusMode && (
              <div className="md:hidden sticky bottom-0 z-10 -mx-6 border-t border-gray-200 bg-white px-6 py-2">
                <button
                  onClick={handleProtectClick}
                  disabled={!file || loading || !isCTAEnabled()}
                  className="w-full h-11 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-5 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Protegiendo tu documento…
                    </>
                  ) : (
                    getCTAText()
                  )}
                </button>
              </div>
              )}
            </div>
          )}

          {/* PASO 2: Eliminado - ya no es necesario porque los documentos se encriptan */}
            </div>
            </div>
          }
      leftOverlay={
            !isMobile && documentLoaded && ndaEnabled && !isFocusMode ? (
              <NdaPanel
                isOpen={ndaPanelOpen}
                documentId={undefined}
                content={ndaText}
                onContentChange={(next) => {
                  setNdaText(next);
                  setNdaDefined(false);
                  setNdaDirty(true);
                }}
                onFocus={() => setFocusView('nda')}
                onClose={() => setNdaPanelOpen(false)}
                onSave={(ndaData) => {
                  setNdaText(ndaData.content);
                  setNdaSavedText(ndaData.content);
                  setNdaDefined(true);
                  setNdaDirty(false);
                  console.log('NDA saved:', ndaData);
                }}
              />
            ) : undefined
          }
          rightOverlay={
            !isMobile && documentLoaded && workflowEnabled && !isFocusMode ? (
              <div className="h-full flex flex-col bg-white">
                {/* Header colapsable del panel */}
            <div className="h-14 px-3 border-b border-gray-200 bg-white">
              <div className="h-full grid grid-cols-[28px_minmax(0,1fr)_28px] items-center">
                <span aria-hidden="true" className="h-7 w-7" />
                <h3 className="text-sm font-semibold leading-none text-gray-900 text-center">Flujo de Firmas</h3>
                <span aria-hidden="true" className="h-7 w-7" />
              </div>
            </div>

            {/* Contenido del panel */}
            <div className="flex-1 overflow-y-auto overflow-x-visible p-2 flex flex-col gap-2">

              {/* Sub-header de Flujo - alineado con barra interna de NDA */}
              <div className="border border-gray-200 rounded-xl bg-white overflow-visible mt-1">
                <div className="h-11 px-3 bg-white border-b border-gray-200 flex items-center justify-between relative">
                  <div className="group relative flex items-center gap-1">
                    <span className="text-sm font-medium text-gray-700">Firmantes</span>
                    <button
                      type="button"
                      className="h-7 w-7 inline-flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition"
                      title="Ayuda de firmantes"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                    <div className="invisible group-hover:visible absolute left-0 top-full mt-2 w-72 rounded-md bg-gray-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg z-[70]">
                      <p className="font-medium">Orden de firmantes</p>
                      <p className="mt-1">
                        El sistema enviará las solicitudes respetando el orden en que agregás los correos.
                      </p>
                      <p className="mt-1">
                        El firmante 1 recibe primero. Cuando firma, se envía automáticamente al siguiente.
                      </p>
                      <p className="mt-1">
                        Tip: Pegá una lista de correos (separados por coma, espacio o salto de línea) y EcoSign los agregará automáticamente.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (buildSignersList().length === 0) return;
                      openSignerFieldsWizard();
                      showToast('Ajustá campos con el wizard.', { type: 'info', duration: 1800, position: 'top-right' });
                    }}
                    disabled={buildSignersList().length === 0}
                    title="Modificar asignación de campos"
                    className="h-7 w-7 inline-flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Contenido scrolleable - Firmantes */}
                <div className="px-2 py-2 max-h-[400px] overflow-y-auto">

              {/* Firmantes (email) - versión simplificada */}
              {(() => {
                const validSigners = buildSignersList();
                const { batches } = resolveBatchAssignments(signatureFields, validSigners);

                return (
                  <div ref={workflowAssignmentSectionRef} className="space-y-2 mb-4">
                    {emailInputs.map((input, index) => {
                      const rawEmail = input.email.trim();
                      const emailOk = rawEmail ? isValidEmail(rawEmail).valid : false;
                      const emailNorm = normalizeEmail(rawEmail);

                      const signerBatches = emailOk
                        ? batches.filter((b) => normalizeEmail(b.assignedSignerEmail) === emailNorm)
                        : [];

                      const hasAssignedFields = signerBatches.length > 0 && signerBatches.some((b) => b.fields.length > 0);

                      const isManualAssigning = expandedSignerIndex === index;

                      return (
                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                              {index + 1}
                            </div>
                            <input
                              type="email"
                              value={input.email}
                              onChange={(e) => handleEmailChange(index, e.target.value)}
                              onPaste={(e) => handleEmailPaste(index, e)}
                              onBlur={() => handleEmailBlur(index)}
                              placeholder="email@ejemplo.com"
                              disabled={workflowAssignmentConfirmed}
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:bg-gray-100 disabled:text-gray-500"
                            />
                            {hasAssignedFields && (
                              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" title="Tiene campos asignados" />
                            )}
                            {emailInputs.length > 1 && (
                              <button
                                onClick={() => handleRemoveEmailField(index)}
                                disabled={workflowAssignmentConfirmed}
                                className="text-gray-400 hover:text-red-600 transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Eliminar firmante"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

                  {/* Botón para agregar más firmantes */}
                  <button
                    onClick={handleAddEmailField}
                    disabled={workflowAssignmentConfirmed}
                    className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Users className="w-4 h-4" />
                    Agregar otro firmante
                  </button>

                </div>
              </div>

              </div>

              <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white p-2 mb-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (!canAssignWorkflowFields) return;
                    openSignerFieldsWizard();
                    showToast('Asignación automática lista: revisá y confirmá.', { type: 'info', duration: 2000, position: 'top-right' });
                  }}
                  disabled={!canAssignWorkflowFields}
                  className={`w-full h-11 rounded-lg px-4 text-sm font-medium transition ${
                    canAssignWorkflowFields
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                  title={
                    workflowAssignmentConfirmed
                      ? 'Campos ya asignados'
                      : 'Agregá un mail válido para asignar campos'
                  }
                >
                  <span>{workflowAssignmentConfirmed ? 'Campos asignados' : 'Asignar campos'}</span>
                </button>
              </div>
              </div>
            ) : undefined
          }
          leftOpen={!isMobile && ndaEnabled && ndaPanelOpen && documentLoaded && !isFocusMode}
          rightOpen={!isMobile && workflowEnabled && flowPanelOpen && documentLoaded && !isFocusMode}
        />
      ) : (
        /* MODELO LEGACY: Grid con compresión (fallback) */
        <>
          {/* Left Panel (NDA) */}
          {documentLoaded && ndaEnabled && (
            <div className="left-panel h-full transition-all duration-300 ease-in-out hidden md:block">
              <NdaPanel
                isOpen={ndaEnabled}
                documentId={undefined}
                content={ndaText}
                onContentChange={(next) => {
                  setNdaText(next);
                  setNdaDefined(false);
                  setNdaDirty(true);
                }}
                onClose={() => setNdaEnabled(false)}
                onSave={(ndaData) => {
                  setNdaText(ndaData.content);
                  setNdaSavedText(ndaData.content);
                  setNdaDefined(true);
                  setNdaDirty(false);
                  console.log('NDA saved:', ndaData);
                }}
              />
            </div>
          )}

          {/* Center Panel - LEGACY con grid */}
          <div className="center-panel relative z-20 col-start-2 col-end-3 px-6 py-3">
            <p className="text-gray-500">Legacy Grid Mode (USE_NEW_STAGE = false)</p>
          </div>

          {/* Right Panel - LEGACY */}
          {documentLoaded && workflowEnabled && (
            <div className="right-panel col-start-3 col-end-4 h-full">
              <p className="text-gray-500 p-4">Legacy Workflow Panel</p>
            </div>
          )}
        </>
      )}
    </LegalCenterShell>

    <SignerFieldsWizard
      isOpen={showSignerFieldsWizard}
      onClose={() => {
        setShowSignerFieldsWizard(false);
        if (mySignature && signatureFields.length === 0) {
          setMySignature(false);
          setSignatureType(null);
          showToast('Mi firma se desactivó porque no se asignaron campos.', {
            type: 'warning',
            duration: 2000,
            position: 'top-right'
          });
        }
      }}
      signers={
        mySignature && !workflowEnabled
          ? (ownerEmail ? [{ email: ownerEmail, signingOrder: 1 }] : [])
          : buildSignersList().map((s) => ({ email: s.email, signingOrder: s.signingOrder }))
      }
      virtualWidth={VIRTUAL_PAGE_WIDTH}
      detectedVirtualHeight={VIRTUAL_PAGE_HEIGHT}
      totalPages={pdfPageMetrics.length > 0 ? pdfPageMetrics.length : null}
      detectedPageLabel={detectedPageLabel}
      previewUrl={activePreviewUrl}
      previewPdfData={activePreviewPdfData}
      previewIsPdf={isPdfPreview}
      previewPage={pdfPageMetrics.length > 0 ? pdfPageMetrics.length : null}
      onApply={(result) => {
        const fields = result.fields;
        if (signatureFields.length > 0) {
          const ok = window.confirm('Esto va a reemplazar los campos existentes. ¿Continuar?');
          if (!ok) return;
        }

        setSignatureFields(fields);
        setWorkflowVirtualSize({ width: result.virtualWidth, height: result.virtualHeight });
        setWorkflowPageSizeMode(result.pageSizeMode);
        const firstBatch = fields.find((f: SignatureField) => f.batchId)?.batchId ?? null;
        setActiveBatchId(firstBatch);
        setWorkflowAssignmentConfirmed(true);
        setExpandedSignerIndex(null);
        setShowSignerFieldsWizard(false);
        showToast('Campos configurados correctamente.', { type: 'success', duration: 2000, position: 'top-right' });
      }}
    />

    {/* Modal secundario: Selector de tipo de firma certificada */}
    {showCertifiedModal && (
        <div className="fixed inset-0 bg-white md:bg-black md:bg-opacity-60 flex items-center justify-center z-[60] animate-fadeIn p-0 md:p-6">
          <div className="bg-white rounded-none md:rounded-2xl w-full h-full md:h-auto max-w-md p-6 shadow-2xl animate-fadeScaleIn overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Elegí el tipo de firma certificada
              </h3>
              <button
                onClick={() => setShowCertifiedModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Seleccioná el tipo de firma según los requisitos legales de tu jurisdicción.
            </p>

            <div className="space-y-3">
              {/* QES - Firma Cualificada */}
              <button
                type="button"
                onClick={() => {
                  setCertifiedSubType('qes');
                  setShowCertifiedModal(false);
                }}
                className={`w-full p-4 rounded-lg border-2 text-left transition ${
                  certifiedSubType === 'qes'
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Firma Cualificada (QES)
                </p>
                <p className="text-xs text-gray-500">
                  Máxima validez legal (UE / LATAM). Ideal para contratos formales y auditorías.
                </p>
              </button>

              {/* Mifiel */}
              <button
                type="button"
                onClick={() => {
                  setCertifiedSubType('mifiel');
                  setShowCertifiedModal(false);
                }}
                className={`w-full p-4 rounded-lg border-2 text-left transition ${
                  certifiedSubType === 'mifiel'
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Mifiel
                </p>
                <p className="text-xs text-gray-500">
                  Cumplimiento legal en México y LATAM. Firma electrónica avanzada (FIEL).
                </p>
              </button>

              {/* Internacional */}
              <button
                type="button"
                onClick={() => {
                  setCertifiedSubType('international');
                  setShowCertifiedModal(false);
                }}
                className={`w-full p-4 rounded-lg border-2 text-left transition ${
                  certifiedSubType === 'international'
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Internacional
                </p>
                <p className="text-xs text-gray-500">
                  Cumplimiento multi-jurisdicción (eIDAS, eSign, UETA). Para operaciones globales.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASO 3: Modal de Protección - Componente refactorizado */}
      <ProtectionInfoModal
        isOpen={showProtectionModal}
        onClose={() => setShowProtectionModal(false)}
      />

      {/* PASO 3: Modal de Warning - Componente refactorizado */}
      <ProtectionWarningModal
        isOpen={showUnprotectedWarning}
        onClose={() => setShowUnprotectedWarning(false)}
        onActivateProtection={() => setForensicEnabled(true)}
        onExitWithoutProtection={() => {
          setShowUnprotectedWarning(false);
          // Forzar el cierre sin volver a checkear
          setForensicEnabled(true); // Temporal para evitar loop
          setTimeout(() => {
            setForensicEnabled(false); // Restaurar estado real
            resetAndClose();
          }, 50);
        }}
      />

      {/* Modal de Bienvenida */}
      <LegalCenterWelcomeModal
        isOpen={showWelcomeModal}
        onAccept={handleWelcomeAccept}
        onReject={handleWelcomeReject}
        onNeverShow={handleWelcomeNeverShow}
      />

      {/* Early warning: duplicate filename (non-blocking) */}
      {duplicateNamePrompt && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5">
            <h3 className="text-lg font-semibold text-gray-900">Documento con el mismo nombre</h3>
            <p className="text-sm text-gray-700 mt-2">
              Ya existe un documento llamado <span className="font-medium">{duplicateNamePrompt.fileName}</span>.
              {duplicateNamePrompt.hasProtectionStarted
                ? ' Ese documento ya inicio un proceso de proteccion.'
                : ' Si ya lo cargaste antes, tal vez no hace falta repetirlo.'}
            </p>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                className="flex-1 px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
                onClick={() => openExistingDocumentEntity(duplicateNamePrompt.entityId)}
              >
                Ver documento existente
              </button>
              <button
                type="button"
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50"
                onClick={() => setDuplicateNamePrompt(null)}
              >
                Continuar igual
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Este aviso se basa en el nombre del archivo (no es una verificacion por huella).
            </p>
          </div>
        </div>
      )}

      {/* Modal de confirmación al cerrar por click fuera */}
      {showCloseConfirmModal && (
        <div
          className="fixed inset-0 bg-white md:bg-black md:bg-opacity-60 flex items-center justify-center z-[70] animate-fadeIn p-0 md:p-6"
          onMouseDown={handleDismissCloseConfirm}
        >
          <div
            className="bg-white rounded-none md:rounded-2xl w-full h-full md:h-auto max-w-md p-6 shadow-2xl animate-fadeScaleIn overflow-y-auto"
            onMouseDown={(event) => event.stopPropagation()}
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                setCloseConfirmSelection('discard');
                return;
              }
              if (event.key === 'ArrowRight') {
                event.preventDefault();
                if (!file) return;
                setCloseConfirmSelection('save');
                return;
              }
              if (event.key === 'Enter') {
                event.preventDefault();
                if (closeConfirmSelection === 'discard') {
                  handleCloseWithoutSave();
                  return;
                }
                if (file) {
                  void handleSaveDraftAndClose();
                }
                return;
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                handleDismissCloseConfirm();
              }
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Tenés cambios sin guardar
              </h3>
              <button
                onClick={handleDismissCloseConfirm}
                className="text-gray-400 hover:text-gray-600 transition"
                title="Cancelar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Podés guardar un borrador para retomar después, o cerrar y descartar los cambios.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleCloseWithoutSave}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  closeConfirmSelection === 'discard'
                    ? 'bg-gray-200 text-gray-800 ring-2 ring-gray-900 ring-offset-1'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cerrar sin guardar
              </button>
              <button
                onClick={() => {
                  void handleSaveDraftAndClose();
                }}
                disabled={!file}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed ${
                  closeConfirmSelection === 'save' && file
                    ? 'bg-gray-900 text-white ring-2 ring-gray-900 ring-offset-1'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                Guardar borrador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para desactivar toasts */}
      {showToastConfirmModal && (
        <div className="fixed inset-0 bg-white md:bg-black md:bg-opacity-60 flex items-center justify-center z-[70] animate-fadeIn p-0 md:p-6">
          <div className="bg-white rounded-none md:rounded-2xl w-full h-full md:h-auto max-w-md p-6 shadow-2xl animate-fadeScaleIn overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                ¿Desactivar notificaciones?
              </h3>
              <button
                onClick={handleKeepToasts}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Si desactivás las notificaciones, no recibirás más mensajes informativos sobre el proceso. Podés reactivarlas en cualquier momento desde la configuración.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleKeepToasts}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Seguir recibiendo
              </button>
              <button
                onClick={handleDisableToasts}
                className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FASE 3.A/3.B/3.C: Progress modal during certification (P0.5, P0.4, P0.7, P0.8) */}
      {certifyProgress.stage && (
        <CertifyProgress
          stage={certifyProgress.stage}
          message={certifyProgress.message}
          error={certifyProgress.error}
          workSaved={certifyProgress.workSaved}
          canRetry={certifyProgress.error ? canRetryFromStage(certifyProgress.stage) : false}
          onRetry={() => {
            // FASE 3.C: Retry certification (P0.8)
            // Reset error state and retry handleCertify
            setCertifyProgress({
              stage: null,
              message: '',
              error: undefined,
              workSaved: undefined
            });
            // Call handleCertify again (it will restart from 'preparing')
            handleCertify();
          }}
          onClose={() => {
            // Reset progress state when user closes error modal
            setCertifyProgress({
              stage: null,
              message: '',
              error: undefined,
              workSaved: undefined
            });
          }}
        />
      )}

      {/* Sprint 4: Custody mode confirmation modal */}
      <CustodyConfirmationModal
        isOpen={showCustodyModal}
        onClose={() => setShowCustodyModal(false)}
        onConfirm={handleCustodyConfirmed}
        documentName={file?.name || 'documento.pdf'}
      />
    </>
  );
};

export default LegalCenterModalV2;
