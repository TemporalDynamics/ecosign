import React, { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { X, ArrowLeft, ChevronDown, ChevronUp, CheckCircle2, FileCheck, FileText, HelpCircle, Highlighter, Loader2, Maximize2, Minimize2, Pen, Shield, Type, Upload, Users, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ToastOptions as HotToastOptions } from 'react-hot-toast';
import '../styles/legalCenterAnimations.css';
import { certifyFile, downloadEcox } from '../lib/basicCertificationWeb';
import { saveUserDocument } from '../utils/documentStorage';
import { startSignatureWorkflow } from '../lib/signatureWorkflowService';
import { useSignatureCanvas } from '../hooks/useSignatureCanvas';
import { applySignatureToPDF, blobToFile, addSignatureSheet } from '../utils/pdfSignature';
import type { ForensicData } from '../utils/pdfSignature';
import { signWithSignNow } from '../lib/signNowService';
import { EventHelpers } from '../utils/eventLogger';
import { getSupabase } from '../lib/supabaseClient';
import { isGuestMode } from '../utils/guestMode';
import InhackeableTooltip from './InhackeableTooltip';
import { useLegalCenterGuide } from '../hooks/useLegalCenterGuide';
import LegalCenterWelcomeModal from './LegalCenterWelcomeModal';
import { trackEvent } from '../lib/analytics';

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

  // Estados de paneles colapsables
  const [sharePanelOpen, setSharePanelOpen] = useState(false);
  const [showProtectionModal, setShowProtectionModal] = useState(false);

  // Configuración de protección legal (activo por defecto con TSA + Polygon + Bitcoin)
  const [forensicEnabled, setForensicEnabled] = useState(true);
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
  const PREVIEW_BASE_HEIGHT = 'h-[480px]';
  const previewBaseHeight = isMobile ? 'h-[40vh]' : PREVIEW_BASE_HEIGHT;
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('compact'); // 'compact' | 'expanded' | 'fullscreen'
  const [showSignatureOnPreview, setShowSignatureOnPreview] = useState(false);
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

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setDocumentLoaded(true); // CONSTITUCIÓN: Controlar visibilidad de acciones
      setPreviewError(false);
      console.log('Archivo seleccionado:', selectedFile.name);

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
    const oldEmail = emailInputs[index].email;
    const newInputs = [...emailInputs];
    newInputs[index] = { ...newInputs[index], email: value };
    setEmailInputs(newInputs);

    // CONSTITUCIÓN: Toast "Destinatario agregado correctamente" (líneas 441-451)
    // Mostrar solo cuando el email cambia de inválido/vacío a válido
    const wasValid = isValidEmail(oldEmail.trim()).valid;
    const isNowValid = isValidEmail(value.trim()).valid;

    if (!wasValid && isNowValid) {
      showToast('Destinatario agregado correctamente.', {
        type: 'success',
        duration: 2000,
        position: 'top-right'
      });
    }
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

    setLoading(true);
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

        // Subir el PDF a Storage y obtener URL firmable
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const documentHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

        const storagePath = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('user-documents')
          .upload(storagePath, file, {
            contentType: file.type || 'application/pdf',
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

        // Iniciar workflow en backend (crea notificaciones y dispara send-pending-emails)
        try {
          const workflowResult = await startSignatureWorkflow({
            documentUrl: signedUrlData.signedUrl,
            documentHash,
            originalFilename: file.name,
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

      // Preparar archivo con Hoja de Auditoría (SOLO para Firma Legal)
      let fileToProcess = file;

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
        const pdfWithSheet = await addSignatureSheet(file, signatureData, forensicData);
        fileToProcess = blobToFile(pdfWithSheet, file.name);
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
            useLegalTimestamp: forensicEnabled && forensicConfig.useLegalTimestamp,
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
            useLegalTimestamp: forensicEnabled && forensicConfig.useLegalTimestamp,
            usePolygonAnchor: forensicEnabled && forensicConfig.usePolygonAnchor,
            useBitcoinAnchor: forensicEnabled && forensicConfig.useBitcoinAnchor,
            signatureData: signatureData
          });
        }
      } else {
        // ✅ Usar motor interno (Firma Legal)
        console.log('📝 Usando motor interno de Firma Legal');
        certResult = await certifyFile(fileToProcess, {
          useLegalTimestamp: forensicEnabled && forensicConfig.useLegalTimestamp,
          usePolygonAnchor: forensicEnabled && forensicConfig.usePolygonAnchor,
          useBitcoinAnchor: forensicEnabled && forensicConfig.useBitcoinAnchor,
          signatureData: signatureData
        });
      }

      // 2. Guardar en Supabase (guardar el PDF procesado, no el original)
      // Status inicial: 'signed' si ya se firmó, 'draft' si no hay firmantes
      const initialStatus = (signatureType === 'legal' || signatureType === 'certified') ? 'signed' : 'draft';
      const overallStatus = initialStatus === 'signed' ? 'certified' : initialStatus;

      // ✅ REFACTOR: Blockchain anchors no bloquean certificación
      // Los anchors se marcan como 'pending' y se resuelven async
      const savedDoc = await saveUserDocument(fileToProcess, certResult.ecoData, {
        hasLegalTimestamp: forensicEnabled && forensicConfig.useLegalTimestamp,
        hasPolygonAnchor: forensicEnabled && forensicConfig.usePolygonAnchor,
        hasBitcoinAnchor: forensicEnabled && forensicConfig.useBitcoinAnchor,
        initialStatus: initialStatus,
        overallStatus,
        downloadEnabled: true, // ✅ Siempre true - .eco disponible inmediatamente
        ecoBuffer: certResult?.ecoxBuffer,
        ecoFileData: certResult?.ecoxBuffer, // ✅ Guardar buffer ECO para deferred download
        ecoFileName: certResult?.fileName ? certResult.fileName.replace(/\.[^/.]+$/, '.eco') : file.name.replace(/\.[^/.]+$/, '.eco'),
        signNowDocumentId: signNowResult?.signnow_document_id || null,
        signNowStatus: signNowResult?.status || null,
        signedAt: signNowResult ? new Date().toISOString() : null,
        storePdf: true, // ✅ Guardar PDF cifrado para permitir compartir
        zeroKnowledgeOptOut: false // ✅ E2E encryption: guardar cifrado, no plaintext
      });

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
      const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Hubo un problema desconocido al certificar tu documento. Por favor intentá de nuevo.');
      showToast(`Error de certificación: ${errorMessage}`, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    console.log('🔒 Cerrando Centro Legal...');
    setStep(1);
    setFile(null);
    setPreviewError(false);
    setCertificateData(null);
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

      const storagePath = `${user.id}/${Date.now()}-${pdfFile.name}`;
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

    // Validar que haya al menos un email VÁLIDO (no solo no vacío)
    if (workflowEnabled && emailInputs.some(e => isValidEmail(e.email.trim()).valid)) {
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

    // Si "Flujo" activo: debe tener ≥1 mail VÁLIDO (no solo no vacío)
    if (workflowEnabled && !emailInputs.some(e => isValidEmail(e.email.trim()).valid)) return false;

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
  
  const leftColWidth = ndaEnabled ? '320px' : '0px';
  const rightColWidth = workflowEnabled ? '320px' : '0px';
  const centerColWidth = 'minmax(640px, 1fr)';
  
  // En mobile, usar grid de 1 columna
  const gridTemplateColumns = isMobile
    ? '1fr'
    : `${leftColWidth} ${centerColWidth} ${rightColWidth}`;
  const isPreviewFullscreen = isMobile && previewMode === 'fullscreen';

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-0 py-0 md:px-4 md:py-6">
        <div className="modal-container bg-white rounded-none md:rounded-2xl w-full max-w-7xl max-h-full md:max-h-[94vh] h-[100svh] md:h-auto shadow-xl flex flex-col overflow-hidden">
        {/* Header fijo sobre todo el grid */}
        <div className="sticky top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Centro Legal
            </h2>
            {modeConfirmation && (
              <span className="text-sm text-gray-500 animate-fadeIn">
                {modeConfirmation}
              </span>
            )}
          </div>
          <button
            onClick={resetAndClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content - Grid fijo de 3 zonas con colapso suave */}
        <div
          className="relative overflow-x-hidden overflow-y-auto grid flex-1"
          style={{ gridTemplateColumns, transition: 'grid-template-columns 300ms ease-in-out' }}
        >
          {/* Left Panel (NDA) */}
          {documentLoaded && (
          <div className={`left-panel h-full border-r border-gray-200 bg-gray-50 transition-all duration-300 ease-in-out hidden md:block ${ndaEnabled ? 'md:opacity-100 md:translate-x-0 md:pointer-events-auto md:block' : 'md:opacity-0 md:-translate-x-3 md:pointer-events-none md:hidden'}`}>
            <div className="h-full flex flex-col">
              {/* Header colapsable del panel */}
              <div className="px-4 py-3 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">NDA</h3>
                  <button
                    onClick={() => setNdaEnabled(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Cerrar panel NDA"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {/* Contenido del panel */}
              <div className="px-4 py-4 overflow-y-auto flex-1">
                <p className="text-xs text-gray-600 mb-3">
                  Editá el texto del NDA que los firmantes deberán aceptar antes de acceder al documento.
                </p>
                <textarea
                  value={ndaText}
                  onChange={(e) => setNdaText(e.target.value)}
                  className="w-full h-[500px] px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none font-mono"
                  placeholder="Escribí aquí el texto del NDA..."
                />
              </div>
            </div>
          </div>
          )}
        
          {/* Center Panel (Main Content) */}
          <div className={`center-panel relative z-20 ${isMobile ? 'col-span-full px-4 py-3' : 'col-start-2 col-end-3 px-6 py-3'}`}>
            {/* PASO 1: ELEGIR ARCHIVO */}
            {step === 1 && (
              <div className={`space-y-3 ${isMobile ? 'pb-24' : ''}`}>
              <div>
                {/* Zona de drop / Preview del documento */}
                                  {!file ? (
                                    <label className="block border-2 border-dashed border-gray-300 rounded-xl py-10 md:py-20 min-h-[240px] md:min-h-[480px] text-center hover:border-gray-900 transition-colors cursor-pointer">
                                      <input
                                        type="file"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                        accept=".pdf"
                                      />
                                      {/* Título principal */}
                                      <p className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
                                        Arrastrá tu documento o hacé clic para elegirlo
                                      </p>
                                      {/* Ícono del dropzone */}
                                      <FileText className="w-12 h-12 text-gray-900 mx-auto mb-4" />
                                      {/* Texto de formatos */}
                                      <p className="text-xs text-gray-500 mt-2">
                                        Formato PDF (máx 50MB)
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
                                  ) : (                  <div className={`border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-50 ${isPreviewFullscreen ? 'fixed inset-0 z-50 rounded-none border-0 bg-white flex flex-col' : ''}`}>
                    {/* Header del preview */}
                    <div className={`bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between ${isPreviewFullscreen ? 'sticky top-0 z-10' : ''}`}>
                      <div className="flex items-center gap-3">
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
                      <div className="flex items-center gap-2">
                        {documentPreview && (
                          <button
                            onClick={() => {
                              if (isMobile) {
                                setPreviewMode((prev) => prev === 'fullscreen' ? 'compact' : 'fullscreen');
                                return;
                              }
                              // Ciclo simple: compact -> expanded -> compact
                              setPreviewMode((prev) => prev === 'compact' ? 'expanded' : 'compact');
                            }}
                            className="hidden md:inline-flex p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title={previewMode === 'compact' ? 'Ver documento completo' : 'Volver al Centro Legal'}
                          >
                            {previewMode === 'expanded' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                          </button>
                        )}
                        {documentPreview && (
                          <button
                            onClick={() => {
                              setPreviewMode((prev) => prev === 'fullscreen' ? 'compact' : 'fullscreen');
                            }}
                            className="md:hidden text-xs font-semibold text-gray-900 px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
                          >
                            {isPreviewFullscreen ? 'Volver al Centro Legal' : 'Ver documento completo'}
                          </button>
                        )}
                        <label className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer flex items-center" title="Cambiar documento">
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
                    <div className={`relative ${
                      isPreviewFullscreen ? 'flex-1' : previewMode === 'expanded' ? 'h-[60vh]' : previewBaseHeight
                    } bg-gray-100`}>
                          {/* Placeholders de campos de firma (workflow) */}
                          {workflowEnabled && emailInputs.filter(input => input.email.trim()).length > 0 && (
                            <div className="absolute bottom-4 right-4 z-10 space-y-2">
                              {emailInputs.filter(input => input.email.trim()).map((input, idx) => (
                                <div
                                  key={idx}
                                  className="bg-blue-50 border-2 border-blue-400 border-dashed rounded-lg px-3 py-2 shadow-sm"
                                  style={{ width: '180px' }}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <Pen className="w-3 h-3 text-blue-600" />
                                    <p className="text-xs font-semibold text-blue-900">
                                      Campo de firma {idx + 1}
                                    </p>
                                  </div>
                                  <p className="text-xs text-blue-700 truncate">
                                    {input.name || input.email.split('@')[0]}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                          {documentPreview && file.type.startsWith('image/') && (
                            <img
                              src={documentPreview}
                              alt="Preview"
                              className="max-w-full max-h-full object-contain"
                            />
                          )}
                          
                          {documentPreview && file.type === 'application/pdf' && (
                            <>
                              {isMobile ? (
                                <div className="w-full h-full bg-white">
                                  <iframe
                                    title="Vista previa PDF"
                                    src={documentPreview}
                                    className="w-full h-full"
                                  />
                                </div>
                              ) : (
                                <>
                                  {!previewError && (
                                    <object
                                      data={documentPreview}
                                      type="application/pdf"
                                      className="w-full h-full bg-white"
                                      onLoad={() => setPreviewError(false)}
                                      onError={() => setPreviewError(true)}
                                    >
                                      <p className="text-sm text-gray-500 p-4">
                                        No se pudo mostrar el PDF en el navegador. Descargalo para verlo.
                                      </p>
                                    </object>
                                  )}
                                  {previewError && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white px-6 text-center">
                                      <div className="space-y-2">
                                        <p className="text-sm font-semibold text-gray-900">
                                          Vista previa desactivada para este PDF.
                                        </p>
                                        <p className="text-xs text-gray-600">
                                          Abrilo en otra pestaña o descargalo para conservar la integridad del archivo.
                                        </p>
                                        <div className="flex items-center justify-center gap-2">
                                          <a
                                            href={documentPreview}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-gray-900 font-semibold hover:underline"
                                          >
                                            Abrir en nueva pestaña
                                          </a>
                                          <span className="text-gray-300">•</span>
                                          <a
                                            href={documentPreview}
                                            download={file?.name || 'documento.pdf'}
                                            className="text-sm text-gray-900 font-semibold hover:underline"
                                          >
                                            Descargar PDF
                                          </a>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </>
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
                                    <div className="space-y-4">
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
                                    <div className="space-y-4">
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
                                      if (!file) return;

                                      // Validar que el archivo sea un PDF
                                      if (file.type !== 'application/pdf') {
                                        toast.error('Solo se puede aplicar firma a archivos PDF. Por favor, seleccioná un archivo PDF.');
                                        return;
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

              {/* CONSTITUCIÓN: Acciones solo visibles si documentLoaded */}
              {documentLoaded && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNdaEnabled(!ndaEnabled)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      ndaEnabled
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    NDA
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newState = !mySignature;
                      setMySignature(newState);
                      // CONSTITUCIÓN: Si se activa "Mi Firma", abrir modal + toast
                      if (newState && file) {
                        setShowSignatureOnPreview(true);
                        
                        toast('Vas a poder firmar directamente sobre el documento.', {
                          icon: '✍️',
                          position: 'top-right',
                          duration: 3000
                        });
                      }
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      mySignature
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Mi Firma
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newState = !workflowEnabled;
                      setWorkflowEnabled(newState);
                      
                      // CONSTITUCIÓN: Toast al activar flujo
                      if (newState) {
                        toast('Agregá los correos de las personas que deben firmar o recibir el documento.', {
                          position: 'top-right',
                          duration: 3000
                        });
                      }
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      workflowEnabled
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Flujo de Firmas
                  </button>
                </div>
              </div>
              )}

              {documentLoaded && isMobile && (ndaEnabled || workflowEnabled) && (
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

                          <div className="space-y-4 mb-4">
                            {emailInputs.map((input, index) => (
                              <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                    {index + 1}
                                  </div>
                                  <input
                                    type="email"
                                    value={input.email}
                                    onChange={(e) => handleEmailChange(index, e.target.value)}
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
                                  Todos los firmantes requieren login y aceptación de NDA antes de firmar
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
              {documentLoaded && ((mySignature && userHasSignature) || (workflowEnabled && !mySignature)) && (
              <div className="space-y-2 animate-fadeScaleIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Firma Legal */}
                  <button
                    type="button"
                    onClick={() => {
                      setSignatureType('legal');
                      showToast('Firma legal seleccionada', { type: 'success', duration: 2000 });
                    }}
                    className={`p-4 rounded-lg border-2 transition text-left ${
                      signatureType === 'legal'
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-semibold text-gray-900">
                        Firma Legal
                      </p>
                      <div className="group relative">
                        <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                        <div className="invisible group-hover:visible absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50">
                          Firma válida para acuerdos cotidianos. Rápida, privada y simple.
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
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
                    className={`p-4 rounded-lg border-2 transition text-left ${
                      signatureType === 'certified'
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-semibold text-gray-900">
                        Firma Certificada
                      </p>
                      <div className="group relative">
                        <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                        <div className="invisible group-hover:visible absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50">
                          Para contratos que exigen certificación oficial según tu país.
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {certifiedSubType ? `Tipo: ${certifiedSubType}` : 'Seleccionar tipo'}
                    </p>
                  </button>
                </div>
              </div>
              )}

              {/* Botón principal */}
              <div className="hidden md:block">
                <button
                  ref={finalizeButtonRef}
                  onClick={handleCertify}
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
              <div className="md:hidden sticky bottom-0 bg-white pt-2 pb-3 border-t border-gray-200">
                <button
                  onClick={handleCertify}
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
            </div>
          )}

          {/* PASO 2: Eliminado - ya no es necesario porque los documentos se encriptan */}
          </div>

          {/* Right Panel (Workflow) */}
          <div className={`right-panel col-start-3 col-end-4 h-full border-l border-gray-200 bg-gray-50 transition-all duration-300 ease-in-out hidden md:block ${workflowEnabled ? 'md:opacity-100 md:translate-x-0 md:pointer-events-auto md:block' : 'md:opacity-0 md:translate-x-3 md:pointer-events-none md:hidden'}`}>
          <div className="h-full flex flex-col">
            {/* Header colapsable del panel */}
            <div className="px-4 py-3 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Flujo de Firmas</h3>
                <button
                  onClick={() => setWorkflowEnabled(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Cerrar panel de firmantes"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contenido del panel */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <p className="text-xs text-gray-500 mb-4">
                Agregá un email por firmante. Las personas firmarán en el orden que los agregues.
              </p>

              {/* Campos de email con switches individuales */}
              <div className="space-y-4 mb-4">
                {emailInputs.map((input, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                    {/* Header con número, email y nombre opcional */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {index + 1}
                      </div>
                      <input
                        type="email"
                        value={input.email}
                        onChange={(e) => handleEmailChange(index, e.target.value)}
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

              {/* Botón para agregar más firmantes */}
              <button
                onClick={handleAddEmailField}
                className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors flex items-center justify-center gap-2 mb-4"
              >
                <Users className="w-4 h-4" />
                Agregar otro firmante
              </button>

              {/* Info de seguridad */}
              <div className="p-3 bg-gray-100 border border-gray-200 rounded-lg">
                <div className="flex gap-2">
                  <Shield className="w-4 h-4 text-gray-900 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-900">
                      Seguridad obligatoria
                    </p>
                    <p className="text-xs text-gray-700 mt-1">
                      Todos los firmantes requieren login y aceptación de NDA antes de firmar
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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

      {/* Modal secundario: Protección Legal */}
      {showProtectionModal && (
        <div className="fixed inset-0 bg-white md:bg-black md:bg-opacity-60 flex items-center justify-center z-[60] animate-fadeIn p-0 md:p-6">
          <div className="bg-white rounded-none md:rounded-2xl w-full h-full md:h-auto max-w-md p-6 shadow-2xl animate-fadeScaleIn overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Protección Legal
              </h3>
              <button
                onClick={() => setShowProtectionModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {forensicEnabled
                ? 'Triple protección internacional'
                : 'Activá la protección legal que necesitás'}
            </p>

            {/* Lista de protecciones */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${forensicEnabled ? 'text-green-600' : 'text-gray-400'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">Sello de Tiempo (TSA)</p>
                  <p className="text-xs text-gray-600">Certificación RFC 3161 de fecha y hora exacta</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${forensicEnabled ? 'text-green-600' : 'text-gray-400'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">Registro Inmutable Digital</p>
                  <p className="text-xs text-gray-600">Anclaje en la red Polygon</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${forensicEnabled ? 'text-green-600' : 'text-gray-400'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">Registro Permanente Digital</p>
                  <p className="text-xs text-gray-600">Anclaje en la red Bitcoin</p>
                </div>
              </div>
            </div>

            {/* Toggle de protección */}
            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={() => {
                  const newState = !forensicEnabled;
                  setForensicEnabled(newState);
                  setShowProtectionModal(false);

                  if (newState) {
                    toast('Activaste la protección legal que necesitás', {
                      duration: 6000,
                      position: 'bottom-right',
                      icon: '🛡️',
                      style: {
                        background: '#f3f4f6',
                        color: '#374151',
                      }
                    });
                  } else {
                    toast('Protección legal desactivada. Podés volver a activarla en cualquier momento.', {
                      duration: 6000,
                      position: 'bottom-right',
                      style: {
                        background: '#f3f4f6',
                        color: '#374151',
                      }
                    });
                  }
                }}
                className="w-full py-2 px-4 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                {forensicEnabled ? 'Desactivar protección legal' : 'Activar protección legal'}
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Modal de Bienvenida */}
      <LegalCenterWelcomeModal
        isOpen={showWelcomeModal}
        onAccept={handleWelcomeAccept}
        onReject={handleWelcomeReject}
        onNeverShow={handleWelcomeNeverShow}
      />

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
    </>
  );
};

export default LegalCenterModalV2;
