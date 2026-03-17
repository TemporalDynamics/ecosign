import React, { useMemo, useState } from 'react';
import Header from '../components/Header';
import FooterInternal from '../components/FooterInternal';
import { getSupabase } from '../lib/supabaseClient';

function getSupabaseFunctionsUrl(): string {
  let url = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || import.meta.env.VITE_SUPABASE_URL;
  if (!url) throw new Error('Missing VITE_SUPABASE_URL');
  url = url.replace(/\/+$/, '');
  if (!url.includes('/functions/v1')) url = `${url}/functions/v1`;
  return url.replace(/\/functions\/v1\/functions\/v1/g, '/functions/v1');
}

type PlanKey = 'pro' | 'business' | 'enterprise';

export default function AdminTrialsPage() {
  const [email, setEmail] = useState('');
  const [planKey, setPlanKey] = useState<PlanKey>('business');
  const [trialMonths, setTrialMonths] = useState(2);
  const [nextPlanKey, setNextPlanKey] = useState<PlanKey>('business');
  const [discountPercent, setDiscountPercent] = useState<string>('');
  const [discountMonths, setDiscountMonths] = useState<number>(2);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const hasDiscount = useMemo(() => {
    const n = Number(discountPercent);
    return Number.isFinite(n) && n > 0;
  }, [discountPercent]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No hay sesión activa');

      const functionsUrl = getSupabaseFunctionsUrl();
      const payload: any = {
        email,
        plan_key: planKey,
        trial_months: trialMonths,
        next_plan_key: nextPlanKey,
        notes: notes.trim() || undefined,
      };

      if (hasDiscount) {
        payload.discount_percent = Number(discountPercent);
        payload.discount_months = discountMonths;
      }

      const response = await fetch(`${functionsUrl}/admin-issue-trial-offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
      }
      setResult(data);
    } catch (err: any) {
      setError(err?.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header variant="private" />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Regalar Free Trial</h1>
        <p className="text-sm text-gray-600 mt-2">
          Cargá el email, elegí plan y duración. EcoSign envía una invitación por email con el resumen de decisiones.
        </p>

        <form onSubmit={submit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Email del destinatario</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="cliente@empresa.com"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Plan del trial</label>
              <select
                value={planKey}
                onChange={(e) => {
                  const v = e.target.value as PlanKey;
                  setPlanKey(v);
                  setNextPlanKey(v);
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="pro">PRO</option>
                <option value="business">BUSINESS</option>
                <option value="enterprise">ENTERPRISE</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Duración (meses)</label>
              <input
                value={trialMonths}
                onChange={(e) => setTrialMonths(Math.max(1, Math.min(24, Number(e.target.value || 1))))}
                type="number"
                min={1}
                max={24}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Plan al terminar el trial</label>
            <select
              value={nextPlanKey}
              onChange={(e) => setNextPlanKey(e.target.value as PlanKey)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="pro">PRO</option>
              <option value="business">BUSINESS</option>
              <option value="enterprise">ENTERPRISE</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Nota: por ahora esto define capacidades al finalizar (billing real se integra después).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Descuento (%) opcional</label>
              <input
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                type="number"
                min={0}
                max={100}
                step={0.5}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Ej: 20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Duración descuento (meses)</label>
              <input
                value={discountMonths}
                onChange={(e) => setDiscountMonths(Math.max(1, Math.min(36, Number(e.target.value || 1))))}
                type="number"
                min={1}
                max={36}
                disabled={!hasDiscount}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Nota (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              rows={3}
              placeholder="Ej: Founder beta — 2 meses gratis, luego 20% por 2 meses."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto px-5 py-2.5 rounded-lg bg-black text-white font-semibold hover:bg-gray-900 disabled:opacity-60"
          >
            {loading ? 'Enviando...' : 'Enviar invitación'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-sm">
            <div className="font-semibold">Invitación encolada</div>
            <div className="mt-2 grid grid-cols-1 gap-1">
              <div><span className="text-emerald-800/80">Email:</span> {result.recipient_email}</div>
              <div><span className="text-emerald-800/80">Plan trial:</span> {result.plan_key}</div>
              <div><span className="text-emerald-800/80">Vence:</span> {result.trial_ends_at}</div>
              {result.action_link && (
                <div className="break-all">
                  <span className="text-emerald-800/80">Link:</span> {result.action_link}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <FooterInternal />
    </div>
  );
}
