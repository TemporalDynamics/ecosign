import React, { useState } from 'react';
import { X, Shield, FileText, Send } from 'lucide-react';
import { getSupabase } from '../lib/supabaseClient';
import InhackeableTooltip from './InhackeableTooltip';

const NdaModal = ({ isOpen, onClose, document }) => {
  const [duration, setDuration] = useState('6m');
  const [jurisdiction, setJurisdiction] = useState('smart');
  const [type, setType] = useState('unilateral');
  const [customClause, setCustomClause] = useState('');
  const [acceptanceChecked, setAcceptanceChecked] = useState(true);
  const [loading, setLoading] = useState(false);

  const supabase = getSupabase();

  const recordNdaEvent = async (action) => {
    if (!document?.id) return;
    setLoading(true);
    try {
      const payload = {
        document_id: document.id,
        action,
        metadata: {
          duration,
          jurisdiction,
          type,
          customClause: customClause?.trim() || null
        }
      };
      const { error } = await supabase
        .from('nda_events')
        .insert(payload);
      if (error) {
        console.error('Error registrando NDA:', error);
        window.alert('No se pudo registrar el NDA.');
        setLoading(false);
        return;
      }
      window.alert(action === 'otp_sent' ? 'NDA enviado para aceptación (OTP simulado).' : 'NDA agregado al flujo de firma.');
      onClose();
    } catch (err) {
      console.error('Error NDA:', err);
      window.alert('No se pudo registrar el NDA.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-900" />
            <div>
              <p className="text-sm text-gray-500 uppercase font-semibold">NDA Universal</p>
              <h3 className="text-lg font-semibold text-gray-900">Protegí este documento</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {document && (
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <FileText className="w-5 h-5 text-gray-900" />
              <div>
                <p className="text-sm font-medium text-gray-900">{document.document_name}</p>
                <p className="text-xs text-gray-500">Este NDA se asociará a este documento</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 uppercase">Duración</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="6m">6 meses</option>
                <option value="12m">12 meses</option>
                <option value="indef">Indefinido</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 uppercase">Jurisdicción</label>
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="smart">EcoSign / SmartHash</option>
                <option value="eidas">eIDAS (UE)</option>
                <option value="ueta">UETA / ESIGN (EE.UU.)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 uppercase">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="unilateral">Unilateral</option>
                <option value="bilateral">Bilateral</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 uppercase">Cláusula personalizada</label>
            <textarea
              value={customClause}
              onChange={(e) => setCustomClause(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="Agregá cláusulas opcionales específicas del acuerdo."
            />
          </div>

          <div className="space-y-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="font-semibold text-gray-900">Resumen legal (fijo)</p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
              <li>Propósito del acuerdo: proteger la información compartida en EcoSign.</li>
              <li>
                Beneficio del receptor: trazabilidad y blindaje <InhackeableTooltip className="font-semibold" /> (hash, sello legal y anchoring).
              </li>
              <li>Consentimiento informado: aceptación por checkbox + botón.</li>
              <li>Anti-coacción: registramos IP, user-agent, timestamps y hash del documento/NDA.</li>
            </ul>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={acceptanceChecked}
              onChange={(e) => setAcceptanceChecked(e.target.checked)}
            />
            <span>Acepto que este NDA se agregue al flujo (requiere OTP/checkbox del receptor).</span>
          </label>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Puedes enviar sin firma (solo OTP) o incluirlo en el flujo de firma. No se envía nada real en este MVP.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => recordNdaEvent('otp_sent')}
              disabled={!acceptanceChecked || loading}
              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Enviar NDA sin firma (OTP)
            </button>
            <button
              onClick={() => recordNdaEvent('included_in_signature')}
              disabled={!acceptanceChecked || loading}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Incluir en flujo de firma
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NdaModal;
