import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { X, ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CheckCircle2, Copy, FileCheck, FileText, HelpCircle, Highlighter, Loader2, Lock, Maximize2, Minimize2, PlusSquare, Shield, Type, Unlock, Upload, Users, RefreshCw, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ToastOptions as HotToastOptions } from 'react-hot-toast';
import '../styles/legalCenterAnimations.css';
import { certifyFile, downloadEcox } from '../lib/basicCertificationWeb';
import { persistSignedPdfToStorage, saveUserDocument } from '../utils/documentStorage';
import { startSignatureWorkflow } from '../lib/signatureWorkflowService';
import { useSignatureCanvas } from '../hooks/useSignatureCanvas';
import { applySignatureToPDF, blobToFile, addSignatureSheet, applyOverlaySpecToPdf } from '../utils/pdfSignature';
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
import { saveDraftOperation } from '../lib/draftOperationsService';
import { saveWorkflowFields, loadWorkflowFields } from '../lib/workflowFieldsService';
import { resolveBatchAssignments } from '../lib/batches';

// PASO 3: Módulos refactorizados
import { 
  ProtectionToggle,
  ProtectionInfoModal,
  ProtectionWarningModal
} from '../centro-legal/modules/protection';
import { MySignatureToggle, SignatureModal } from '../centro-legal/modules/signature';
import { SignatureFlowToggle } from '../centro-legal/modules/flow';
import { SignerFieldsWizard } from '../centro-legal/modules/flow/SignerFieldsWizard';
import { NdaToggle, NdaPanel } from '../centro-legal/modules/nda';
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

