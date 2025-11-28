import React, { useState } from 'react';
import Link2 from 'lucide-react/dist/esm/icons/link2';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Check from 'lucide-react/dist/esm/icons/check';
import Send from 'lucide-react/dist/esm/icons/send';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Clock from 'lucide-react/dist/esm/icons/clock';
import { supabase } from '../lib/supabaseClient';

function ShareLinkGenerator({ documentId, documentTitle, onClose }) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [requireNda, setRequireNda] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!recipientEmail.trim()) {
      setError('Ingresa el email del destinatario');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      setError('Email inválido');
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      const { data, error: funcError } = await supabase.functions.invoke('generate-link', {
        body: {
          document_id: documentId,
          recipient_email: recipientEmail.trim(),
          expires_in_hours: expiresInHours,
          require_nda: requireNda
        }
      });

      if (funcError) {
        throw new Error(funcError.message || 'Error al generar enlace');
      }

      if (!data.success) {
        throw new Error(data.error || 'Error al procesar la solicitud');
      }

      setGeneratedLink(data);

    } catch (err) {
      console.error('Error generating link:', err);
      setError(err.message || 'Error al generar el enlace');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedLink?.access_url) return;

    try {
      await navigator.clipboard.writeText(generatedLink.access_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying:', err);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-md w-full p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
            <Link2 className="w-5 h-5 text-black" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Generar enlace seguro</h3>
            <p className="text-xs text-gray-500">{documentTitle}</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {!generatedLink ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email del destinatario
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="destinatario@email.com"
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

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Requerir NDA</span>
            </div>
            <button
              onClick={() => setRequireNda(!requireNda)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                requireNda ? 'bg-black' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  requireNda ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating}
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
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-emerald-900">Enlace generado</span>
            </div>
            <p className="text-sm text-emerald-700">
              Enviado a: {generatedLink.recipient_email}
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
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-600" />
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
