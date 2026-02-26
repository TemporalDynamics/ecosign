/**
 * OTPAccessModal Component
 * 
 * Modal para que los recipients accedan a documentos compartidos con OTP.
 * Zero Server-Side Knowledge Architecture.
 */

import { useEffect, useState, useRef } from 'react';
import { X, Shield } from 'lucide-react';
import { accessSharedDocument } from '../lib/storage';
import type { AccessSharedDocumentOptions } from '../lib/storage';
import { PdfEditViewer } from './pdf/PdfEditViewer';

interface OTPAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareId: string;
  documentName?: string;
  senderEmail?: string;
}

export function OTPAccessModal({
  isOpen,
  onClose,
  shareId,
  documentName = 'Documento',
  senderEmail = 'Un usuario',
}: OTPAccessModalProps) {
  const [otp, setOtp] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState('documento.pdf');
  const progressIntervalRef = useRef<number | undefined>(undefined);

  if (!isOpen) return null;

  useEffect(() => {
    return () => {
      if (successUrl) {
        URL.revokeObjectURL(successUrl);
      }
    };
  }, [successUrl]);

  const handleAccess = async () => {
    setError(null);
    setLoading(true);
    setProgress(0);

    try {
      // Simulate progress for UX
      if (progressIntervalRef.current) {
        // If an interval is already running, clear it to avoid duplicates
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = undefined;
      }
      progressIntervalRef.current = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = undefined;
            }
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const result = await accessSharedDocument({
        shareId,
        otp: otp.replace(/[-\s]/g, '').toUpperCase(), // Remove dashes and spaces, uppercase
        recipientEmail: `access-${Date.now()}@ecosign.local`, // Placeholder
      });

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = undefined;
      }
      setProgress(100);

      const url = URL.createObjectURL(result.blob);
      setSuccessUrl(url);
      setDownloadName(result.filename);
      setLoading(false);
    } catch (err) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = undefined;
      }
      
      // Mensajes de error humanos (no técnicos)
      let errorMessage = 'No pudimos abrir el documento todavía';
      let errorDetails = '';
      
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        
        if (msg.includes('invalid') || msg.includes('otp')) {
          errorMessage = 'Código incorrecto';
          errorDetails = 'Verificá que hayas copiado bien el código de 8 caracteres. No incluyas espacios ni guiones.';
        } else if (msg.includes('expired')) {
          errorMessage = 'El enlace expiró';
          errorDetails = 'Pedile a quien te compartió el documento que genere un nuevo enlace.';
        } else if (msg.includes('decrypt') || msg.includes('unwrap') || msg.includes('key')) {
          errorMessage = 'No pudimos reconstruir el documento';
          errorDetails = 'El enlace es válido, pero este navegador no pudo procesar el documento de forma segura. Probá: abrir el enlace nuevamente, usar otro navegador, o copiar el enlace en una ventana nueva.';
        } else if (msg.includes('download') || msg.includes('storage')) {
          errorMessage = 'Error de conexión';
          errorDetails = 'No pudimos descargar el archivo encriptado. Verificá tu conexión a internet y probá de nuevo.';
        }
      }
      
      setError(errorDetails || errorMessage);
      setProgress(0);
      setLoading(false);
    }
  };

  const formatOTP = (value: string) => {
    // Remove all non-alphanumeric characters
    const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Format as XXXX-XXXX
    if (clean.length <= 4) {
      return clean;
    }
    return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
  };

  const handleOTPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatOTP(e.target.value);
    setOtp(formatted);
  };

  // Loading view
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8">
          <div className="text-center space-y-4">
            <Shield className="w-12 h-12 text-gray-700 mx-auto animate-pulse" />
            <h3 className="text-lg font-semibold text-gray-900">
              Accediendo...
            </h3>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-gray-900 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            
            <p className="text-sm text-gray-600">
              Procesando en tu dispositivo de forma segura...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (successUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-gray-700" />
              Documento listo
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                ✅ Documento desencriptado correctamente en tu ordenador. Todo el procesamiento ocurrió de forma local y segura.
              </p>
            </div>
            <p className="text-sm text-gray-700">
              El documento se abre acá mismo. Podés descargarlo si lo necesitás.
            </p>
            <div className="w-full h-[60vh] rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
              <PdfEditViewer
                src={successUrl}
                locked
                className="w-full h-full"
              />
            </div>
          </div>

          <div className="p-6 border-t flex gap-3">
            <button
              onClick={() => {
                const a = document.createElement('a');
                a.href = successUrl;
                a.download = downloadName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
              className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition"
            >
              Descargar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Access form view
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-700" />
            Acceder a Documento Protegido
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Info */}
          <p className="text-sm text-gray-600">
            <strong>{senderEmail}</strong> compartió <strong>{documentName}</strong> con vos
          </p>

          {/* Access code input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código de Acceso
            </label>
            <input
              type="text"
              value={otp}
              onChange={handleOTPChange}
              placeholder="5MSC-Q29L"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono text-center text-lg tracking-wider uppercase"
              maxLength={9} // 8 chars + 1 dash
              required
              autoFocus
            />
          </div>

          {/* Info box */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-600">
              ℹ️ Ingresá el código de 8 caracteres (números y letras) que recibiste.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleAccess}
            disabled={!otp || loading}
            className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Acceder
          </button>
        </div>
      </div>
    </div>
  );
}
