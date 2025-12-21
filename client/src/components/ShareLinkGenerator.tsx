import React, { useEffect, useMemo, useState } from 'react';
import { Link2, Send, Check, Copy, Clock, Shield, Upload, FileCheck2, AlertTriangle, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSupabase } from '../lib/supabaseClient';
import { trackEvent } from '../lib/analytics';

type ShareDocument = {
  id: string;
  document_name: string;
  document_hash?: string | null;
  content_hash?: string | null;
  eco_hash?: string | null;
  pdf_storage_path?: string | null;
  eco_storage_path?: string | null;
  eco_file_data?: string | null;
};

interface ShareLinkGeneratorProps {
  document: ShareDocument;
  onClose: () => void;
  lockNda?: boolean;
  onPdfStored?: (documentId: string, storagePath: string) => void;
}

interface LinkResponse {
  success?: boolean;
  access_url?: string;
  expires_at?: string;
  recipient_email?: string;
  require_nda?: boolean;
  error?: string;
  [key: string]: unknown;
}

type ShareTarget = 'pdf' | 'certificate' | 'both';

const DEFAULT_NDA_TEXT = `ACUERDO DE CONFIDENCIALIDAD (NDA)

Este documento fue compartido de forma privada a través de EcoSign.

Al continuar, aceptás mantener su contenido confidencial y no divulgarlo a terceros sin autorización del remitente.

Este acceso quedará registrado con fines de auditoría.
`;

