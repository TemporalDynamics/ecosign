/**
 * OTPAccessModal Component
 * 
 * Modal para que los recipients accedan a documentos compartidos con OTP.
 * Zero Server-Side Knowledge Architecture.
 */

import { useState } from 'react';
import { X, Shield } from 'lucide-react';
import { accessSharedDocument } from '../lib/storage';
import type { AccessSharedDocumentOptions } from '../lib/storage';

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

  if (!isOpen) return null;

  const handleAccess = async () => {
    setError(null);
    setLoading(true);
    setProgress(0);

    try {
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const result = await accessSharedDocument({
        shareId,
        otp: otp.replace(/\s+/g, '').toUpperCase(),
        recipientEmail,
      });

      clearInterval(progressInterval);
      setProgress(100);

      // Download the file
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Success - close modal after brief delay
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al acceder al documento');
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const formatOTP = (value: string) => {
    // Remove all non-alphanumeric characters
    const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Format as XXXX-XXXX-XXXX
    const parts = [];
    for (let i = 0; i < clean.length; i += 4) {
      parts.push(clean.slice(i, i + 4));
    }
    
    return parts.join('-').slice(0, 14); // Max 12 chars + 2 dashes
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
              placeholder="X7K9-M2P4-W8N6"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono text-center text-lg tracking-wider"
              maxLength={14}
              required
            />
          </div>

          {/* Email input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tu Email
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="destinatario@ejemplo.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              required
            />
          </div>

          {/* Info box */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-600">
              ℹ️ El código de acceso te llegó por email. Ingresalo junto con tu email para acceder.
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
            disabled={!otp || !recipientEmail || loading}
            className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Acceder
          </button>
        </div>
      </div>
    </div>
  );
}
