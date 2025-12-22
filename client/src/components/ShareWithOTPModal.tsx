/**
 * ShareWithOTPModal Component
 * 
 * Modal para compartir documentos protegidos con código OTP.
 * Zero Server-Side Knowledge Architecture.
 */

import { useState } from 'react';
import { X, Shield, Copy, Check } from 'lucide-react';
import { shareDocument } from '../lib/storage';
import type { ShareDocumentResult } from '../lib/storage';

interface ShareWithOTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    filename: string;
  };
}

export function ShareWithOTPModal({
  isOpen,
  onClose,
  document,
}: ShareWithOTPModalProps) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareResult, setShareResult] = useState<ShareDocumentResult | null>(null);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleShare = async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await shareDocument({
        documentId: document.id,
        recipientEmail,
        expiresInDays,
        message: message || undefined,
      });

      setShareResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al compartir documento');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'otp' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'otp') {
        setCopiedOtp(true);
        setTimeout(() => setCopiedOtp(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const handleClose = () => {
    setRecipientEmail('');
    setMessage('');
    setExpiresInDays(7);
    setShareResult(null);
    setError(null);
    onClose();
  };

  // Success view
  if (shareResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              Código Enviado
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              📧 Email enviado a: <strong>{recipientEmail}</strong>
            </p>

            {/* OTP Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de Acceso
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg px-4 py-3">
                  <p className="text-lg font-mono font-bold text-gray-900 text-center tracking-wider">
                    {shareResult.otp}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(shareResult.otp, 'otp')}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  title="Copiar código"
                >
                  {copiedOtp ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Share Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enlace para Compartir
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2">
                  <p className="text-xs font-mono text-gray-600 truncate">
                    {shareResult.shareUrl}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(shareResult.shareUrl, 'link')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  title="Copiar enlace"
                >
                  {copiedLink ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                💡 Compartí ambos de forma segura con el destinatario
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t">
            <button
              onClick={handleClose}
              className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Share form view
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Compartir Documento Protegido
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Document info */}
          <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-700" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {document.filename}
              </p>
              <p className="text-xs text-gray-600">Protegido</p>
            </div>
          </div>

          {/* Recipient email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email del destinatario
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

          {/* Optional message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mensaje (opcional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Por favor revisá este documento..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
            />
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vence en
            </label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value={1}>1 día</option>
              <option value={3}>3 días</option>
              <option value={7}>7 días</option>
              <option value={14}>14 días</option>
              <option value={30}>30 días</option>
            </select>
          </div>

          {/* How it works */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-700 mb-2">
              ℹ️ Cómo funciona:
            </p>
            <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
              <li>Le enviamos un código de acceso</li>
              <li>Lo ingresa para acceder al documento</li>
              <li>El acceso expira automáticamente</li>
            </ul>
            <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
              Este documento es privado. Para compartirlo, generamos un acceso temporal con código. Ni EcoSign ni el servidor de la nube tienen acceso al documento.
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
            onClick={handleClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleShare}
            disabled={!recipientEmail || loading}
            className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Enviando...' : 'Enviar Código'}
          </button>
        </div>
      </div>
    </div>
  );
}
