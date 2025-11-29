import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, FileCheck, FileText, Highlighter, Pen, Shield, Type, Upload, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { certifyFile, downloadEcox } from '../lib/basicCertificationWeb';
import { saveUserDocument } from '../utils/documentStorage';
import { startSignatureWorkflow } from '../lib/signatureWorkflowService';
import { useSignatureCanvas } from '../hooks/useSignatureCanvas';
import { applySignatureToPDF, blobToFile, addSignatureSheet } from '../utils/pdfSignature';
import { signWithSignNow } from '../lib/signNowService';
import { EventHelpers } from '../utils/eventLogger';
import { anchorToPolygon } from '../lib/polygonAnchor';
import { supabase } from '../lib/supabaseClient';

/**
 * Modal de Certificación - Diseño según Design System VerifySign
 *
 * Características:
 * - Sin tecnicismos visibles
 * - Paneles colapsables para opciones avanzadas
 * - Blindaje forense por defecto (transparente)
 * - Flujo simple: Elegí → Firmá → Listo
 */
const CertificationModal = ({ isOpen, onClose }) => {
  // Estados del flujo
  const [step, setStep] = useState(1); // 1: Elegir, 2: Firmar, 3: Listo
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [certificateData, setCertificateData] = useState(null);

  // Estados de paneles colapsables
  const [forensicPanelOpen, setForensicPanelOpen] = useState(false);
  const [sharePanelOpen, setSharePanelOpen] = useState(false);

  // Configuración de blindaje forense (por defecto desactivado - usuario debe elegir conscientemente)
  const [forensicEnabled, setForensicEnabled] = useState(false);
  const [forensicConfig, setForensicConfig] = useState({
    useLegalTimestamp: true,    // RFC 3161
    usePolygonAnchor: true,      // Polygon
    useBitcoinAnchor: false      // Bitcoin
  });

  // Firmas múltiples (workflow)
  const [multipleSignatures, setMultipleSignatures] = useState(false);
  const [signers, setSigners] = useState([]);
  const [emailInputs, setEmailInputs] = useState([
    { email: '', requireLogin: true, requireNda: true }
  ]); // 1 campo por defecto - usuarios agregan más según necesiten

  // Firma digital (EcoSign o Legal)
  const [signatureEnabled, setSignatureEnabled] = useState(false);
  const [signatureType, setSignatureType] = useState('ecosign'); // 'ecosign' | 'signnow'

  // Saldos de firma (mock data - en producción viene de la DB)
  const [ecosignUsed, setEcosignUsed] = useState(30); // Firmas usadas
  const [ecosignTotal, setEcosignTotal] = useState(50); // Total del plan
  const [signnowUsed, setSignnowUsed] = useState(5); // Firmas usadas
  const [signnowTotal, setSignnowTotal] = useState(15); // Total del plan
  const [isEnterprisePlan, setIsEnterprisePlan] = useState(false); // Plan enterprise tiene ilimitadas

  // Datos del firmante (para Hoja de Auditoría - solo EcoSign)
  // Caso A (multipleSignatures OFF): Yo firmo → prellenar con usuario logueado
  // Caso B (multipleSignatures ON): Otros firman → enviar links
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerCompany, setSignerCompany] = useState('');
  const [signerJobTitle, setSignerJobTitle] = useState('');

  // Prellenar con datos del usuario autenticado cuando multipleSignatures = false
  useEffect(() => {
    async function loadUserData() {
      if (!multipleSignatures) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setSignerName(user.user_metadata?.full_name || user.email || '');
          setSignerEmail(user.email || '');
        }
      } else {
        setSignerName('');
        setSignerEmail('');
      }
    }
    loadUserData();
  }, [multipleSignatures]);

  // Firma legal (opcional)
  const [signatureMode, setSignatureMode] = useState('none'); // 'none', 'canvas', 'signnow'
  const [signatureTab, setSignatureTab] = useState('draw'); // 'draw', 'type', 'upload'
  const [typedSignature, setTypedSignature] = useState('');
  const [uploadedSignature, setUploadedSignature] = useState(null);
  const { canvasRef, hasSignature, clearCanvas, getSignatureData, handlers } = useSignatureCanvas();

  // Preview del documento
  const [documentPreview, setDocumentPreview] = useState(null);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [showSignatureOnPreview, setShowSignatureOnPreview] = useState(false);
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
    }
  };

  const handleAddEmailField = () => {
    setEmailInputs([...emailInputs, { email: '', requireLogin: true, requireNda: true }]);
  };

  const handleRemoveEmailField = (index) => {
    if (emailInputs.length <= 1) return; // Mantener al menos 1 campo
    const newInputs = emailInputs.filter((_, idx) => idx !== index);
    setEmailInputs(newInputs);
  };

  const handleEmailChange = (index, value) => {
    const newInputs = [...emailInputs];
    newInputs[index] = { ...newInputs[index], email: value };
    setEmailInputs(newInputs);
  };

  const buildSignersList = () => {
    // Construir lista de firmantes desde los campos con email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validSigners = emailInputs
      .filter(input => input.email.trim() && emailRegex.test(input.email.trim()))
      .map((input, idx) => ({
        email: input.email.trim(),
        signingOrder: idx + 1,
        requireLogin: input.requireLogin,
        requireNda: input.requireNda,
        quickAccess: false
      }));

    // Eliminar duplicados por email
    const seen = new Set();
    return validSigners.filter(signer => {
      if (seen.has(signer.email)) return false;
      seen.add(signer.email);
      return true;
    });
  };

  const handleCertify = async () => {
    if (!file) return;

    setLoading(true);
    try {
      // FLUJO 1: Firmas Múltiples (Caso B) - Enviar emails y terminar
      if (multipleSignatures) {
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
          toast.error(`No se pudo enviar las invitaciones: ${workflowError.message || workflowError}`);
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

      // Preparar archivo con Hoja de Auditoría (SOLO para EcoSign)
      let fileToProcess = file;

      // Solo agregar Hoja de Auditoría si es EcoSign (NO para SignNow)
      if (signatureEnabled && signatureType === 'ecosign') {
        // Validar nombre del firmante (obligatorio para Hoja de Auditoría)
        if (!signerName.trim()) {
          toast.error('Por favor, completá tu nombre para generar la Hoja de Auditoría');
          setLoading(false);
          return;
        }

        // Preparar datos forenses para la hoja de firmas
        const forensicData = {
          forensicEnabled: forensicEnabled,
          legalTimestamp: forensicEnabled && forensicConfig.useLegalTimestamp,
          polygonAnchor: forensicEnabled && forensicConfig.usePolygonAnchor,
          bitcoinAnchor: forensicEnabled && forensicConfig.useBitcoinAnchor,
          timestamp: new Date().toISOString(),
          // Datos del firmante
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim() || null,
          signerCompany: signerCompany.trim() || null,
          signerJobTitle: signerJobTitle.trim() || null,
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

      if (signatureEnabled && signatureType === 'signnow') {
        // ✅ Usar SignNow API para firma legalizada (eIDAS, ESIGN, UETA)
        console.log('🔐 Usando SignNow API para firma legalizada');

        try {
          // Llamar a SignNow con la firma ya embebida
          // Obtener usuario autenticado
          const { data: { user } } = await supabase.auth.getUser();

          signNowResult = await signWithSignNow(fileToProcess, {
            documentName: fileToProcess.name,
            action: 'esignature',
            userEmail: user?.email || 'unknown@example.com',
            userName: user?.user_metadata?.full_name || signerName || 'Usuario',
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
        // ✅ Usar motor interno (EcoSign)
        console.log('📝 Usando motor interno EcoSign');
        certResult = await certifyFile(fileToProcess, {
          useLegalTimestamp: forensicEnabled && forensicConfig.useLegalTimestamp,
          usePolygonAnchor: forensicEnabled && forensicConfig.usePolygonAnchor,
          useBitcoinAnchor: forensicEnabled && forensicConfig.useBitcoinAnchor,
          signatureData: signatureData
        });
      }

      // 2. Guardar en Supabase (guardar el PDF procesado, no el original)
      // Status inicial: 'signed' si ya se firmó, 'draft' si no hay firmantes
      const initialStatus = signatureEnabled ? 'signed' : 'draft';
      
      const savedDoc = await saveUserDocument(fileToProcess, certResult.ecoData, {
        hasLegalTimestamp: forensicEnabled && forensicConfig.useLegalTimestamp,
        hasBitcoinAnchor: forensicEnabled && forensicConfig.useBitcoinAnchor,
        initialStatus: initialStatus,
        signNowDocumentId: signNowResult?.signnow_document_id || null,
        signNowStatus: signNowResult?.status || null,
        signedAt: signNowResult ? new Date().toISOString() : null
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
            signatureType: signatureEnabled ? signatureType : 'none',
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
          documentId: savedDoc?.id,
          userId: savedDoc?.user_id,
          metadata: {
            filename: file.name,
            signatureType: signatureEnabled ? signatureType : 'none'
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
      setCertificateData({
        ...certResult,
        // URL para descargar el PDF firmado con audit trail
        signedPdfUrl: URL.createObjectURL(fileToProcess),
        signedPdfName: fileToProcess.name.replace(/\.pdf$/i, '_signed.pdf'),
        // URL para descargar el archivo .ECO
        ecoDownloadUrl: URL.createObjectURL(new Blob([certResult.ecoxBuffer], { type: 'application/octet-stream' })),
        ecoFileName: certResult.fileName.replace(/\.[^/.]+$/, '.eco'),
        fileName: certResult.fileName,
        documentId: savedDoc?.id
      });

      setStep(2); // Ir a "Listo" (ahora es paso 2)
    } catch (error) {
      console.error('Error al certificar:', error);
      toast.error('Hubo un problema al certificar tu documento. Por favor intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setFile(null);
    setCertificateData(null);
    setSignatureMode('none');
    setMultipleSignatures(false);
    setSignatureEnabled(false);
    setSigners([]);
    setEmailInputs([
      { email: '', requireLogin: true, requireNda: true }
    ]); // Reset a 1 campo vacío
    setForensicEnabled(false);
    setDocumentPreview(null);
    setPreviewFullscreen(false);
    setShowSignatureOnPreview(false);
    setAnnotationMode(null);
    setAnnotations([]);
    clearCanvas();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl transition-all duration-300 ${
        multipleSignatures ? 'max-w-5xl' : 'max-w-2xl'
      }`}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Certificar documento
          </h2>
          <button
            onClick={resetAndClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps - Solo 2 pasos */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-center max-w-xs mx-auto">
            {/* Paso 1: Configurar */}
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1
                  ? 'bg-gray-900 text-white'
                  : 'border-2 border-gray-300 text-gray-400'
              }`}>
                {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
              </div>
              <span className={`ml-2 text-sm ${
                step >= 1 ? 'text-gray-900 font-medium' : 'text-gray-400'
              }`}>
                Configurar
              </span>
            </div>

            {/* Línea conectora */}
            <div className={`flex-1 h-px mx-4 ${
              step > 1 ? 'bg-gray-900' : 'bg-gray-200'
            }`}></div>

            {/* Paso 2: Listo */}
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2
                  ? 'bg-gray-900 text-white'
                  : 'border-2 border-gray-300 text-gray-400'
              }`}>
                {step >= 2 ? <CheckCircle2 className="w-5 h-5" /> : '2'}
              </div>
              <span className={`ml-2 text-sm ${
                step >= 2 ? 'text-gray-900 font-medium' : 'text-gray-400'
              }`}>
                Listo
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`${multipleSignatures ? 'grid grid-cols-[1fr,400px]' : ''}`}>
          {/* Columna principal */}
          <div className="px-6 py-6">
            {/* PASO 1: ELEGIR ARCHIVO */}
            {step === 1 && (
              <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Elegí tu archivo
                </h3>

                {/* Zona de drop / Preview del documento */}
                {!file ? (
                  <label className="block border-2 border-dashed border-gray-300 rounded-xl py-12 text-center hover:border-gray-900 transition-colors cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    />
                    <FileText className="w-12 h-12 text-gray-900 mx-auto mb-4" />
                    <p className="text-sm text-gray-900 font-medium">
                      Arrastrá tu documento o hacé clic para elegirlo
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      PDF, Word, Excel, imágenes (máx 50MB)
                    </p>
                  </label>
                ) : (
                  <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                    {/* Header del preview */}
                    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {documentPreview && (
                          <>
                            <button
                              onClick={() => {
                                setAnnotationMode(annotationMode === 'signature' ? null : 'signature');
                                setShowSignatureOnPreview(annotationMode !== 'signature');
                              }}
                              className={`p-2 rounded-lg transition-colors ${
                                annotationMode === 'signature'
                                  ? 'bg-gray-900 text-white'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                              title="Firmar documento"
                            >
                              <Pen className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setAnnotationMode(annotationMode === 'highlight' ? null : 'highlight')}
                              className={`p-2 rounded-lg transition-colors ${
                                annotationMode === 'highlight'
                                  ? 'bg-gray-900 text-white'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                              title="Resaltar texto (marcar desacuerdos)"
                            >
                              <Highlighter className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setAnnotationMode(annotationMode === 'text' ? null : 'text')}
                              className={`p-2 rounded-lg transition-colors ${
                                annotationMode === 'text'
                                  ? 'bg-gray-900 text-white'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                              title="Agregar texto (modificaciones)"
                            >
                              <Type className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setPreviewFullscreen(!previewFullscreen)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Pantalla completa"
                            >
                              {previewFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
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

                    {/* Preview del contenido */}
                    <div className={`relative ${previewFullscreen ? 'h-[60vh]' : 'h-96'} bg-gray-100 flex items-center justify-center`}>
                      {documentPreview ? (
                        <>
                          {file.type.startsWith('image/') ? (
                            <img
                              src={documentPreview}
                              alt="Preview"
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : file.type === 'application/pdf' ? (
                            <iframe
                              src={documentPreview}
                              className="w-full h-full"
                              title="PDF Preview"
                            />
                          ) : null}

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
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <X className="w-5 h-5" />
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

                                      try {
                                        let signatureData = null;

                                        // Obtener firma según el tab activo
                                        if (signatureTab === 'draw') {
                                          if (!hasSignature) return;
                                          signatureData = getSignatureData();
                                        } else if (signatureTab === 'type') {
                                          if (!typedSignature) return;
                                          // Convertir texto a imagen
                                          const canvas = document.createElement('canvas');
                                          canvas.width = 600;
                                          canvas.height = 200;
                                          const ctx = canvas.getContext('2d');
                                          ctx.fillStyle = 'white';
                                          ctx.fillRect(0, 0, canvas.width, canvas.height);
                                          ctx.fillStyle = '#1f2937';
                                          ctx.font = "80px 'Dancing Script', cursive";
                                          ctx.textAlign = 'center';
                                          ctx.textBaseline = 'middle';
                                          ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2);
                                          signatureData = canvas.toDataURL('image/png');
                                        } else if (signatureTab === 'upload') {
                                          if (!uploadedSignature) return;
                                          signatureData = uploadedSignature;
                                        }

                                        if (!signatureData) return;

                                        // Aplicar firma al PDF
                                        const signedPdfBlob = await applySignatureToPDF(file, signatureData);
                                        const signedPdfFile = blobToFile(signedPdfBlob, file.name);

                                        // Actualizar el archivo con la versión firmada
                                        setFile(signedPdfFile);

                                        // Actualizar la vista previa
                                        const newPreviewUrl = URL.createObjectURL(signedPdfBlob);
                                        setDocumentPreview(newPreviewUrl);

                                        // Cerrar el modo firma
                                        setShowSignatureOnPreview(false);
                                        setSignatureMode('canvas');
                                        setSignatureTab('draw');

                                        toast.success('Firma aplicada exitosamente al PDF');
                                      } catch (error) {
                                        console.error('Error al aplicar firma:', error);
                                        toast.error('Error al aplicar la firma al PDF. Verificá que el archivo sea un PDF válido.');
                                      }
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
                        </>
                      ) : (
                        <div className="text-center text-gray-500">
                          <FileText className="w-16 h-16 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Vista previa no disponible</p>
                          <p className="text-xs">El archivo se procesará al certificar</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Switch: Firmas múltiples */}
              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-gray-900" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Firmas múltiples
                    </p>
                    <p className="text-xs text-gray-500">
                      Crear workflow de firma secuencial
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={multipleSignatures}
                    onChange={(e) => setMultipleSignatures(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                </label>
              </div>

              {/* Switch: Firma Digital */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileCheck className="w-5 h-5 text-gray-900" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Firmar documento
                      </p>
                      <p className="text-xs text-gray-500">
                        Agregar firma digital al certificado
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={signatureEnabled}
                      onChange={(e) => setSignatureEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                  </label>
                </div>

                {/* Radio buttons: Tipo de Firma (solo si signatureEnabled) */}
                {signatureEnabled && (
                  <div className="pl-4 space-y-2 border-l-2 border-gray-200">
                    {/* Opción 1: EcoSign */}
                    <label className="flex items-center justify-between py-2 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="signatureType"
                          value="ecosign"
                          checked={signatureType === 'ecosign'}
                          onChange={(e) => setSignatureType(e.target.value)}
                          className="w-4 h-4 text-gray-900 focus:ring-gray-900"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Firma EcoSign {!isEnterprisePlan && <span className="text-gray-500 font-normal">({ecosignUsed}/{ecosignTotal})</span>}
                          </p>
                          <p className="text-xs text-gray-500">
                            Recomendado para gestión interna, RRHH y aprobaciones
                          </p>
                        </div>
                      </div>
                      {isEnterprisePlan && (
                        <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-900 text-white">
                          Ilimitada
                        </span>
                      )}
                    </label>

                    {/* Opción 2: SignNow */}
                    <label className="flex items-center justify-between py-2 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="signatureType"
                          value="signnow"
                          checked={signatureType === 'signnow'}
                          onChange={(e) => setSignatureType(e.target.value)}
                          className="w-4 h-4 text-gray-900 focus:ring-gray-900"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Firma Legal (SignNow) <span className="text-gray-500 font-normal">({signnowUsed}/{signnowTotal})</span>
                          </p>
                          <p className="text-xs text-gray-500">
                            Para contratos externos con validez eIDAS/UETA
                          </p>
                        </div>
                      </div>
                    </label>

                    {/* Formulario de datos del firmante (solo para EcoSign) */}
                    {signatureType === 'ecosign' && !multipleSignatures && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">✍️</span>
                          <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                            Tus datos (para Hoja de Auditoría)
                          </p>
                        </div>

                        {/* Nombre completo - OBLIGATORIO */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Nombre completo <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={signerName}
                            onChange={(e) => setSignerName(e.target.value)}
                            placeholder="Ej: Juan Pérez"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Email - OPCIONAL */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Email (opcional)
                          </label>
                          <input
                            type="email"
                            value={signerEmail}
                            onChange={(e) => setSignerEmail(e.target.value)}
                            placeholder="Ej: juan@empresa.com"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Empresa y Puesto (en la misma línea) - OPCIONAL */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Empresa (opcional)
                            </label>
                            <input
                              type="text"
                              value={signerCompany}
                              onChange={(e) => setSignerCompany(e.target.value)}
                              placeholder="Ej: Acme Inc."
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Puesto (opcional)
                            </label>
                            <input
                              type="text"
                              value={signerJobTitle}
                              onChange={(e) => setSignerJobTitle(e.target.value)}
                              placeholder="Ej: Director"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <p className="text-xs text-blue-700 italic flex items-start gap-1">
                          <span className="mt-0.5">ℹ️</span>
                          <span>Estos datos aparecerán en la Hoja de Auditoría al final del documento</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Switch: Blindaje Forense */}
              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-gray-900" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Blindaje forense
                    </p>
                    <p className="text-xs text-gray-500">
                      Protección adicional con timestamps y blockchain
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forensicEnabled}
                    onChange={(e) => {
                      setForensicEnabled(e.target.checked);
                      if (e.target.checked) {
                        setForensicPanelOpen(true);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                </label>
              </div>

              {/* Panel de opciones de Blindaje Forense (solo cuando está ON) */}
              {forensicEnabled && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setForensicPanelOpen(!forensicPanelOpen)}
                    className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-700">
                      Configurar opciones de blindaje
                    </p>
                    {forensicPanelOpen ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {forensicPanelOpen && (
                    <div className="p-4 space-y-3 bg-white border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-3">
                        Elegí las capas de protección forense para tu certificado
                      </p>

                      {/* RFC 3161 Timestamp */}
                      <label className="flex items-start gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          checked={forensicConfig.useLegalTimestamp}
                          onChange={(e) => setForensicConfig({
                            ...forensicConfig,
                            useLegalTimestamp: e.target.checked
                          })}
                          className="mt-1 w-4 h-4 text-gray-900 rounded focus:ring-gray-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            RFC 3161 Timestamp
                          </p>
                          <p className="text-xs text-gray-500">
                            Sello de tiempo certificado por autoridad de confianza
                          </p>
                        </div>
                      </label>

                      {/* Polygon Blockchain */}
                      <label className="flex items-start gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          checked={forensicConfig.usePolygonAnchor}
                          onChange={(e) => setForensicConfig({
                            ...forensicConfig,
                            usePolygonAnchor: e.target.checked
                          })}
                          className="mt-1 w-4 h-4 text-gray-900 rounded focus:ring-gray-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Polygon Blockchain
                          </p>
                          <p className="text-xs text-gray-500">
                            Registro inmutable en blockchain pública (confirmación en 30 segundos)
                          </p>
                        </div>
                      </label>

                      {/* Bitcoin Blockchain */}
                      <label className="flex items-start gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          checked={forensicConfig.useBitcoinAnchor}
                          onChange={(e) => setForensicConfig({
                            ...forensicConfig,
                            useBitcoinAnchor: e.target.checked
                          })}
                          className="mt-1 w-4 h-4 text-gray-900 rounded focus:ring-gray-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Bitcoin Blockchain
                          </p>
                          <p className="text-xs text-gray-500">
                            Anclaje permanente en Bitcoin (confirmación en 4-24 horas)
                          </p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Smart Feedback - Resumen Dinámico de Seguridad */}
              {(() => {
                // Lógica para determinar el nivel de seguridad
                const hasSignature = signatureEnabled;
                const isLegalSignature = signatureEnabled && signatureType === 'signnow';
                const hasForensic = forensicEnabled;

                // Mensajes más amigables y educativos
                let title = '';
                let description = '';
                let emoji = '';
                let bgColor = 'bg-blue-50';
                let borderColor = 'border-blue-200';
                let textColor = 'text-blue-800';

                if (hasForensic && isLegalSignature) {
                  // MÁXIMO: SignNow + Blindaje Forense
                  emoji = '⚖️';
                  title = 'Validez legal + evidencia forense';
                  description = 'Firma con normas eIDAS/ESIGN/UETA y blindaje criptográfico adicional. Ideal para contratos formales con terceros.';
                  bgColor = 'bg-purple-50';
                  borderColor = 'border-purple-200';
                  textColor = 'text-purple-800';
                } else if (hasForensic && hasSignature && signatureType === 'ecosign') {
                  // ALTO: EcoSign + Blindaje Forense
                  emoji = '🔒';
                  title = 'Protección avanzada activa';
                  description = 'Tu documento tendrá trazabilidad interna + registro criptográfico (hash + blockchain). Ideal para procesos internos, NDAs y aprobaciones.';
                  bgColor = 'bg-blue-50';
                  borderColor = 'border-blue-200';
                  textColor = 'text-blue-800';
                } else if (hasForensic) {
                  // Solo Blindaje Forense (sin firma)
                  emoji = '🔒';
                  title = 'Protección avanzada activa';
                  description = 'Registro criptográfico con hash + blockchain. Ideal para certificar documentos sin necesidad de firma.';
                  bgColor = 'bg-blue-50';
                  borderColor = 'border-blue-200';
                  textColor = 'text-blue-800';
                } else if (isLegalSignature) {
                  // Solo SignNow (sin blindaje)
                  emoji = '⚖️';
                  title = 'Firma legal internacional';
                  description = 'Validez legal con normas eIDAS/ESIGN/UETA. Ideal para contratos formales. Podés activar el blindaje para máxima trazabilidad.';
                  bgColor = 'bg-indigo-50';
                  borderColor = 'border-indigo-200';
                  textColor = 'text-indigo-800';
                } else if (hasSignature && signatureType === 'ecosign') {
                  // Solo EcoSign (sin blindaje)
                  emoji = 'ℹ️';
                  title = 'Firma interna sin blindaje extra';
                  description = 'La firma será visible en el PDF y quedará registrada en EcoSign, pero sin anclaje en blockchain ni sello de tiempo legal. Podés activar el blindaje si necesitás máxima trazabilidad.';
                  bgColor = 'bg-gray-50';
                  borderColor = 'border-gray-200';
                  textColor = 'text-gray-700';
                } else {
                  // Sin firma y sin blindaje
                  emoji = 'ℹ️';
                  title = 'Certificado básico';
                  description = 'El documento quedará registrado en EcoSign sin firma ni blindaje forense. Activá la firma o el blindaje para mayor seguridad.';
                  bgColor = 'bg-gray-50';
                  borderColor = 'border-gray-200';
                  textColor = 'text-gray-700';
                }

                return (
                  <div className={`${bgColor} ${borderColor} border rounded-lg p-4 mb-4`}>
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{emoji}</span>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${textColor} mb-1`}>
                          {title}
                        </p>
                        <p className="text-xs text-gray-600">
                          {description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Botón principal - cambia según configuración */}
              <button
                onClick={handleCertify}
                disabled={!file || loading}
                className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg px-5 py-3 font-medium transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {multipleSignatures ? 'Enviando invitaciones...' : 'Certificando...'}
                  </>
                ) : (
                  multipleSignatures ? 'Enviar para firmar' : 'Certificar documento'
                )}
              </button>
            </div>
          )}

          {/* PASO 2: LISTO */}
          {step === 2 && certificateData && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />

              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Tu certificado está listo
              </h3>

              <p className="text-sm text-gray-600 mb-8 max-w-md mx-auto">
                Guardamos tu documento firmado y tu certificado .ECO en tu cuenta. Descargá ambos archivos ahora
              </p>

              {/* Botones de acción */}
              <div className="flex flex-col gap-3 max-w-sm mx-auto">
                {/* Descargar PDF Firmado con Audit Trail */}
                {certificateData.signedPdfUrl && (
                  <a
                    href={certificateData.signedPdfUrl}
                    download={certificateData.signedPdfName}
                    className="bg-black hover:bg-cyan-500 text-white rounded-lg px-5 py-3 font-medium transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Descargar PDF Firmado
                  </a>
                )}

                {/* Descargar archivo .ECO */}
                <a
                  href={certificateData.ecoDownloadUrl}
                  download={certificateData.ecoFileName}
                  onClick={() => {
                    // Registrar evento 'downloaded'
                    if (certificateData.documentId) {
                      supabase.auth.getUser().then(({ data: { user } }) => {
                        EventHelpers.logEcoDownloaded(
                          certificateData.documentId,
                          user?.id || null,
                          user?.email || null
                        );
                      });
                    }
                  }}
                  className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg px-5 py-3 font-medium transition-colors inline-flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Descargar Certificado .ECO
                </a>

                {/* Volver al dashboard */}
                <button
                  onClick={resetAndClose}
                  className="border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-5 py-3 font-medium transition-colors"
                >
                  Ver en mi panel
                </button>
              </div>
            </div>
          )}
          </div>

          {/* Panel lateral de firmantes (solo visible si multipleSignatures está ON) */}
          {multipleSignatures && (
            <div className="bg-gray-50 border-l border-gray-200 px-6 py-6 overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Firmantes
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Agregá un email por firmante. Las personas firmarán en el orden que los agregues.
              </p>

              {/* Campos de email con switches individuales */}
              <div className="space-y-4 mb-4">
                {emailInputs.map((input, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                    {/* Header con número y campo email */}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificationModal;