type ToastKind = 'success' | 'error' | 'default';
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
  
  // Confirmación de modo (aparece temporalmente en el header)
  const [modeConfirmation, setModeConfirmation] = useState('');
  
  // NDA editable (panel izquierdo)
  const [ndaText, setNdaText] = useState<string>(`ACUERDO DE CONFIDENCIALIDAD (NDA)

Este documento contiene información confidencial. Al acceder, usted acepta:

1. CONFIDENCIALIDAD
Mantener la información en estricta confidencialidad y no divulgarla a terceros sin autorización previa por escrito.

2. USO LIMITADO
Utilizar la información únicamente para los fines acordados.

3. PROTECCIÓN
Implementar medidas de seguridad razonables para proteger la información confidencial.

4. DEVOLUCIÓN
Devolver o destruir toda la información confidencial cuando se solicite.

5. DURACIÓN
Este acuerdo permanece vigente por 5 años desde la fecha de firma.`);
  
  const [emailInputs, setEmailInputs] = useState<EmailInput[]>([
    { email: '', name: '', requireLogin: true, requireNda: true }
  ]); // 1 campo por defecto - usuarios agregan más según necesiten

  // Placeholder para campos de firma visual (SceneRenderer los consumirá)
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [isCanvasLocked, setIsCanvasLocked] = useState(false);

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

  // Confirmation is about assignment+structure, not pixel movement.
  useEffect(() => {
    setWorkflowAssignmentConfirmed(false);
  }, [workflowEnabled, emailInputs]);

  useEffect(() => {
    setWorkflowAssignmentConfirmed(false);
  }, [assignmentFingerprint]);

  const openSignerFieldsWizard = () => {
    setFlowPanelOpen(true);
    setShowSignerFieldsWizard(true);
    setTimeout(() => {
      workflowAssignmentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
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

  const openExistingDocumentEntity = (entityId: string) => {
    try {
      sessionStorage.setItem('ecosign_open_document_entity_id', entityId);
    } catch {
      // ignore
    }
    resetAndClose();
    if (onClose) onClose();
    window.location.assign('/documents');
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Detectar si es un PDF encriptado
      if (selectedFile.type === 'application/pdf') {
        const isEncrypted = await isPDFEncrypted(selectedFile);
        if (isEncrypted) {
          // Mostrar toast con el mensaje
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
          // Reset file input
          e.target.value = '';
          return;
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
          // Reset file input
          e.target.value = '';
          return;
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
      } else {
        // Para otros tipos, mostrar icono genérico
        setDocumentPreview(null);
      }

      // CONSTITUCIÓN: Toast unificado "Documento listo"
      showToast('Documento listo.\nEcoSign no ve tu documento.\nLa certificación está activada por defecto.', {
        icon: '✓',
        position: 'top-right',
        duration: 4000
      });

      // CONSTITUCIÓN: Abrir modal de firma automáticamente si corresponde
      if (initialAction === 'sign' || mySignature) {
        setIsCanvasLocked(false);
        setShowSignatureOnPreview(true);

        showToast('Vas a poder firmar directamente sobre el documento.', {
          icon: '✍️',
          position: 'top-right',
          duration: 3000
        });
      }
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

  useEffect(() => {
    if (!previewContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect?.width) {
          // Fit-to-width: el documento debe ocupar el ancho disponible sin scroll horizontal
          // Solo restamos 16px (8px por lado) para un margen mínimo
          const availableWidth = Math.max(0, entry.contentRect.width - 16);
          // Breathing de 0.98 para llenar casi todo el espacio (antes era 0.9)
          const breathing = 0.98;
          const fitScale = availableWidth / VIRTUAL_PAGE_WIDTH;
          const scale = Math.min(1, fitScale) * breathing;
          setVirtualScale(Math.max(0.5, scale));
        }
      }
    });
    observer.observe(previewContainerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (documentPreview) {
      setPdfEditError(false);
    }
  }, [documentPreview]);

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
    setEmailInputs([...emailInputs, { email: '', name: '', requireLogin: true, requireNda: true }]);
  };

  const handleRemoveEmailField = (index: number) => {
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

  const buildSignersList = (): Signer[] => {
    // Construir lista de firmantes desde los campos con email
    const validSigners: Signer[] = [];
    const seen = new Set<string>();
    const errors: string[] = [];

    emailInputs.forEach((input, idx) => {
      const trimmed = input.email.trim();
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
        requireNda: input.requireNda,
        quickAccess: false
      });
    });

    // Mostrar errores si hay (posición abajo para errores)
    if (errors.length > 0) {
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
  const handleProtectClick = () => {
    if (!file) return;
    // Mostrar modal de custody para que usuario elija el modo
    setShowCustodyModal(true);
  };

  const handleCustodyConfirmed = (custodyMode: CustodyMode) => {
    setCustodyModeChoice(custodyMode);
    // Proceder con la protección
    handleCertify();
  };

  const handleCertify = async () => {
    if (!file) return;
    if (!file.type?.toLowerCase().includes('pdf')) {
      toast.error('Subí un PDF para proteger y certificar (otros formatos no son compatibles).', {
        position: 'bottom-right'
      });
      return;
    }

    // Validar que si "Mi Firma" está activa, debe existir firma
    if (mySignature && !userHasSignature) {
      toast.error('Debés aplicar tu firma antes de certificar el documento. Hacé clic en "Mi Firma" y dibujá tu firma.', {
        position: 'bottom-right'
      });
      return;
    }

    // Validar que si "Mi Firma" está activa, debe elegir tipo de firma
    if (mySignature && userHasSignature && !signatureType) {
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

      if (!workflowAssignmentConfirmed) {
        toast('Confirmá la asignación de firmas en el panel de Flujo de Firmas', { position: 'top-right' });
        setFlowPanelOpen(true);
        setTimeout(() => {
          workflowAssignmentCtaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
        return;
      }
    }

    setLoading(true);

    // FASE 3.C: Timeout tracking (P0.6)
    let timeoutWarning: ReturnType<typeof setTimeout> | null = null;

    // FASE 3.A: Show progress (P0.5)
    setCertifyProgress({
      stage: 'preparing',
      message: ''
    });

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

        const tempCreated = await createSourceTruth({
          name: file.name,
          mime_type: file.type || 'application/pdf',
          size_bytes: file.size,
          hash: sourceHash,
          custody_mode: 'hash_only',
          storage_path: null
        });
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
          const storagePath = await storeEncryptedCustody(file, canonicalDocumentId);

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
      // FLUJO 1: Firmas Múltiples (Caso B) - Enviar emails y terminar
      if (workflowEnabled) {
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

        // UX gate: require explicit confirmation inside "Flujo de Firmas" panel.
        if (!workflowAssignmentConfirmed) {
          toast('Confirmá la asignación de firmas en el panel de Flujo de Firmas', { position: 'top-right' });
          setFlowPanelOpen(true);
          setTimeout(() => {
            workflowAssignmentCtaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 0);
          setLoading(false);
          return;
        }

        // SPRINT 5: Si hay campos configurados, estamparlos en el PDF antes de enviar
        let fileToSend = file;
        if (signatureFields.length > 0) {
          try {
            console.log('📋 Estampando campos preparados para firmantes...');

            const overlaySpec = convertToOverlaySpec(
              signatureFields,
              null, // No incluir firma del owner en workflow
              VIRTUAL_PAGE_WIDTH,
              VIRTUAL_PAGE_HEIGHT,
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
            VIRTUAL_PAGE_WIDTH,
            VIRTUAL_PAGE_HEIGHT
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
          const workflowResult = await startSignatureWorkflow({
            documentUrl: signedUrlData.signedUrl,
            documentHash,
            originalFilename: file.name,
            documentEntityId: canonicalDocumentId || undefined,
            signers: validSigners,
            forensicConfig: {
              rfc3161: forensicEnabled && forensicConfig.useLegalTimestamp,
              polygon: forensicEnabled && forensicConfig.usePolygonAnchor,
              bitcoin: forensicEnabled && forensicConfig.useBitcoinAnchor
            }
          });

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
              reason: 'signature_applied',
              executed_at: new Date().toISOString(),
              metadata: {
                overlay_spec: overlaySpec,
                actor: 'owner',
                signature_type: signatureType
              }
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
            // Actualizar witness_current_storage_path con el path de descarga (plaintext)
            // El path de custody (cifrado) queda como backup, pero el de descarga es el importante
            const { error: updateError } = await supabase
              .from('document_entities')
              .update({ witness_current_storage_path: downloadPath })
              .eq('id', canonicalDocumentId);

            if (updateError) {
              throw new Error('WITNESS_PATH_UPDATE_FAILED');
            } else {
              console.log('✅ witness_current_storage_path updated to downloadable path:', downloadPath);
              witnessStorageReady = true;
            }
          }

          await ensureWitnessCurrent(canonicalDocumentId, {
            hash: witnessHash,
            mime_type: 'application/pdf',
            storage_path: downloadPath,
            status: 'generated'
          });

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
      if (savedDoc?.id) {
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
        : new Uint8Array(rawEcoBuffer as ArrayBuffer);
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

    if (mySignature && userHasSignature && signatureType) {
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
      if (!userHasSignature) return false;
      if (!signatureType) return false;
    }

    // Si "Flujo" activo: debe tener ≥1 mail VÁLIDO, ≥1 campo, y confirmación explícita.
    if (workflowEnabled) {
      if (!emailInputs.some(e => isValidEmail(e.email.trim()).valid)) return false;
      if (signatureFields.length === 0) return false;
      if (!workflowAssignmentConfirmed) return false;
    }

    // NDA nunca bloquea

    return true;
  };

  const signerCount = emailInputs.filter((input) => input.email.trim()).length;

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
  const isViewerLocked = isCanvasLocked && !isDocumentFocus;
  const isPdfPreview =
    !!documentPreview &&
    (file?.type?.toLowerCase().includes('pdf') ||
      (file?.name?.toLowerCase().endsWith('.pdf') ?? false) ||
      documentPreview.startsWith('blob:') ||
      documentPreview.toLowerCase().includes('.pdf'));
  const usePdfEditMode = isPdfPreview && !pdfEditError;

  const createFieldId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `field-${Date.now()}`);
  const VIRTUAL_PAGE_WIDTH = 1000;
  const VIRTUAL_PAGE_HEIGHT = 1414;

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

      await saveDraftOperation(
        { name: file.name },
        [file],
        custodyModeChoice,
        overlaySpec,
        signaturePreviewValue,
        ndaEnabled
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
                <div className="-mx-1.5 -mt-1.5 px-2 py-1.5 border-b border-gray-200 flex items-center justify-between bg-white">
                  <div className="text-sm font-semibold text-gray-900">Centro Legal</div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setHeaderMenuOpen((prev) => !prev)}
                      className="h-7 w-7 inline-flex items-center justify-center text-gray-500 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors"
                      title="Opciones"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {headerMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
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
              <div className="h-full w-full px-6 py-3">
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
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                                      />
                                      {/* Título principal */}
                                      <p className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
                                        Arrastrá tu documento o hacé clic para elegirlo
                                      </p>
                                      {/* Ícono del dropzone */}
                                      <FileText className="w-12 h-12 text-gray-900 mx-auto mb-4" />
                                      {/* Texto de formatos */}
      <p className="text-xs text-gray-500 mt-2">
        PDF, Word, Excel, imágenes (máx 50MB)
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
                    <div className={`bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between ${isPreviewFullscreen ? 'sticky top-0 z-10' : ''}`}>
                        <div className="flex items-center gap-2">
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
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                            {userHasSignature && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle2 className="w-3 h-3" />
                                Firmado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      {/* Iconos alineados en la misma línea */}
                      <div className="flex items-center gap-1.5">
                        {documentPreview && (
                          <button
                            type="button"
                            onClick={addTextField}
                            className={`hidden md:inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                              isViewerLocked ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                            title="Agregar campo de texto"
                          >
                            <PlusSquare className="w-4 h-4" />
                          </button>
                        )}
                        {documentPreview && signatureFields.length > 0 && (
                          <button
                            type="button"
                            onClick={duplicateBatch}
                            className={`hidden md:inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                              isViewerLocked ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                            title="Duplicar todos los campos"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                        {documentPreview && (
                          <button
                            type="button"
                            onClick={() => setIsCanvasLocked((prev) => !prev)}
                            className="hidden md:inline-flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                            title={isCanvasLocked ? 'Desbloquear posiciones' : 'Fijar posiciones'}
                          >
                            {isCanvasLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                        )}
                        {documentPreview && (
                          <button
                            onClick={() => {
                              setFocusView((prev) => (prev === 'document' ? null : 'document'));
                            }}
                            className="hidden md:inline-flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                            title={isDocumentFocus ? 'Volver al Centro Legal' : 'Ver en grande'}
                          >
                            {isDocumentFocus ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
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
                        <label className="h-7 w-7 inline-flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-md transition-colors cursor-pointer" title="Cambiar documento">
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleFileSelect}
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                          />
                          <RefreshCw className="w-4 h-4" />
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
                      {documentLoaded && ndaEnabled && !ndaPanelOpen && !isFocusMode && (
                        <button
                          type="button"
                          onClick={() => setNdaPanelOpen(true)}
                          className="absolute left-0 top-16 h-7 w-7 -translate-x-1/2 rounded-md bg-white border border-gray-200 text-gray-500 hover:text-gray-900 shadow-sm opacity-0 group-hover:opacity-100 transition"
                          title="Mostrar panel de NDA"
                        >
                          <ChevronRight className="w-4 h-4 mx-auto" />
                        </button>
                      )}
                      {documentLoaded && workflowEnabled && !flowPanelOpen && !isFocusMode && (
                        <button
                          type="button"
                          onClick={() => setFlowPanelOpen(true)}
                          className="absolute right-0 top-16 h-7 w-7 translate-x-1/2 rounded-md bg-white border border-gray-200 text-gray-500 hover:text-gray-900 shadow-sm opacity-0 group-hover:opacity-100 transition"
                          title="Mostrar panel de flujo"
                        >
                          <ChevronLeft className="w-4 h-4 mx-auto" />
                        </button>
                      )}
                          {documentPreview && file.type.startsWith('image/') && (
                            <img
                              src={documentPreview}
                              alt="Preview"
                              className="max-w-full max-h-full object-contain"
                            />
                          )}
                          
                          {documentPreview && isPdfPreview && (
                            <>
                              {(
                                <PdfEditViewer
                                  src={documentPreview}
                                  locked={isViewerLocked}
                                  virtualWidth={VIRTUAL_PAGE_WIDTH}
                                  scale={virtualScale}
                                  scrollRef={pdfScrollRef}
                                  onError={() => setPdfEditError(true)}
                                  onMetrics={(metrics) => {
                                    setPdfPageMetrics(metrics);
                                    setPdfEditError(false);
                                  }}
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
                          
                          {!documentPreview && (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                              <div className="text-center">
                                <FileText className="w-16 h-16 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Vista previa no disponible</p>
                                <p className="text-xs">El archivo se procesará al certificar</p>
                              </div>
                            </div>
                          )}

                          {documentPreview && !usePdfEditMode && isPdfPreview && (signatureFields.length > 0 || (mySignature && signaturePreview)) && (
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
                        onChange={(e) => setNdaText(e.target.value)}
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
                      // P0.3: If enabling, validate TSA connectivity first
                      if (newState) {
                        setIsValidatingTSA(true);
                        const tsaAvailable = await validateTSAConnectivity();
                        setIsValidatingTSA(false);

                        if (!tsaAvailable) {
                          toast.error(
                            'El servicio de timestamping no está disponible en este momento.\n\nReintentá en unos minutos o contactá soporte.',
                            {
                              duration: 6000,
                              position: 'bottom-right',
                              style: {
                                whiteSpace: 'pre-line',
                                maxWidth: '500px'
                              }
                            }
                          );
                          return; // Don't enable
                        }

                        // TSA is available, enable protection
                        setForensicEnabled(true);
                        toast('🛡️ Protección activada — Este documento quedará respaldado por EcoSign.', {
                          duration: 3000,
                          position: 'top-right'
                        });
                      } else {
                        // Disabling protection (no validation needed)
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
                      setMySignature(newState);
                      if (newState && file) {
                        setIsCanvasLocked(false);
                        setShowSignatureOnPreview(true);
                      }
                    }}
                    disabled={!file}
                    hasFile={!!file}
                  />
                  {/* PASO 3.2.2: Toggle Flujo - Módulo refactorizado */}
                  <SignatureFlowToggle
                    enabled={workflowEnabled}
                    onToggle={(next) => {
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
                          {!ndaAccordionOpen && <span className="text-green-700">NDA aceptado ✓</span>}
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
                            onChange={(e) => setNdaText(e.target.value)}
                            className="w-full h-64 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none font-mono"
                            placeholder="Escribí aquí el texto del NDA..."
                          />
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
                                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                                  />
                                  {emailInputs.length > 1 && (
                                    <button
                                      onClick={() => handleRemoveEmailField(index)}
                                      className="text-gray-400 hover:text-red-600 transition-colors p-1"
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
                                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          <button
                            onClick={handleAddEmailField}
                            className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors flex items-center justify-center gap-2 mb-4"
                          >
                            <Users className="w-4 h-4" />
                            Agregar otro firmante
                          </button>

                          <div className="p-3 bg-gray-100 border border-gray-200 rounded-lg">
                            <div className="flex gap-2">
                              <Shield className="w-4 h-4 text-gray-900 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-gray-900">
                                  Seguridad obligatoria
                                </p>
                                <p className="text-xs text-gray-700 mt-1">
                                  Podés exigir login y NDA por firmante antes de firmar
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

              {/* Tipo de Firma - Solo si hay firma aplicada o workflow SIN mi firma */}
              {documentLoaded && ((mySignature && userHasSignature) || (workflowEnabled && !mySignature)) && !isFocusMode && (
              <div className="space-y-2 animate-fadeScaleIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Firma Legal */}
                  <button
                    type="button"
                    onClick={() => {
                      setSignatureType('legal');
                      showToast('Firma legal seleccionada', { type: 'success', duration: 2000 });
                    }}
                    className={`px-4 py-2 rounded-lg border text-left transition ${
                      signatureType === 'legal'
                        ? 'border-blue-900 text-blue-900 bg-transparent'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        Firma Legal
                      </p>
                      <div className="group relative">
                        <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                        <div className="invisible group-hover:visible absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50">
                          Firma válida para acuerdos cotidianos. Rápida, privada y simple.
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {!isEnterprisePlan && `${ecosignUsed}/${ecosignTotal} usadas`}
                      {isEnterprisePlan && 'Ilimitadas'}
                    </p>
                  </button>

                  {/* Firma Certificada */}
                  <button
                    type="button"
                    onClick={() => {
                      setSignatureType('certified');
                      setShowCertifiedModal(true);
                      showToast('Firma certificada seleccionada', { type: 'success', duration: 2000 });
                    }}
                    className={`px-4 py-2 rounded-lg border text-left transition ${
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
                        <div className="invisible group-hover:visible absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50">
                          Para contratos que exigen certificación oficial según tu país.
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {certifiedSubType ? `Tipo: ${certifiedSubType}` : 'Seleccionar tipo'}
                    </p>
                  </button>
                </div>
              </div>
              )}

              {/* Botón principal */}
              {!isFocusMode && (
              <div className="hidden md:block">
                <button
                  ref={finalizeButtonRef}
                  onClick={handleProtectClick}
                  disabled={!file || loading || !isCTAEnabled()}
                  className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg px-5 py-3 font-medium transition-colors flex items-center justify-center gap-2"
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
              <div className="md:hidden sticky bottom-0 bg-white pt-2 pb-3 border-t border-gray-200">
                <button
                  onClick={handleProtectClick}
                  disabled={!file || loading || !isCTAEnabled()}
                  className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg px-5 py-3 font-medium transition-colors flex items-center justify-center gap-2"
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
                onFocus={() => setFocusView('nda')}
                onClose={() => setNdaPanelOpen(false)}
                onSave={(ndaData) => {
                  setNdaText(ndaData.content);
                  console.log('NDA saved:', ndaData);
                }}
              />
            ) : undefined
          }
          rightOverlay={
            !isMobile && documentLoaded && workflowEnabled && !isFocusMode ? (
              <div className="h-full flex flex-col bg-white">
                {/* Header colapsable del panel */}
            <div className="px-2 py-1.5 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Flujo de Firmas</h3>
                <button
                  onClick={() => setFlowPanelOpen(false)}
                  className="h-7 w-7 inline-flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                  title="Ocultar panel"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contenido del panel */}
            <div className="px-3 py-2 overflow-y-auto flex-1">
              <p className="text-xs text-gray-500 mb-4">
                Agregá un email por firmante. Las personas firmarán en el orden que los agregues.
              </p>

              <div className="mb-3">
                <button
                  type="button"
                  onClick={openSignerFieldsWizard}
                  disabled={buildSignersList().length === 0}
                  className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                >
                  Configurar campos (recomendado)
                </button>
                <p className="mt-1 text-[11px] text-gray-500">
                  Define qué completará cada firmante y dónde se reflejará en el PDF.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    if (signatureFields.length === 0) {
                      openSignerFieldsWizard();
                      return;
                    }

                    setSignatureFields((prev) =>
                      reorderFieldsBySignerBatches(prev, {
                        virtualWidth: VIRTUAL_PAGE_WIDTH,
                        virtualHeight: VIRTUAL_PAGE_HEIGHT
                      })
                    );
                    showToast('Campos reordenados.', { type: 'success', duration: 1500, position: 'top-right' });
                  }}
                  disabled={signatureFields.length === 0}
                  className="mt-2 w-full bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 rounded-lg px-3 py-2 text-sm font-medium transition-colors border border-gray-200"
                >
                  Reordenar automáticamente
                </button>
              </div>

              {/* Firmantes (email) + asignación contextual de campos */}
              {(() => {
                const validSigners = buildSignersList();
                const { batches } = resolveBatchAssignments(signatureFields, validSigners);
                const signerEmailSet = new Set(validSigners.map((s) => normalizeEmail(s.email)));

                const getBatchLabel = (batchId: string) => {
                  const idx = batches.findIndex((b) => b.id === batchId);
                  return idx >= 0 ? `Grupo ${idx + 1}` : 'Grupo';
                };

                const unassignedOrUnknownBatches = batches.filter((b) => {
                  const assigned = normalizeEmail(b.assignedSignerEmail);
                  if (!assigned) return true;
                  return !signerEmailSet.has(assigned);
                });

                return (
                  <div ref={workflowAssignmentSectionRef} className="space-y-2 mb-4">
                    {emailInputs.map((input, index) => {
                      const rawEmail = input.email.trim();
                      const emailOk = rawEmail ? isValidEmail(rawEmail).valid : false;
                      const emailNorm = normalizeEmail(rawEmail);

                      const signerBatches = emailOk
                        ? batches.filter((b) => normalizeEmail(b.assignedSignerEmail) === emailNorm)
                        : [];

                      const isExpanded = expandedSignerIndex === index;
                      const assignedCount = signerBatches.reduce((acc, b) => acc + b.fields.length, 0);

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
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                            />
                            {emailInputs.length > 1 && (
                              <button
                                onClick={() => handleRemoveEmailField(index)}
                                className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                title="Eliminar firmante"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setExpandedSignerIndex((prev) => (prev === index ? null : index))}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            disabled={!emailOk}
                            title={!emailOk ? 'Ingresá un email válido para asignar campos' : 'Ver / asignar campos'}
                          >
                            <div className="min-w-0 text-left">
                              <p className="text-xs font-semibold text-gray-900">Campos de este firmante</p>
                              <p className={`text-[11px] ${assignedCount > 0 ? 'text-gray-600' : 'text-gray-500'}`}>
                                {assignedCount > 0 ? `${assignedCount} campo(s) asignado(s)` : 'Sin campos asignados'}
                              </p>
                            </div>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                          </button>

                          {emailOk && isExpanded && (
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 space-y-2">
                              {signerBatches.length > 0 ? (
                                <div className="space-y-2">
                                  {signerBatches.map((b) => (
                                    <div key={b.id} className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1.5">
                                      <div className="min-w-0">
                                        <p className="text-xs font-medium text-gray-900 truncate">{getBatchLabel(b.id)}</p>
                                        <p className="text-[11px] text-gray-500">{b.fields.length} campo(s)</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setActiveBatchId(b.id)}
                                          className="text-xs text-gray-700 hover:text-gray-900 underline"
                                        >
                                          Activar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => assignBatchToSignerEmail(b.id, null)}
                                          className="text-xs text-gray-500 hover:text-gray-900 underline"
                                        >
                                          Quitar
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-gray-600">Todavía no hay grupos asignados a este firmante.</p>
                              )}

                              {unassignedOrUnknownBatches.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <select
                                    value=""
                                    onChange={(e) => {
                                      const batchId = e.target.value;
                                      if (!batchId) return;
                                      assignBatchToSignerEmail(batchId, rawEmail);
                                      setActiveBatchId(batchId);
                                    }}
                                    className="flex-1 text-xs px-2 py-2 border border-gray-300 rounded-md bg-white"
                                  >
                                    <option value="">Asignar un grupo existente…</option>
                                    {unassignedOrUnknownBatches.map((b) => (
                                      <option key={b.id} value={b.id}>
                                        {getBatchLabel(b.id)} ({b.fields.length} campo(s))
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => createTextBatchForSigner(rawEmail)}
                                    className="text-xs bg-gray-900 hover:bg-gray-800 text-white rounded-md px-3 py-2 font-medium"
                                  >
                                    Nuevo grupo
                                  </button>
                                </div>
                              )}

                              {unassignedOrUnknownBatches.length === 0 && (
                                <button
                                  type="button"
                                  onClick={() => createTextBatchForSigner(rawEmail)}
                                  className="w-full text-xs bg-gray-900 hover:bg-gray-800 text-white rounded-md px-3 py-2 font-medium"
                                >
                                  Nuevo grupo
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Botón para agregar más firmantes */}
              <button
                onClick={handleAddEmailField}
                className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors flex items-center justify-center gap-2 mb-4"
              >
                <Users className="w-4 h-4" />
                Agregar otro firmante
              </button>

              {/* Info de seguridad */}
              <div className="p-2 bg-gray-100 border border-gray-200 rounded-lg">
                <div className="flex gap-2">
                  <Shield className="w-4 h-4 text-gray-900 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-900">
                      Seguridad obligatoria
                    </p>
                    <p className="text-xs text-gray-700 mt-1">
                      Podés exigir login y NDA por firmante antes de firmar
                    </p>
                  </div>
                </div>
                </div>

              {/* CTA propio del Flujo de Firmas: confirmar asignación */}
              {signatureFields.length > 0 && (
                <div ref={workflowAssignmentCtaRef} className="mt-3">
                  {(() => {
                    const validSigners = buildSignersList();
                    const { batches, unassignedBatches } = resolveBatchAssignments(signatureFields, validSigners);

                    const signerEmailSet = new Set(validSigners.map((s) => normalizeEmail(s.email)));
                    const invalidAssignedCount = batches.filter((b) => {
                      const assigned = normalizeEmail(b.assignedSignerEmail);
                      return Boolean(assigned) && !signerEmailSet.has(assigned);
                    }).length;

                    const assignedEmails = new Set(
                      batches
                        .map((b) => normalizeEmail(b.assignedSignerEmail))
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

                    const scrollToAssignment = () => {
                      setFlowPanelOpen(true);
                      setTimeout(() => {
                        workflowAssignmentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 0);
                    };

                    if (!isComplete) {
                      return (
                        <div className="rounded-lg border border-gray-200 bg-white p-2">
                          <button
                            type="button"
                            onClick={scrollToAssignment}
                            className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                          >
                            Asignar campos a firmantes
                          </button>
                          <p className="mt-1 text-[11px] text-gray-500">
                            Falta asignar grupos o hay firmantes sin campos.
                          </p>
                        </div>
                      );
                    }

                    if (!workflowAssignmentConfirmed) {
                      return (
                        <div className="rounded-lg border border-gray-200 bg-white p-2">
                          <button
                            type="button"
                            onClick={() => {
                              setWorkflowAssignmentConfirmed(true);
                              showToast('Asignación confirmada', { type: 'success', duration: 2000 });
                            }}
                            className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                          >
                            Confirmar asignación de firmas
                          </button>
                          <p className="mt-1 text-[11px] text-gray-500">
                            {groupsCount} grupo(s) asignado(s) a {signersCount} firmante(s).
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-700" />
                          <p className="text-sm font-medium text-green-900">Asignación confirmada</p>
                        </div>
                        <p className="mt-0.5 text-[11px] text-green-800">
                          {groupsCount} grupo(s) asignado(s) a {signersCount} firmante(s).
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

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
                onClose={() => setNdaEnabled(false)}
                onSave={(ndaData) => {
                  setNdaText(ndaData.content);
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
      onClose={() => setShowSignerFieldsWizard(false)}
      signers={buildSignersList().map((s) => ({ email: s.email, signingOrder: s.signingOrder }))}
      virtualWidth={VIRTUAL_PAGE_WIDTH}
      virtualHeight={VIRTUAL_PAGE_HEIGHT}
      totalPages={pdfPageMetrics.length > 0 ? pdfPageMetrics.length : null}
      onApply={(result) => {
        const fields = result.fields;
        if (signatureFields.length > 0) {
          const ok = window.confirm('Esto va a reemplazar los campos existentes. ¿Continuar?');
          if (!ok) return;
        }

        setSignatureFields(fields);
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
