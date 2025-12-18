import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowLeft, ChevronDown, ChevronUp, CheckCircle2, FileCheck, FileText, HelpCircle, Highlighter, Loader2, Maximize2, Minimize2, Pen, Shield, Type, Upload, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import '../styles/legalCenterAnimations.css';
import { certifyFile, downloadEcox } from '../lib/basicCertificationWeb';
import { saveUserDocument } from '../utils/documentStorage';
import { startSignatureWorkflow } from '../lib/signatureWorkflowService';
import { useSignatureCanvas } from '../hooks/useSignatureCanvas';
import { applySignatureToPDF, blobToFile, addSignatureSheet } from '../utils/pdfSignature';
import { signWithSignNow } from '../lib/signNowService';
import { EventHelpers } from '../utils/eventLogger';
import { anchorToPolygon } from '../lib/polygonAnchor';
import { getSupabase } from '../lib/supabaseClient';
import InhackeableTooltip from './InhackeableTooltip';
import { useLegalCenterGuide } from '../hooks/useLegalCenterGuide';
import LegalCenterWelcomeModal from './LegalCenterWelcomeModal';

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
 * - Sistema de pasos (1: Elegir, 2: Firmar, 3: Listo)
 * - Lógica de certificación completa (handleFinalize)
 * - Contrato con backend (estados, tipos)
 */
