/**
 * ShareDocumentModal - Modal de compartir documento
 * 
 * FILOSOFÍA:
 * - Un solo verbo: "Compartir"
 * - Link + Código de seguridad (OTP generado en cliente)
 * - Panel principal INMUTABLE (nunca cambia de tamaño)
 * - Panel lateral opcional para NDA (se revela, no empuja)
 * - Zero Server-Side Knowledge real
 * 
 * COMPORTAMIENTO:
 * - Estado inicial: Panel fijo con opciones de compartir
 * - Si activa NDA: Aparece panel lateral (izquierda)
 * - Panel fijo NUNCA cambia de dimensiones
 * - Al generar: muestra Link + Código (copiar por separado)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Link2, FileText, Shield, Clock, Copy, Check, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { shareDocument, listDocumentShares, revokeShare } from '../lib/storage/documentSharing';
import { getSupabase } from '../lib/supabaseClient';
import { ensureCryptoSession } from '../lib/e2e';

interface ShareDocumentModalProps {
  document: {
    id: string;
    document_name: string;
    encrypted: boolean;
    pdf_storage_path?: string | null;
    eco_storage_path?: string | null;
    eco_file_data?: string | null;
  };
  onClose: () => void;
}

type ShareFormat = 'pdf' | 'eco' | 'both';

const DEFAULT_NDA_TEXT = `ACUERDO DE CONFIDENCIALIDAD

Este documento fue compartido de forma privada a través de EcoSign.

Al continuar, aceptás mantener su contenido confidencial y no divulgarlo a terceros sin autorización del remitente.

Este acceso quedará registrado con fines de auditoría.`;

export default function ShareDocumentModal({ document, onClose }: ShareDocumentModalProps) {
  // Estado del panel fijo (inmutable)
  const [selectedFormats, setSelectedFormats] = useState<Set<'pdf' | 'eco'>>(new Set(['pdf']));
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [ndaEnabled, setNdaEnabled] = useState(false);
  
  // Estado del panel lateral (NDA)
  const [ndaText, setNdaText] = useState(DEFAULT_NDA_TEXT);
  
  // Estado de inicialización
  const [initializing, setInitializing] = useState(true);

  // Estado de shares existentes
  const [existingShares, setExistingShares] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Estado de generación
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado de resultado
  const [shareResult, setShareResult] = useState<{
    shareUrl: string;
    otp: string;
    expiresAt: string;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Estado de confirmación
  const [confirmRevoke, setConfirmRevoke] = useState<{
    shareId?: string;
    all?: boolean;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Inicializar TODO en paralelo
  useEffect(() => {
    const init = async () => {
      try {
        // Cargar shares existentes (no inicializamos crypto acá)
        const shares = await listDocumentShares(document.id);
        setExistingShares(shares);
      } catch (err) {
        console.error('Error loading shares:', err);
        setError('Error al cargar accesos existentes.');
      } finally {
        setInitializing(false);
      }
    };

    init();
  }, [document.id]);

  // Validaciones
  const hasPdf = !!document.pdf_storage_path;
  const hasEco = !!(document.eco_storage_path || document.eco_file_data);

  const canShare = useMemo(() => {
    if (selectedFormats.size === 0) return false;

    for (const format of selectedFormats) {
      if (format === 'pdf' && !hasPdf) return false;
      if (format === 'eco' && !hasEco) return false;
    }

    return true;
  }, [selectedFormats, hasPdf, hasEco]);
  
  const toggleFormat = (format: 'pdf' | 'eco') => {
    setSelectedFormats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(format)) {
        newSet.delete(format);
      } else {
        newSet.add(format);
      }
      return newSet;
    });
  };

  const handleGenerate = async () => {
    if (!canShare) {
      setError('El formato seleccionado no está disponible para este documento.');
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Necesitás iniciar sesión para compartir documentos.');
      }

      // CRITICAL: Ensure crypto session is ready before sharing
      console.log('🔐 Ensuring crypto session before sharing...');
      const sessionReady = await ensureCryptoSession(user.id);
      
      if (!sessionReady) {
        throw new Error('No se pudo inicializar el cifrado. Por favor, recargá la página.');
      }
      
      console.log('✅ Crypto session ready, proceeding with share...');

      // Llamar a shareDocument (genera OTP en cliente)
      const result = await shareDocument({
        documentId: document.id,
        recipientEmail: `share-${Date.now()}@ecosign.local`, // Placeholder (no se usa email)
        expiresInDays,
        ndaEnabled,
        ndaText: ndaEnabled ? ndaText : undefined,
      });

      setShareResult({
        shareUrl: result.shareUrl,
        otp: result.otp,
        expiresAt: result.expiresAt,
      });

      // Recargar la lista de shares
      const shares = await listDocumentShares(document.id);
      setExistingShares(shares);

    } catch (err) {
      console.error('Error generating share:', err);
      const message = err instanceof Error ? err.message : 'Error al generar el enlace';
      setError(message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (text: string, type: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
        toast.success('Enlace copiado');
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
        toast.success('Código copiado');
      }
    } catch (err) {
      console.error('Error copying:', err);
      toast.error('No pudimos copiar al portapapeles. Intentá seleccionar y copiar manualmente.');
    }
  };

  const formatOTP = (otp: string) => {
    // Formato: XXXX-XXXX
    return otp.match(/.{1,4}/g)?.join('-') || otp;
  };

  const handleRevokeShare = async (shareId: string) => {
    setConfirmRevoke({ shareId });
  };

  const handleRevokeAll = async () => {
    setConfirmRevoke({ all: true });
  };

  const confirmRevokeAction = async () => {
    if (!confirmRevoke) return;

    try {
      if (confirmRevoke.all) {
        // Revocar todos los shares activos
        await Promise.all(
          existingShares
            .filter(share => share.status !== 'expired')
            .map(share => revokeShare(share.id))
        );
        toast.success('Todos los accesos revocados');
      } else if (confirmRevoke.shareId) {
        await revokeShare(confirmRevoke.shareId);
        toast.success('Acceso revocado');
      }
      
      // Recargar shares
      const shares = await listDocumentShares(document.id);
      setExistingShares(shares);
      setConfirmRevoke(null);
    } catch (err) {
      console.error('Error revoking:', err);
      toast.error('No pudimos revocar el acceso. Verificá tu conexión e intentá de nuevo.');
    }
  };

  // Si ya se generó el enlace, mostrar resultado
  if (shareResult) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Documento listo para compartir</h3>
                <p className="text-xs text-gray-500">{document.document_name}</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 transition"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-5">
            {/* Enlace */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Enlace
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareResult.shareUrl}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono text-gray-700"
                />
                <button
                  onClick={() => handleCopy(shareResult.shareUrl, 'link')}
                  className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition flex items-center gap-2"
                >
                  {copiedLink ? (
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

            {/* Código de seguridad */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Código de seguridad
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={formatOTP(shareResult.otp)}
                  className="flex-1 px-3 py-2 bg-blue-50 border border-blue-300 rounded-lg text-lg font-mono font-bold text-gray-900 text-center tracking-wider"
                />
                <button
                  onClick={() => handleCopy(shareResult.otp, 'code')}
                  className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition flex items-center gap-2"
                >
                  {copiedCode ? (
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

            {/* Instrucciones */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong className="font-semibold">Importante:</strong> Compartí el enlace y el código <strong>por separado</strong>. 
                Sin el código, nadie puede acceder al documento.
              </p>
            </div>

            {/* Info adicional */}
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Clock className="w-4 h-4" />
              <span>
                Expira: {new Date(shareResult.expiresAt).toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>

            {ndaEnabled && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Shield className="w-4 h-4" />
                <span>Con acuerdo de confidencialidad</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            {existingShares.length > 0 ? (
              <>
                <button
                  onClick={() => {
                    setShareResult(null);
                    setShowCreateForm(false);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Ver todos los accesos
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition font-medium"
                >
                  Cerrar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setShareResult(null);
                    setShowCreateForm(true);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Generar otro enlace
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition font-medium"
                >
                  Cerrar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (initializing) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
            <p className="text-sm text-gray-600">Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  // Estado 2: Si el documento ya tiene shares, mostrar UI de gestión
  if (existingShares.length > 0 && !shareResult && !showCreateForm) {
    const activeShares = existingShares.filter(s => s.status === 'pending');
    const expiredShares = existingShares.filter(s => s.status === 'expired');
    const accessedShares = existingShares.filter(s => s.status === 'accessed');

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Link2 className="w-5 h-5 text-blue-900" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Gestionar accesos</h3>
                <p className="text-xs text-gray-500">{document.document_name}</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 transition"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Accesos activos */}
          {activeShares.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Accesos activos ({activeShares.length})
              </h4>
              <div className="space-y-2">
                {activeShares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          Acceso
                        </span>
                        {share.nda_enabled ? (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                            Con NDA
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                            Sin NDA
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        Creado: {new Date(share.created_at).toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                        {' · '}
                        Expira: {new Date(share.expires_at).toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeShare(share.id)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Revocar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accesos usados */}
          {accessedShares.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Accesos usados ({accessedShares.length})
              </h4>
              <div className="space-y-2">
                {accessedShares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 opacity-60"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm text-gray-900 mb-1">
                        <span className="font-medium">
                          Acceso usado {share.nda_enabled && '· Con NDA'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Accedido: {new Date(share.accessed_at).toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accesos revocados */}
          {expiredShares.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Accesos revocados ({expiredShares.length})
              </h4>
              <div className="space-y-2">
                {expiredShares.slice(0, 3).map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 opacity-40"
                  >
                    <div className="flex-1">
                      <div className="text-sm text-gray-600 mb-1">
                        Acceso revocado
                      </div>
                      <div className="text-xs text-gray-500">
                        Creado: {new Date(share.created_at).toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            {activeShares.length > 0 && (
              <button
                onClick={handleRevokeAll}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Revocar todos los accesos
              </button>
            )}
            <button
              onClick={() => {
                // Don't initialize crypto here - it should be initialized at auth level
                // If session is not initialized, handleGenerate will handle it with ensureCryptoSession
                setShowCreateForm(true);
                setShareResult(null);
                setError(null);
              }}
              className="ml-auto px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition font-medium text-sm flex items-center gap-2"
            >
              <Link2 className="w-4 h-4" />
              Crear nuevo acceso
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Estado 1: Primera vez / Configuración (pantalla de configuración)
  return (
    <div className="fixed inset-0 bg-black/50 z-50 p-4">
      {/* Panel lateral (NDA) - Solo visible si está activo */}
      {ndaEnabled && !isMobile && (
        <div 
          className="fixed top-1/2 bg-gray-50 overflow-y-auto rounded-l-2xl shadow-xl border border-r-0 border-gray-200 transition-all duration-300"
          style={{
            // Step1: right=80px, width=480px (ocupa 560px desde el borde derecho)
            // Step2: debe ser lo suficientemente ancho para que step1+step2 queden centrados
            // En viewport 1920px: centro=960px
            // Para centrar 1160px total: debe empezar en 960-580=380px del borde izquierdo
            // Eso significa: step2 = 1920 - 560 (step1+margen) - 380 (margen izq) = 980px
            right: '560px', // Pegado al lado izquierdo de step1
            width: '680px', // Ancho generoso para el NDA
            height: 'calc(100vh - 2rem)',
            maxHeight: '90vh',
            transform: 'translateY(-50%)',
            padding: '1.5rem',
          }}
        >
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 mb-1">Acuerdo de confidencialidad</h4>
            <p className="text-xs text-gray-500">
              El destinatario deberá aceptar este acuerdo antes de acceder al documento.
            </p>
          </div>
          
          <textarea
            value={ndaText}
            onChange={(e) => setNdaText(e.target.value)}
            className="w-full h-[calc(100%-4rem)] px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-black resize-none font-mono"
            placeholder="Texto del acuerdo..."
          />
        </div>
      )}

      {/* Panel principal (INMUTABLE - posición ABSOLUTA fija) */}
      <div
        className="fixed bg-white rounded-2xl shadow-xl border border-gray-200 p-6 flex flex-col transition-all duration-300"
        style={isMobile ? {
          top: '1rem',
          left: '1rem',
          right: '1rem',
          width: 'auto',
          height: 'calc(100vh - 2rem)',
          maxHeight: 'calc(100vh - 2rem)',
          transform: 'none',
        } : {
          top: '50%',
          right: '80px', // FIJO - NUNCA cambia
          width: '480px', // FIJO - NUNCA cambia
          height: 'calc(100vh - 2rem)', // MISMA altura que step2
          maxHeight: '90vh',
          transform: 'translateY(-50%)',
          borderTopLeftRadius: ndaEnabled ? '0' : '1rem',
          borderBottomLeftRadius: ndaEnabled ? '0' : '1rem',
        }}
      >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Link2 className="w-5 h-5 text-blue-900" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Compartir documento</h3>
                <p className="text-xs text-gray-500">{document.document_name}</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 transition"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            
            {/* Copy introductorio */}
            <p className="text-sm text-gray-600 mb-5">
              Generá un enlace seguro para compartir este documento. El acceso requiere un código de seguridad.
            </p>

            {/* Qué vas a compartir */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Qué vas a compartir
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => toggleFormat('pdf')}
                  disabled={!hasPdf}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition ${
                    selectedFormats.has('pdf')
                      ? 'border-2 border-blue-600 text-blue-900 bg-white'
                      : hasPdf
                      ? 'border border-gray-300 text-gray-700 hover:border-gray-400 bg-white'
                      : 'border border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                  }`}
                >
                  <FileText className="w-5 h-5 mx-auto mb-1.5" />
                  <div className="text-xs">PDF</div>
                  {!hasPdf && <div className="text-[10px] text-gray-400 mt-0.5">No disponible</div>}
                </button>
                
                <button
                  type="button"
                  onClick={() => toggleFormat('eco')}
                  disabled={!hasEco}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition ${
                    selectedFormats.has('eco')
                      ? 'border-2 border-blue-600 text-blue-900 bg-white'
                      : hasEco
                      ? 'border border-gray-300 text-gray-700 hover:border-gray-400 bg-white'
                      : 'border border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                  }`}
                  title="Evidencia criptográfica"
                >
                  <Shield className="w-5 h-5 mx-auto mb-1.5" />
                  <div className="text-xs">.ECO</div>
                  {!hasEco && <div className="text-[10px] text-gray-400 mt-0.5">No disponible</div>}
                </button>
              </div>
              
              {/* Indicador de selección */}
              <div className="mt-3 text-xs text-gray-500">
                {selectedFormats.size === 0 && (
                  <span>Seleccioná al menos un formato</span>
                )}
                {selectedFormats.size === 1 && selectedFormats.has('pdf') && (
                  <span>• Compartiendo PDF</span>
                )}
                {selectedFormats.size === 1 && selectedFormats.has('eco') && (
                  <span>• Compartiendo evidencia criptográfica (.ECO)</span>
                )}
                {selectedFormats.size === 2 && (
                  <span>• Compartiendo PDF + evidencia criptográfica (.ECO)</span>
                )}
              </div>
            </div>

            {/* Acuerdo de confidencialidad */}
            <div className="mb-5">
              <button
                type="button"
                onClick={() => setNdaEnabled(!ndaEnabled)}
                className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition text-left flex items-center justify-between ${
                  ndaEnabled
                    ? 'border-2 border-blue-600 text-blue-900 bg-white'
                    : 'border border-gray-300 text-gray-700 hover:border-gray-400 bg-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Acuerdo de confidencialidad
                </span>
                {ndaEnabled && (
                  <span className="text-xs bg-blue-100 text-blue-900 px-2 py-0.5 rounded">
                    Activo
                  </span>
                )}
              </button>
              
              {ndaEnabled && (
                <p className="text-xs text-gray-500 mt-2">
                  El destinatario deberá aceptar el acuerdo antes de acceder. Editá el texto debajo.
                </p>
              )}
            </div>

            {/* NDA Acordeón mobile (solo visible en mobile cuando está activado) */}
            {ndaEnabled && (
              <div className="lg:hidden mb-5 border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3">
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">Acuerdo de confidencialidad</h4>
                  <p className="text-xs text-gray-500">
                    El destinatario deberá aceptar este acuerdo antes de acceder al documento.
                  </p>
                </div>
                <textarea
                  value={ndaText}
                  onChange={(e) => setNdaText(e.target.value)}
                  className="w-full h-40 px-3 py-2 border-t border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-0 resize-none font-mono bg-white"
                  placeholder="Texto del acuerdo..."
                />
              </div>
            )}

            {/* Expiración */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Expiración del enlace
              </label>
              <select
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm"
              >
                <option value={1}>24 horas</option>
                <option value={3}>3 días</option>
                <option value={7}>7 días</option>
                <option value={30}>30 días</option>
              </select>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700 mb-5">
                {error}
              </div>
            )}
          </div>

          {/* CTA fijo al fondo */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleGenerate}
              disabled={initializing || generating || !canShare}
              className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {initializing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Inicializando...
                </>
              ) : generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Generando...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  {ndaEnabled ? 'Generar enlace con NDA' : 'Generar enlace'}
                </>
              )}
            </button>
          </div>
        </div>

      {/* Modal de confirmación */}
      {confirmRevoke && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {confirmRevoke.all ? 'Revocar todos los accesos' : 'Revocar acceso'}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {confirmRevoke.all
                ? 'Todos los enlaces activos dejarán de funcionar inmediatamente. Las personas no podrán abrir el documento.'
                : 'Este acceso dejará de funcionar inmediatamente. La persona ya no podrá abrir el documento.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRevoke(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRevokeAction}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition font-medium"
              >
                Revocar acceso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