const computeHash = async (fileOrBlob: Blob | File): Promise<string> => {
  const buffer = await fileOrBlob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

function ShareLinkGenerator({ document, onClose, lockNda = false, onPdfStored }: ShareLinkGeneratorProps) {
  const hasCertificate = !!(document.eco_hash || document.eco_storage_path || document.eco_file_data);
  const initialTarget: ShareTarget = document.pdf_storage_path ? 'pdf' : 'certificate';
  const [shareTarget, setShareTarget] = useState<ShareTarget>(initialTarget);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [requireNda] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<LinkResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfStoragePath, setPdfStoragePath] = useState<string | null>(document.pdf_storage_path || null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfVerified, setPdfVerified] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [ndaText, setNdaText] = useState(DEFAULT_NDA_TEXT);
  const [ndaFileError, setNdaFileError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [ndaAccordionOpen, setNdaAccordionOpen] = useState(true);
  const [shareAccordionOpen, setShareAccordionOpen] = useState(true);

  const requiresPdf = useMemo(() => shareTarget === 'pdf' || shareTarget === 'both', [shareTarget]);
  const requiresCertificate = useMemo(() => shareTarget === 'certificate' || shareTarget === 'both', [shareTarget]);
  const shareSummary = useMemo(() => {
    if (shareTarget === 'pdf') return 'El NDA cubre el contenido del documento.';
    if (shareTarget === 'certificate') return 'El NDA cubre evidencia probatoria y metadatos.';
    return 'El NDA cubre contenido + evidencia.';
  }, [shareTarget]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleGenerate = async () => {
    if (!hasCertificate && requiresCertificate) {
      setError('No se encontró un certificado para compartir.');
      return;
    }

    if (requiresPdf && !pdfStoragePath) {
      setError('Para compartir el PDF, primero subilo y verificalo.');
      return;
    }

    // Email is optional - only validate format if provided
    if (recipientEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientEmail)) {
        setError('Email inválido');
        return;
      }
    }

    try {
      const supabase = getSupabase();
      setGenerating(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Necesitás iniciar sesión para generar el enlace.');
      }

      // If no email provided, use placeholder (link will be shared manually)
      const emailToSend = recipientEmail.trim() || `noemail-${Date.now()}@ecosign.local`;

      const { data, error: funcError } = await supabase.functions.invoke<LinkResponse>('generate-link', {
        body: {
          document_id: document.id,
          recipient_email: emailToSend,
          expires_in_hours: expiresInHours,
          require_nda: requireNda,
          nda_text: ndaText
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (funcError) {
        let message = funcError.message || 'Error al generar enlace';
        const context = (funcError as { context?: Response }).context;
        if (context) {
          try {
            const errorPayload = await context.clone().json();
            if (errorPayload?.error) {
              message = errorPayload.error;
            }
          } catch (parseError) {
            try {
              const text = await context.clone().text();
              if (text) {
                message = text;
              }
            } catch (textError) {
              console.warn('No se pudo leer el error de la edge function', textError);
            }
          }
        }
        throw new Error(message);
      }

      if (!data?.success || !data.access_url) {
        throw new Error(data?.error || 'Error al procesar la solicitud');
      }

      setGeneratedLink(data);

      // Track analytics
      trackEvent('share_link_created', {
        documentId: document.id,
        requireNda: requireNda,
        expiresIn: expiresInHours,
        hasRecipient: !!recipientEmail,
        shareTarget: shareTarget
      });

    } catch (err) {
      console.error('Error generating link:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Error al generar el enlace');
    } finally {
      setGenerating(false);
    }
  };

  const handlePdfSelected = async (file: File) => {
    if (!file) return;
    setPdfError(null);
    setPdfVerified(false);

    try {
      setUploadingPdf(true);
      const hash = await computeHash(file);
      const expectedHashes = [
        document.document_hash,
        document.content_hash,
        document.eco_hash
      ].filter(Boolean).map((value) => (value as string).toLowerCase());

      if (expectedHashes.length === 0) {
        setPdfError('No hay un hash disponible para verificar este documento.');
        return;
      }

      if (!expectedHashes.includes(hash.toLowerCase())) {
        setPdfError('Este PDF no coincide con el documento certificado.');
        return;
      }

      const supabase = getSupabase();
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setPdfError('Necesitás iniciar sesión para guardar el PDF.');
        return;
      }

      const storagePath = `${user.id}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(storagePath, file, {
          contentType: file.type || 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        setPdfError(uploadError.message || 'No se pudo subir el PDF.');
        return;
      }

      const finalPath = uploadData?.path || storagePath;
      const { error: updateError } = await supabase
        .from('user_documents')
        .update({
          pdf_storage_path: finalPath,
          zero_knowledge_opt_out: false,
          last_event_at: new Date().toISOString()
        })
        .eq('id', document.id);

      if (updateError) {
        setPdfError('No se pudo asociar el PDF al documento.');
        return;
      }

      setPdfStoragePath(finalPath);
      setPdfVerified(true);
      if (onPdfStored) {
        onPdfStored(document.id, finalPath);
      }
      toast.success('PDF verificado y guardado.');
    } catch (err) {
      console.error('Error verifying PDF:', err);
      setPdfError('No se pudo verificar el PDF.');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleNdaFileSelected = async (file: File) => {
    if (!file) return;
    setNdaFileError(null);
    try {
      const text = await file.text();
      if (!text.trim()) {
        setNdaFileError('El archivo de NDA está vacío.');
        return;
      }
      setNdaText(text);
    } catch (err) {
      console.error('Error reading NDA file:', err);
      setNdaFileError('No se pudo leer el archivo.');
    }
  };

  const handleCopy = async () => {
    if (!generatedLink?.access_url) return;

    try {
      await navigator.clipboard.writeText(generatedLink.access_url);
      setCopied(true);
      toast.success('Link copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying:', err);
      toast.error('Error al copiar el link');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-4xl w-full p-6 max-h-[90vh] md:max-h-none overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
            <Link2 className="w-5 h-5 text-black" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Enviar bajo NDA</h3>
            <p className="text-xs text-gray-500">{document.document_name}</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {!generatedLink ? (
        <div className={isMobile ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6'}>
          <div className={isMobile ? 'border border-gray-200 rounded-xl' : 'space-y-3'}>
            {isMobile && (
              <button
                type="button"
                onClick={() => setNdaAccordionOpen((prev) => !prev)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-gray-900"
              >
                <span>NDA que se va a enviar</span>
                {ndaAccordionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
            {(!isMobile || ndaAccordionOpen) && (
              <div className={isMobile ? 'px-4 pb-4 space-y-3' : 'space-y-3'}>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-gray-700">
                NDA que se va a enviar
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                <Upload className="w-4 h-4" />
                Cargar NDA propio (.txt)
                <input
                  type="file"
                  accept=".txt,.md"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleNdaFileSelected(e.target.files[0])}
                />
              </label>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <textarea
                value={ndaText}
                onChange={(e) => setNdaText(e.target.value)}
                rows={isMobile ? 10 : 14}
                className="w-full h-60 md:h-80 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            {ndaFileError && (
              <div className="text-xs text-red-600">{ndaFileError}</div>
            )}
            </div>
            )}
          </div>

          <div className={isMobile ? 'border border-gray-200 rounded-xl' : 'space-y-4'}>
            {isMobile && (
              <button
                type="button"
                onClick={() => setShareAccordionOpen((prev) => !prev)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-gray-900"
              >
                <span>Qué vas a compartir</span>
                {shareAccordionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
            {(!isMobile || shareAccordionOpen) && (
              <div className={isMobile ? 'px-4 pb-4 space-y-4' : 'space-y-4'}>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Qué vas a compartir
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'pdf', label: 'PDF' },
                  { value: 'certificate', label: '.ECO' },
                  { value: 'both', label: 'Ambos' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setShareTarget(option.value as ShareTarget)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition ${
                      shareTarget === option.value
                        ? 'border-black bg-black text-white'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">El acuerdo de confidencialidad aplica sobre lo seleccionado.</p>
              <p className="text-xs text-gray-500">{shareSummary}</p>
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <span>PDF: {pdfStoragePath ? 'disponible' : 'no disponible'}</span>
                <span>.ECO: {hasCertificate ? 'disponible' : 'no disponible'}</span>
              </div>
            </div>

            {requiresPdf && !pdfStoragePath && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
                <div className="flex items-start gap-2 text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                  <span>Para compartir el PDF necesitás subirlo y verificar que coincide con el certificado.</span>
                </div>
                <label className="flex items-center justify-center gap-2 border border-amber-300 bg-white rounded-lg px-3 py-2 text-xs font-medium text-amber-900 cursor-pointer">
                  {uploadingPdf ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-700 border-t-transparent"></div>
                      Verificando…
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Subir PDF para verificar
                    </>
                  )}
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    disabled={uploadingPdf}
                    onChange={(e) => e.target.files?.[0] && handlePdfSelected(e.target.files[0])}
                  />
                </label>
                {pdfVerified && (
                  <div className="flex items-center gap-2 text-xs text-emerald-700">
                    <FileCheck2 className="w-4 h-4" />
                    PDF verificado y guardado.
                  </div>
                )}
                {pdfError && (
                  <div className="text-xs text-red-600">{pdfError}</div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email del destinatario <span className="text-gray-500 text-xs">(opcional)</span>
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="destinatario@email.com (dejar vacío para compartir por WhatsApp)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black500 focus:border-black500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiración del enlace
              </label>
              <select
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black500 focus:border-black500"
              >
                <option value={24}>24 horas</option>
                <option value={72}>3 días</option>
                <option value={168}>1 semana</option>
                <option value={720}>30 días</option>
                <option value={0}>Sin expiración</option>
              </select>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
              <Shield className="w-4 h-4 text-gray-500" />
              <span>Este enlace requiere aceptación de NDA antes de acceder.</span>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating || (requiresPdf && !pdfStoragePath) || (requiresCertificate && !hasCertificate)}
              className="w-full bg-black hover:bg-cyan-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Generando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Generar enlace
                </>
              )}
            </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Check className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-gray-900">Documento listo para compartir</span>
            </div>
            <p className="text-sm text-gray-600">
              {document.document_name} · Compartido bajo NDA
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL de acceso
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={generatedLink.access_url}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            {generatedLink.expires_at
              ? `Expira: ${new Date(generatedLink.expires_at).toLocaleString()}`
              : 'Sin expiración'}
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Shield className="w-4 h-4" />
            {generatedLink.require_nda ? 'NDA requerido' : 'Sin NDA'}
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="w-4 h-4" />
            Incluye: {shareTarget === 'pdf' ? 'PDF' : shareTarget === 'certificate' ? 'Certificado' : 'PDF + Certificado'}
          </div>

          {recipientEmail.trim() ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              ✉️ Invitación enviada a: {generatedLink.recipient_email}
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              Enlace listo para compartir manualmente.
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full border border-gray-300 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50 transition"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}

export default ShareLinkGenerator;