const LegalCenterModalV2 = ({ isOpen, onClose, initialAction = null }) => {
  // Estados del flujo
  const [step, setStep] = useState(1); // 1: Elegir, 2: Firmar, 3: Listo
  const [file, setFile] = useState(null);
  const [documentLoaded, setDocumentLoaded] = useState(false); // CONSTITUCIÓN: Control de visibilidad de acciones
  const [loading, setLoading] = useState(false);
  const [certificateData, setCertificateData] = useState(null);

  // Estados de paneles colapsables
  const [sharePanelOpen, setSharePanelOpen] = useState(false);
  const [showProtectionModal, setShowProtectionModal] = useState(false);

  // Configuración de protección legal (activo por defecto con TSA + Polygon + Bitcoin)
  const [forensicEnabled, setForensicEnabled] = useState(true);
  const [forensicConfig, setForensicConfig] = useState({
    useLegalTimestamp: true,    // RFC 3161 TSA
    usePolygonAnchor: true,      // Polygon
    useBitcoinAnchor: true       // Bitcoin
  });

  // Acciones (pueden estar múltiples activas simultáneamente)
  const [mySignature, setMySignature] = useState(initialAction === 'sign');
  const [workflowEnabled, setWorkflowEnabled] = useState(initialAction === 'workflow');
  const [ndaEnabled, setNdaEnabled] = useState(initialAction === 'nda');
  
  // Estado interno para saber si ya se dibujó/aplicó firma
  const [userHasSignature, setUserHasSignature] = useState(false);
  
  // Confirmación de modo (aparece temporalmente en el header)
  const [modeConfirmation, setModeConfirmation] = useState('');
  
  // NDA editable (panel izquierdo)
  const [ndaText, setNdaText] = useState(`ACUERDO DE CONFIDENCIALIDAD (NDA)

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
  
  const [emailInputs, setEmailInputs] = useState([
    { email: '', name: '', requireLogin: true, requireNda: true }
  ]); // 1 campo por defecto - usuarios agregan más según necesiten

  // Firma digital
  const [signatureType, setSignatureType] = useState(null); // 'legal' | 'certified' | null
  const [showCertifiedModal, setShowCertifiedModal] = useState(false);
  const [certifiedSubType, setCertifiedSubType] = useState(null); // 'qes' | 'mifiel' | 'international' | null

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

  // Ajustar configuración inicial según la acción con la que se abrió el modal
  useEffect(() => {
    if (!isOpen) return;
    setMySignature(initialAction === 'sign');
    setWorkflowEnabled(initialAction === 'workflow');
    setNdaEnabled(initialAction === 'nda');
    setPreviewMode('compact');

    // Mostrar modal de bienvenida (solo primera vez)
    if (guide.showWelcomeModal()) {
      setShowWelcomeModal(true);
    }
  }, [initialAction, isOpen]);

  // Handlers para el modal de bienvenida
  const handleWelcomeAccept = () => {
    setShowWelcomeModal(false);
    guide.markAsSeen('welcome_seen');
    // La guía permanece habilitada
  };

  const handleWelcomeReject = () => {
    setShowWelcomeModal(false);
    guide.markAsSeen('welcome_seen');
    guide.disableGuide(); // Deshabilita la guía pero permite cambiar después
  };

  const handleWelcomeNeverShow = () => {
    setShowWelcomeModal(false);
    guide.markAsSeen('welcome_seen');
    guide.disableGuide(); // Deshabilita permanentemente
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
  }, [mySignature, workflowEnabled, ndaEnabled, isOpen]);

  // Firma legal (opcional)
  const [signatureMode, setSignatureMode] = useState('none'); // 'none', 'canvas', 'signnow'
  const [signatureTab, setSignatureTab] = useState('draw'); // 'draw', 'type', 'upload'
  const [typedSignature, setTypedSignature] = useState('');
  const [uploadedSignature, setUploadedSignature] = useState(null);
  const { canvasRef, hasSignature, clearCanvas, getSignatureData, handlers } = useSignatureCanvas();
  const finalizeButtonRef = useRef(null);

  // Preview del documento
  const PREVIEW_BASE_HEIGHT = 'h-80';
  const [documentPreview, setDocumentPreview] = useState(null);
  const [previewError, setPreviewError] = useState(false);
  const [previewMode, setPreviewMode] = useState('compact'); // 'compact' | 'expanded' | 'fullscreen'
  const [showSignatureOnPreview, setShowSignatureOnPreview] = useState(false);
  // TODO: FEATURE PARCIAL - UI de anotaciones existe pero no hay lógica de escritura sobre el PDF
  const [annotationMode, setAnnotationMode] = useState(null); // 'signature', 'highlight', 'text'
  const [annotations, setAnnotations] = useState([]); // Lista de anotaciones (highlights y textos)

  // Helper: Convertir base64 a Blob
  const base64ToBlob = (base64) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'application/pdf' });
  };

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setDocumentLoaded(true); // CONSTITUCIÓN: Controlar visibilidad de acciones
      setPreviewError(false);
      console.log('Archivo seleccionado:', selectedFile.name);

      // Generar preview según el tipo de archivo
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setDocumentPreview(event.target.result);
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
      toast('Documento listo.\nEcoSign no ve tu documento.\nLa certificación está activada por defecto.', {
        icon: '✓',
        position: 'top-right',
        duration: 4000
      });

      // CONSTITUCIÓN: Abrir modal de firma automáticamente si corresponde
      if (initialAction === 'sign' || mySignature) {
        setShowSignatureOnPreview(true);
        
        toast('Vas a poder firmar directamente sobre el documento.', {
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

  const handleAddEmailField = () => {
    setEmailInputs([...emailInputs, { email: '', name: '', requireLogin: true, requireNda: true }]);
  };

  const handleRemoveEmailField = (index) => {
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

  const handleEmailChange = (index, value) => {
    const newInputs = [...emailInputs];
    newInputs[index] = { ...newInputs[index], email: value };
    setEmailInputs(newInputs);
  };

  const handleNameChange = (index, value) => {
    const newInputs = [...emailInputs];
    newInputs[index] = { ...newInputs[index], name: value };
    setEmailInputs(newInputs);
  };

  // Validación mejorada de email
  const isValidEmail = (email) => {
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

  const buildSignersList = () => {
    // Construir lista de firmantes desde los campos con email
    const validSigners = [];
    const seen = new Set();
    const errors = [];

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
        name: input.name?.trim() || null,
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
          toast.error('Necesitás iniciar sesión para enviar invitaciones');
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
          toast.error('No se pudo subir el archivo para enviar las invitaciones');
          setLoading(false);
          return;
        }

        // URL firmable (signed URL por 30 días)
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('user-documents')
          .createSignedUrl(storagePath, 60 * 60 * 24 * 30);

        if (signedUrlError || !signedUrlData?.signedUrl) {
          console.error('Error generando signed URL:', signedUrlError);
          toast.error('No se pudo generar el enlace del documento');
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
          toast.success(`Invitaciones enviadas a ${validSigners.length} firmante(s). Revisá tu email para el seguimiento.`, {
            duration: 6000
          });
        } catch (workflowError) {
          console.error('❌ Error al iniciar workflow:', workflowError);
          const errorMessage = workflowError.message || (typeof workflowError === 'string' ? workflowError : 'No se pudo enviar las invitaciones. Verificá los datos e intentá de nuevo.');
          toast.error(errorMessage);
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
      const signatureData = signatureMode === 'canvas' ? getSignatureData() : null;

      // Preparar archivo con Hoja de Auditoría (SOLO para Firma Legal)
      let fileToProcess = file;

      // Solo agregar Hoja de Auditoría si es Firma Legal (NO para Firma Certificada)
      if (signatureType === 'legal') {
        // Obtener datos del usuario autenticado
        const { data: { user } } = await supabase.auth.getUser();
        const userName = user?.user_metadata?.full_name || user?.email || 'Usuario';
        const userEmail = user?.email || null;

        // Preparar datos forenses para la hoja de firmas
        const forensicData = {
          forensicEnabled: forensicEnabled,
          legalTimestamp: forensicEnabled && forensicConfig.useLegalTimestamp,
          polygonAnchor: forensicEnabled && forensicConfig.usePolygonAnchor,
          bitcoinAnchor: forensicEnabled && forensicConfig.useBitcoinAnchor,
          timestamp: new Date().toISOString(),
          // Datos del firmante (del perfil autenticado)
          signerName: userName,
          signerEmail: userEmail,
          signerCompany: user?.user_metadata?.company || null,
          signerJobTitle: user?.user_metadata?.job_title || null,
          // Metadata del documento
          documentName: file.name,
          documentPages: null, // Se puede calcular en backend si es necesario
          documentSize: file.size,
          // El hash se calculará después de la certificación
        };

        // Agregar Hoja de Auditoría al PDF
        const pdfWithSheet = await addSignatureSheet(file, signatureData, forensicData);
        fileToProcess = blobToFile(pdfWithSheet, file.name);
      }

      // 1. Certificar con o sin SignNow según tipo de firma seleccionado
      let certResult;
      let signedPdfFromSignNow = null;
      let signNowResult = null;

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
          if (signNowResult.signed_pdf_base64) {
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
            signNowDocumentId: signNowResult.signnow_document_id
          });

        } catch (signNowError) {
          console.error('❌ Error con SignNow:', signNowError);
          toast.error(`Error al procesar firma legal con SignNow: ${signNowError.message}. Se usará firma estándar.`, {
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
      const bitcoinRequested = forensicEnabled && forensicConfig.useBitcoinAnchor;
      const bitcoinPending = bitcoinRequested && Boolean(certResult?.bitcoinAnchor?.anchorId);
      const overallStatus = bitcoinPending ? 'pending_anchor' : initialStatus === 'signed' ? 'certified' : initialStatus;

      const savedDoc = await saveUserDocument(fileToProcess, certResult.ecoData, {
        hasLegalTimestamp: forensicEnabled && forensicConfig.useLegalTimestamp,
        hasPolygonAnchor: forensicEnabled && forensicConfig.usePolygonAnchor,
        hasBitcoinAnchor: bitcoinRequested,
        bitcoinAnchorId: certResult?.bitcoinAnchor?.anchorId || null,
        bitcoinStatus: bitcoinPending ? 'pending' : null,
        initialStatus: initialStatus,
        overallStatus,
        downloadEnabled: !bitcoinPending,
        // Guardamos el ECO para liberarlo cuando Bitcoin confirme
        ecoFileData: bitcoinPending && certResult?.ecoxBuffer ? {
          buffer: Array.from(new Uint8Array(certResult.ecoxBuffer)),
          fileName: certResult?.fileName || file.name,
          createdAt: new Date().toISOString()
        } : null,
        signNowDocumentId: signNowResult?.signnow_document_id || null,
        signNowStatus: signNowResult?.status || null,
        signedAt: signNowResult ? new Date().toISOString() : null,
        storePdf: false, // No guardar PDF en dashboard (será eliminado)
        zeroKnowledgeOptOut: true // Zero-knowledge: no guardar contenido del PDF
      });

      // 3. Registrar evento 'created' (ChainLog)
      if (savedDoc?.id) {
        await EventHelpers.logDocumentCreated(
          savedDoc.id,
          savedDoc.user_id,
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

      // 4. Blindaje Polygon (si está activado)
      if (forensicEnabled && forensicConfig.usePolygonAnchor && certResult.ecoData?.documentHash) {
        console.log('🔗 Iniciando anclaje en Polygon...');

        // Llamar a Polygon anchor (no bloqueante - se procesa async)
        anchorToPolygon(certResult.ecoData.documentHash, {
          documentId: savedDoc?.id || null, // Ensure documentId is a UUID or null
          userId: savedDoc?.user_id,
          metadata: {
            filename: file.name,
            signatureType: signatureType || 'none'
          }
        }).then(result => {
          if (result.success) {
            console.log('✅ Polygon anchor exitoso:', result);

            // Registrar evento 'anchored_polygon'
            if (savedDoc?.id) {
              EventHelpers.logPolygonAnchor(
                savedDoc.id,
                result.txHash,
                result.blockNumber,
                {
                  documentHash: certResult.ecoData.documentHash,
                  status: result.status,
                  explorerUrl: result.explorerUrl
                }
              );
            }
          } else {
            console.warn('⚠️ Polygon anchor falló (no crítico):', result.error);
          }
        }).catch(err => {
          console.error('❌ Error en Polygon anchor:', err);
          // No bloquear el flujo - el anchor es opcional
        });
      }

      // 5. Enviar notificación por email (no bloqueante)
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

      // 6. Preparar datos para download (PDF firmado + archivo .ECO)
      // IMPORTANTE: Si Bitcoin está pending, NO permitir descarga del ECO todavía
      const shouldAllowEcoDownload = !bitcoinPending;

      setCertificateData({
        ...certResult,
        // URL para descargar el PDF firmado con audit trail
        signedPdfUrl: URL.createObjectURL(fileToProcess),
        signedPdfName: fileToProcess.name.replace(/\.pdf$/i, '_signed.pdf'),
        // URL para descargar el archivo .ECO (solo si no está pending Bitcoin)
        ecoDownloadUrl: shouldAllowEcoDownload
          ? URL.createObjectURL(new Blob([certResult.ecoxBuffer], { type: 'application/octet-stream' }))
          : null,
        ecoFileName: certResult.fileName.replace(/\.[^/.]+$/, '.eco'),
        fileName: certResult.fileName,
        documentId: savedDoc?.id,
        downloadEnabled: shouldAllowEcoDownload,
        bitcoinPending,
        bitcoinAnchorId: certResult?.bitcoinAnchor?.anchorId || null
      });

            setStep(2); // Ir a "Listo" (ahora es paso 2)
    } catch (error) {
      console.error('Error al certificar:', error);
      const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Hubo un problema desconocido al certificar tu documento. Por favor intentá de nuevo.');
      toast.error(`Error de certificación: ${errorMessage}`);
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
      const buttonEl = finalizeButtonRef.current;
      const targetEl = document.querySelector('a[href="/documentos"]') || document.querySelector('a[href="/dashboard/documents"]');

      if (!buttonEl || !targetEl) return;

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

      const duration = 850;
      const startTime = performance.now();

      const animate = (now) => {
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
    
    if (workflowEnabled && emailInputs.some(e => e.email.trim())) {
      actions.push('enviar mails');
    }
    
    return actions.join(' y ');
  };
  
  /**
   * Determina si el CTA debe estar activo
   * CONSTITUCIÓN: 
   * - Solo certificar → siempre activo
   * - Mi Firma → requiere firma aplicada + tipo elegido
   * - Flujo → requiere ≥1 mail válido
   */
  const isCTAEnabled = () => {
    // Solo certificar: siempre activo
    if (!mySignature && !workflowEnabled && !ndaEnabled) return true;
    
    // Si "Mi Firma" activa: debe tener firma Y tipo elegido
    if (mySignature) {
      if (!userHasSignature) return false;
      if (!signatureType) return false;
    }
    
    // Si "Flujo" activo: debe tener ≥1 mail
    if (workflowEnabled && !emailInputs.some(e => e.email.trim())) return false;
    
    // NDA nunca bloquea
    
    return true;
  };

  // ===== GRID LAYOUT =====
  
  const leftColWidth = (ndaEnabled && step !== 2) ? '320px' : '0px';
  const rightColWidth = (workflowEnabled && step !== 2) ? '320px' : '0px';
  const centerColWidth = 'minmax(640px, 1fr)';
  
  // En step 2, usar grid de 1 columna para centrar mejor el contenido
  const gridTemplateColumns = step === 2 
    ? '1fr' 
    : `${leftColWidth} ${centerColWidth} ${rightColWidth}`;

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="modal-container bg-white rounded-2xl w-full max-w-7xl max-h-[92vh] shadow-xl flex flex-col overflow-hidden">
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
          <div className={`left-panel h-full border-r border-gray-200 bg-gray-50 transition-all duration-300 ease-in-out ${ndaEnabled && step !== 2 ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 -translate-x-3 pointer-events-none'}`}>
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
        
          {/* Center Panel (Main Content) */}
          <div className={`center-panel px-6 py-3 relative z-20 ${step === 2 ? '' : 'col-start-2 col-end-3'}`}>
            {/* PASO 1: ELEGIR ARCHIVO */}
            {step === 1 && (
              <div className="space-y-3">
              <div>
                {/* Zona de drop / Preview del documento */}
                                  {!file ? (
                                    <label className="block border-2 border-dashed border-gray-300 rounded-xl py-12 text-center hover:border-gray-900 transition-colors cursor-pointer">
                                      <input
                                        type="file"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                      />
                                      {/* Título principal */}
                                      <p className="text-xl font-semibold text-gray-900 mb-4">
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
                                        <p className="text-sm text-gray-700 font-medium">
                                          Tu documento es privado: no lo vemos ni lo guardamos.
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          Solo generamos su protección y evidencia.
                                        </p>
                                      </div>
                                    </label>
                                  ) : (                  <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                    {/* Header del preview */}
                    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
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
                      <div className="flex gap-2">
                        {documentPreview && (
                          <>
                            {/* F3.3: Solo Preview y Cambiar archivo - herramientas editoriales ocultas */}
                            <button
                              onClick={() => {
                                // Ciclo simple: compact -> expanded -> compact
                                setPreviewMode((prev) => prev === 'compact' ? 'expanded' : 'compact');
                              }}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title={previewMode === 'compact' ? 'Ver documento completo' : 'Volver al Centro Legal'}
                            >
                              {previewMode === 'expanded' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            </button>
                          </>
                        )}
                        <label className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" title="Cambiar archivo">
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleFileSelect}
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                          />
                          <Upload className="w-4 h-4" />
                        </label>
                      </div>
                    </div>

                    {/* Preview del contenido - altura fija según modo */}
                    <div className={`relative ${
                      previewMode === 'expanded' ? 'h-[60vh]' : PREVIEW_BASE_HEIGHT
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
                            <div className="absolute inset-0 bg-black bg-opacity-5 flex items-center justify-center p-4">
                              <div className="bg-white rounded-xl shadow-2xl p-6 max-w-xl w-full">
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
                                            const file = e.target.files[0];
                                            if (file) {
                                              const reader = new FileReader();
                                              reader.onload = (event) => {
                                                setUploadedSignature(event.target.result);
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
                                      toast.success('Firma guardada. Se aplicará al certificar el documento.', {
                                        duration: 4000,
                                        icon: '✅'
                                      });

                                      // Guía: Firma aplicada
                                      guide.showGuideToast(
                                        'signature_applied_seen',
                                        'La firma quedó registrada. Ahora podés decidir el peso legal que querés asignarle.',
                                        { type: 'success', position: 'top-right', duration: 5000 }
                                      );
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

              {/* CONSTITUCIÓN: Acciones solo visibles si (documentLoaded || initialAction) */}
              {(documentLoaded || initialAction) && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
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

              {/* Tipo de Firma - Solo si hay firma aplicada o workflow SIN mi firma */}
              {((mySignature && userHasSignature) || (workflowEnabled && !mySignature)) && (
              <div className="space-y-2 animate-fadeScaleIn">
                <div className="grid grid-cols-2 gap-3">
                  {/* Firma Legal */}
                  <button
                    type="button"
                    onClick={() => setSignatureType('legal')}
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
                  // Texto dinámico con foco emocional, no técnico
                  (() => {
                    if (workflowEnabled) return 'Enviar para firmar';
                    if (mySignature) return 'Proteger y firmar';
                    return 'Proteger documento';
                  })()
                )}
              </button>
            </div>
          )}

          {/* PASO 2: LISTO */}
          {step === 2 && certificateData && (
            <div className="py-10">
              <div className="max-w-4xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <Shield className="w-10 h-10 text-blue-700" />
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900">Tu documento quedó protegido</h3>
                    <p className="text-sm text-gray-600">
                      Elegí cómo querés recibirlo. Podés guardarlo en EcoSign o descargarlo ahora mismo.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={savePdfChecked}
                    onClick={() => setSavePdfChecked(!savePdfChecked)}
                    className={`w-full text-left rounded-xl p-5 transition ${
                      savePdfChecked
                        ? 'border border-blue-900 bg-blue-900 text-white shadow-md'
                        : 'border border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="space-y-1">
                        <p className={`text-lg font-semibold ${savePdfChecked ? 'text-white' : 'text-gray-900'}`}>Guardar en EcoSign (recomendado)</p>
                        <p className={`text-sm ${savePdfChecked ? 'text-gray-100' : 'text-gray-600'}`}>
                          Lo vas a tener siempre disponible en tu espacio privado. Nosotros no vemos tu documento y pronto sumamos cifrado para que ni los servidores puedan leerlo.
                        </p>
                        <p className={`text-xs ${savePdfChecked ? 'text-gray-200' : 'text-gray-500'}`}>
                          Si lo descargás más adelante desde acá, evitás cambios accidentales: siempre bajás la versión certificada.
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={downloadPdfChecked}
                    onClick={() => setDownloadPdfChecked(!downloadPdfChecked)}
                    className={`w-full text-left rounded-xl p-5 transition ${
                      downloadPdfChecked
                        ? 'border border-blue-900 bg-blue-900 text-white shadow-md'
                        : 'border border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="space-y-1">
                        <p className={`text-lg font-semibold ${downloadPdfChecked ? 'text-white' : 'text-gray-900'}`}>Descargar ahora</p>
                        <p className={`text-sm ${downloadPdfChecked ? 'text-gray-100' : 'text-gray-600'}`}>
                          Guardalo en tu equipo. Evitá modificarlo: cualquier cambio altera el certificado.
                        </p>
                        <p className={`text-xs ${downloadPdfChecked ? 'text-gray-200' : 'text-gray-500'}`}>
                          Según tu navegador la descarga puede abrirse en otra pestaña, pero tu documento sigue protegido en EcoSign.
                        </p>
                        <p className={`text-xs ${downloadPdfChecked ? 'text-gray-200' : 'text-gray-500'}`}>
                          Si algo se altera por error, podés volver a descargar la copia intacta desde EcoSign siempre que lo hayas guardado.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    Tip: podés elegir ambas opciones para tener copia local y respaldo seguro.
                  </p>
                  <button
                    ref={finalizeButtonRef}
                    onClick={handleFinalizeClick}
                    disabled={!file || !isCTAEnabled()}
                    className={`w-full sm:w-auto px-6 py-3 rounded-lg transition-colors font-semibold ${
                      file && isCTAEnabled()
                        ? 'bg-gray-900 text-white hover:bg-gray-800'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {getCTAText()}
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>

          {/* Right Panel (Workflow) */}
          <div className={`right-panel col-start-3 col-end-4 h-full border-l border-gray-200 bg-gray-50 transition-all duration-300 ease-in-out ${workflowEnabled && step !== 2 ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-3 pointer-events-none'}`}>
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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] animate-fadeIn">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl animate-fadeScaleIn">
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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] animate-fadeIn">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl animate-fadeScaleIn">
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
    </>
  );
};

export default LegalCenterModalV2;
