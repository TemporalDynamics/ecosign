/**
 * SignDocumentPage
 *
 * Página para firmantes invitados via link único /sign/:token
 *
 * Flujo:
 * 1. Validar token (no expirado, status válido)
 * 2. Pantalla de identificación (nombre, email, empresa, puesto, NDA)
 * 3. Modal de firma (dibujar/teclear/subir)
 * 4. Guardar firma y mostrar confirmación
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { EventHelpers } from '../utils/eventLogger';
import Shield from 'lucide-react/dist/esm/icons/shield';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle2';
import Loader2 from 'lucide-react/dist/esm/icons/loader2';
import Pen from 'lucide-react/dist/esm/icons/pen';
import Type from 'lucide-react/dist/esm/icons/type';
import Upload as UploadIcon from 'lucide-react/dist/esm/icons/upload as -upload-icon';
import { useSignatureCanvas } from '../hooks/useSignatureCanvas';

function SignDocumentPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  // Estados generales
  const [loading, setLoading] = useState(true);
  const [signerLink, setSignerLink] = useState(null);
  const [document, setDocument] = useState(null);
  const [error, setError] = useState(null);

  // Flujo: 1=Identificación, 2=Firma, 3=Completado
  const [step, setStep] = useState(1);

  // Formulario de identificación
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    jobTitle: '',
    ndaAccepted: false
  });

  // Estados de firma
  const [signatureTab, setSignatureTab] = useState('draw'); // 'draw' | 'type' | 'upload'
  const [typedSignature, setTypedSignature] = useState('');
  const [uploadedSignature, setUploadedSignature] = useState(null);
  const { canvasRef, hasSignature, clearCanvas, getSignatureData, handlers } = useSignatureCanvas();
  const [submitting, setSubmitting] = useState(false);

  // Validar token al cargar
  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      setLoading(true);

      // Buscar signer_link con documento relacionado
      const { data: link, error: linkError } = await supabase
        .from('signer_links')
        .select(`
          *,
          user_documents (
            id,
            document_name,
            file_size,
            created_at
          )
        `)
        .eq('token', token)
        .single();

      if (linkError || !link) {
        setError('Link de firma inválido o no encontrado');
        setLoading(false);
        return;
      }

      // Verificar estado
      if (link.status === 'signed') {
        setError('Este documento ya fue firmado');
        setLoading(false);
        return;
      }

      if (link.status === 'expired' || new Date(link.expires_at) < new Date()) {
        setError('Este link ha expirado');
        setLoading(false);
        return;
      }

      // Prellenar datos
      setFormData(prev => ({
        ...prev,
        email: link.signer_email,
        name: link.signer_name || ''
      }));

      setSignerLink(link);
      setDocument(link.user_documents);

      // Registrar evento 'opened'
      await EventHelpers.logLinkOpened(
        link.document_id,
        link.id,
        link.signer_email,
        null
      );

      // Actualizar status a 'opened'
      await supabase
        .from('signer_links')
        .update({
          status: 'opened',
          opened_at: new Date().toISOString()
        })
        .eq('id', link.id);

      setLoading(false);

    } catch (err) {
      console.error('Error al validar token:', err);
      setError('Error al cargar el documento');
      setLoading(false);
    }
  };

  const handleIdentification = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!formData.name.trim()) {
      toast.error('Por favor, ingresá tu nombre completo');
      return;
    }

    if (!formData.ndaAccepted) {
      toast.error('Debés aceptar el acuerdo de confidencialidad para continuar');
      return;
    }

    try {
      // Actualizar signer_link con datos del firmante
      await supabase
        .from('signer_links')
        .update({
          signer_name: formData.name.trim(),
          signer_company: formData.company.trim() || null,
          signer_job_title: formData.jobTitle.trim() || null,
          nda_accepted: true,
          nda_accepted_at: new Date().toISOString(),
          status: 'identified'
        })
        .eq('id', signerLink.id);

      // Registrar evento 'identified'
      await EventHelpers.logSignerIdentified(
        signerLink.document_id,
        signerLink.id,
        formData
      );

      // Pasar a la pantalla de firma
      setStep(2);

    } catch (err) {
      console.error('Error al guardar identificación:', err);
      toast.error('Error al guardar tus datos. Por favor, intentá nuevamente.');
    }
  };

  const handleUploadSignature = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, subí una imagen válida');
      return;
    }

    // Leer como data URL
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedSignature(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const getSignatureDataUrl = () => {
    if (signatureTab === 'draw') {
      return getSignatureData();
    } else if (signatureTab === 'type' && typedSignature) {
      // Crear canvas temporal con texto
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = "48px 'Dancing Script', cursive";
      ctx.fillStyle = 'black';
      ctx.fillText(typedSignature, 20, 100);

      return canvas.toDataURL('image/png');
    } else if (signatureTab === 'upload' && uploadedSignature) {
      return uploadedSignature;
    }
    return null;
  };

  const handleSign = async () => {
    const signatureDataUrl = getSignatureDataUrl();

    if (!signatureDataUrl) {
      toast.error('Por favor, aplicá tu firma antes de continuar');
      return;
    }

    try {
      setSubmitting(true);

      // Guardar firma en signer_link
      await supabase
        .from('signer_links')
        .update({
          signature_data_url: signatureDataUrl,
          signed_at: new Date().toISOString(),
          status: 'signed'
        })
        .eq('id', signerLink.id);

      // Registrar evento 'signed'
      await EventHelpers.logDocumentSigned(
        signerLink.document_id,
        signerLink.id,
        {
          email: formData.email,
          name: formData.name,
          company: formData.company,
          jobTitle: formData.jobTitle,
          signatureType: signatureTab
        },
        null
      );

      // Enviar email de notificación al owner (no bloqueante)
      supabase.functions
        .invoke('notify-document-signed', {
          body: { signerLinkId: signerLink.id }
        })
        .then(({ data, error }) => {
          if (error) {
            console.warn('⚠️ Error al enviar notificación:', error);
          } else {
            console.log('✅ Notificación enviada:', data);
          }
        })
        .catch((err) => {
          console.warn('⚠️ Error al enviar notificación:', err);
        });

      // Mostrar confirmación
      setStep(3);

    } catch (err) {
      console.error('Error al guardar firma:', err);
      toast.error('Error al guardar la firma. Por favor, intentá nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== RENDERS ====================

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-gray-900 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Cargando documento...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <Shield className="w-20 h-20 text-red-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Error</h2>
          <p className="text-gray-600 text-lg mb-8">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-gray-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // STEP 1: Identificación
  if (step === 1) {
    return (
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <Shield className="w-20 h-20 text-gray-900 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Firma de Documento
            </h1>
            <p className="text-gray-600 text-lg">
              Documento: <strong>{document?.document_name}</strong>
            </p>
          </div>

          {/* Formulario */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Identificación del Firmante
            </h2>

            <form onSubmit={handleIdentification} className="space-y-5">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
                  required
                />
              </div>

              {/* Email (readonly) */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  readOnly
                  className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
                />
              </div>

              {/* Empresa y Puesto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Empresa (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Ej: Acme Inc."
                    className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Puesto (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    placeholder="Ej: Director"
                    className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* NDA */}
              <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.ndaAccepted}
                    onChange={(e) => setFormData({ ...formData, ndaAccepted: e.target.checked })}
                    className="mt-1 w-5 h-5 text-gray-900 rounded focus:ring-gray-900"
                    required
                  />
                  <label className="text-sm text-gray-700 leading-relaxed">
                    <strong>Acepto el acuerdo de confidencialidad (NDA)</strong> y me comprometo a mantener la privacidad y confidencialidad de este documento y su contenido. <span className="text-red-500">*</span>
                  </label>
                </div>
              </div>

              {/* Botón */}
              <button
                type="submit"
                className="w-full bg-gray-900 text-white py-4 px-6 rounded-xl text-lg font-semibold hover:bg-gray-800 transition shadow-lg"
              >
                Continuar para firmar →
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Firma
  if (step === 2) {
    return (
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Firmá el documento
          </h1>

          <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-sm">
            {/* Tabs */}
            <div className="flex border-b-2 border-gray-200 mb-6">
              <button
                onClick={() => setSignatureTab('draw')}
                className={`flex items-center gap-2 px-6 py-3 font-semibold transition ${
                  signatureTab === 'draw'
                    ? 'text-gray-900 border-b-4 border-gray-900 -mb-0.5'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Pen className="w-5 h-5" />
                Dibujar
              </button>
              <button
                onClick={() => setSignatureTab('type')}
                className={`flex items-center gap-2 px-6 py-3 font-semibold transition ${
                  signatureTab === 'type'
                    ? 'text-gray-900 border-b-4 border-gray-900 -mb-0.5'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Type className="w-5 h-5" />
                Teclear
              </button>
              <button
                onClick={() => setSignatureTab('upload')}
                className={`flex items-center gap-2 px-6 py-3 font-semibold transition ${
                  signatureTab === 'upload'
                    ? 'text-gray-900 border-b-4 border-gray-900 -mb-0.5'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <UploadIcon className="w-5 h-5" />
                Subir
              </button>
            </div>

            {/* Tab Content */}
            <div className="mb-8">
              {/* Draw */}
              {signatureTab === 'draw' && (
                <div>
                  <canvas
                    ref={canvasRef}
                    {...handlers}
                    className="w-full h-64 border-2 border-gray-300 rounded-xl cursor-crosshair bg-white"
                  />
                  <button
                    onClick={clearCanvas}
                    className="mt-4 text-sm text-gray-600 hover:text-gray-900 underline"
                  >
                    Limpiar firma
                  </button>
                </div>
              )}

              {/* Type */}
              {signatureTab === 'type' && (
                <div>
                  <input
                    type="text"
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                    placeholder="Escribí tu nombre completo"
                    className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent mb-4"
                  />
                  {typedSignature && (
                    <div className="w-full h-64 border-2 border-gray-300 rounded-xl flex items-center justify-center bg-white">
                      <p
                        style={{ fontFamily: "'Dancing Script', cursive" }}
                        className="text-6xl text-gray-900"
                      >
                        {typedSignature}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Upload */}
              {signatureTab === 'upload' && (
                <div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleUploadSignature}
                    className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent mb-4"
                  />
                  {uploadedSignature && (
                    <div className="w-full h-64 border-2 border-gray-300 rounded-xl flex items-center justify-center bg-white p-4">
                      <img
                        src={uploadedSignature}
                        alt="Firma subida"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botón Firmar */}
            <button
              onClick={handleSign}
              disabled={submitting}
              className="w-full bg-gray-900 text-white py-4 px-6 rounded-xl text-lg font-semibold hover:bg-gray-800 transition shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Guardando firma...
                </>
              ) : (
                'Aplicar firma y finalizar'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 3: Completado
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center">
        <CheckCircle2 className="w-24 h-24 text-green-500 mx-auto mb-8" />
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          ¡Documento Firmado!
        </h1>
        <p className="text-gray-600 text-lg mb-10 max-w-md mx-auto">
          Tu firma ha sido registrada exitosamente. El propietario del documento recibirá una notificación.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-gray-900 text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 transition shadow-lg"
        >
          Finalizar
        </button>
      </div>
    </div>
  );
}

export default SignDocumentPage;
