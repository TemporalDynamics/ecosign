import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { resendReminder } from '../lib/operationsService';

export default function ResendReminderModal({ open, onClose, operationId, defaultEmail }: { open: boolean; onClose: () => void; operationId: string; defaultEmail?: string | null }) {
  const [email, setEmail] = useState(defaultEmail || '');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!email) {
      toast.error('Ingresá el email del firmante');
      return;
    }
    setLoading(true);
    try {
      await resendReminder(operationId, email);
      toast.success('Recordatorio encolado');
      onClose();
    } catch (err: any) {
      if (err && err.code === 'cooldown') {
        toast('Recordatorio bloqueado: cooldown activo. Probá más tarde.', { icon: '⏳' });
      } else if (err && err.code === 'limit') {
        toast('Límite de recordatorios alcanzado para este firmante.', { icon: '⚠️' });
      } else {
        console.error(err);
        toast.error('No se pudo reenviar el recordatorio');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Reenviar recordatorio</h3>
        <p className="text-sm text-gray-600 mb-4">Ingresá el email del firmante al que querés reenviar el recordatorio.</p>
        <input
          type="email"
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ejemplo@dominio.com"
        />
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded border border-gray-300 text-sm">Cancelar</button>
          <button disabled={loading} onClick={handleSubmit} className="px-3 py-1 rounded bg-black text-white text-sm">{loading ? 'Enviando…' : 'Reenviar'}</button>
        </div>
      </div>
    </div>
  );
}
