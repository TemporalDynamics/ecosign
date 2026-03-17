import React, { useEffect, useMemo, useState } from 'react';
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

type NavKey = 'summary' | 'team' | 'limits' | 'billing' | 'settings';
type Role = 'owner_supervisor' | 'supervisor_admin' | 'agent';
type Status = 'active' | 'invited' | 'suspended' | 'removed';

function formatMaybeDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('es-AR');
}

function ProgressBar({ used, limit }: { used: number; limit: number | null }) {
  const pct = limit === null || limit <= 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
        <span>
          {used} usados · {limit === null ? 'sin límite' : `${limit} disponibles`}
        </span>
        {limit !== null && <span>{pct}%</span>}
      </div>
      <div className="h-2 rounded-full bg-gray-100 border border-gray-200 overflow-hidden">
        <div className="h-2 bg-gray-900" style={{ width: `${limit === null ? 15 : pct}%` }} />
      </div>
    </div>
  );
}

export default function SupervisionCenterPage() {
  const [nav, setNav] = useState<NavKey>('summary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  // Team filters
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [search, setSearch] = useState('');

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'agent' | 'supervisor_admin'>('agent');
  const [inviteBusy, setInviteBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No hay sesión activa');

      const functionsUrl = getSupabaseFunctionsUrl();
      const resp = await fetch(`${functionsUrl}/supervision-dashboard`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json?.ok) {
        throw new Error(json?.error || json?.message || `HTTP ${resp.status}`);
      }
      setData(json);

      // Best-effort: record access for last_seen_at.
      if (json?.workspace?.id) {
        fetch(`${functionsUrl}/supervision-record-access`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ workspace_id: json.workspace.id }),
        }).catch(() => {});
      }
    } catch (err: any) {
      setError(err?.message || 'Error desconocido');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const members = Array.isArray(data?.members) ? data.members : [];
  const activity = Array.isArray(data?.activity) ? data.activity : [];
  const workspaceId = data?.workspace?.id ?? null;
  const planKey = String(data?.plan?.plan_key ?? '').toLowerCase();
  const isEnterprise = planKey.startsWith('enterprise');
  const trialEndsAt = data?.plan?.trial_ends_at ?? null;
  const actorRole = String(data?.actor?.role ?? '');

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m: any) => {
      if (roleFilter !== 'all' && m.role !== roleFilter) return false;
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${m.name ?? ''} ${m.email ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [members, roleFilter, statusFilter, search]);

  const invite = async () => {
    if (!workspaceId) return;
    if (inviteBusy) return;
    setInviteBusy(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No hay sesión activa');

      const functionsUrl = getSupabaseFunctionsUrl();
      const resp = await fetch(`${functionsUrl}/supervision-invite-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          email: inviteEmail,
          role: inviteRole,
        }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json?.ok) throw new Error(json?.error || json?.message || `HTTP ${resp.status}`);

      setInviteOpen(false);
      setInviteEmail('');
      setInviteRole('agent');
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Error desconocido');
    } finally {
      setInviteBusy(false);
    }
  };

  const memberAction = async (memberId: string, action: string, extra?: Record<string, unknown>) => {
    if (!workspaceId) return;
    setError(null);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No hay sesión activa');

      const functionsUrl = getSupabaseFunctionsUrl();
      const resp = await fetch(`${functionsUrl}/supervision-member-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ workspace_id: workspaceId, member_id: memberId, action, ...extra }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json?.ok) throw new Error(json?.error || json?.message || `HTTP ${resp.status}`);
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Error desconocido');
    }
  };

  const navItems: Array<{ key: NavKey; label: string }> = [
    { key: 'summary', label: 'Resumen' },
    { key: 'team', label: 'Equipo' },
    { key: 'limits', label: 'Uso y límites' },
    { key: 'billing', label: 'Plan y facturación' },
    { key: 'settings', label: 'Configuración' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header variant="private" />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6">
          <aside className="md:w-64">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="text-sm font-semibold text-gray-900">Centro de administración</div>
              <div className="text-xs text-gray-500 mt-1">
                {data?.workspace?.name ? data.workspace.name : '—'}
              </div>
              <div className="mt-2 text-xs text-gray-600">
                Plan: <span className="font-semibold text-gray-900">{planKey ? planKey.toUpperCase() : '—'}</span>
                {trialEndsAt && (
                  <>
                    {' '}· Trial vence: <span className="font-semibold text-gray-900">{formatMaybeDate(trialEndsAt)}</span>
                  </>
                )}
              </div>
              <nav className="mt-4 flex md:flex-col gap-2 flex-wrap">
                {navItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setNav(item.key)}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold text-left border transition ${
                      nav === item.key
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
              <button
                onClick={refresh}
                disabled={loading}
                className="mt-4 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {loading ? 'Actualizando…' : 'Actualizar'}
              </button>
            </div>
          </aside>

          <section className="flex-1">
            {error && (
              <div className="mb-4 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            {loading && !data && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="text-sm text-gray-600">Cargando…</div>
              </div>
            )}

            {!loading && !data && !error && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="text-sm text-gray-600">Sin datos.</div>
              </div>
            )}

            {data && nav === 'summary' && (
              <>
                {/* Zona 1: estado de cuenta + CTA */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900">Supervisor Home</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Estado de cuenta: <span className="font-semibold text-gray-900">{String(data.plan?.plan_status ?? '—')}</span>
                        {' '}· Plan: <span className="font-semibold text-gray-900">{planKey ? planKey.toUpperCase() : '—'}</span>
                        {trialEndsAt && (
                          <>
                            {' '}· Vence: <span className="font-semibold text-gray-900">{formatMaybeDate(trialEndsAt)}</span>
                          </>
                        )}
                      </div>
                      <div className="text-sm text-gray-700 mt-3">
                        Entrás para gestionar <span className="font-semibold">personas</span> y <span className="font-semibold">capacidad</span>. Lo demás queda abajo.
                      </div>
                    </div>
                    <button
                      onClick={() => setInviteOpen(true)}
                      className="px-4 py-2 rounded-lg bg-black text-white font-semibold hover:bg-gray-900 w-full md:w-auto"
                    >
                      Enviar invitación
                    </button>
                  </div>
                </div>

                {/* Zona 2: métricas cortas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                  {[
                    { label: 'Usuarios activos', value: data.summary?.active_users ?? 0 },
                    { label: 'Invitaciones pendientes', value: data.summary?.pending_invites ?? 0 },
                    { label: 'Operaciones activas', value: data.summary?.operations_active ?? 0 },
                    { label: 'Documentos recientes', value: data.summary?.documents_recent ?? 0 },
                  ].map((c) => (
                    <div key={c.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                      <div className="text-xs text-gray-500">{c.label}</div>
                      <div className="text-lg font-bold text-gray-900 mt-1">{c.value}</div>
                    </div>
                  ))}
                </div>

                {/* Zona 3: equipo (vista compacta) */}
                <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Equipo</div>
                      <div className="text-xs text-gray-500 mt-1">
                        “Invitar” envía un email. No crea usuarios automáticamente.
                      </div>
                    </div>
                    <button
                      onClick={() => setNav('team')}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Ver equipo
                    </button>
                  </div>

                  {members.filter((m: any) => m.role === 'agent' && (m.status === 'active' || m.status === 'invited')).length === 0 ? (
                    <div className="mt-5 p-4 rounded-lg border border-gray-200 bg-gray-50">
                      <div className="text-sm font-semibold text-gray-900">Tu equipo aún no tiene agentes invitados.</div>
                      <div className="text-sm text-gray-700 mt-1">
                        Invitá tu primer agente para que pueda operar dentro de esta cuenta según el plan activo.
                      </div>
                      <button
                        onClick={() => {
                          setInviteRole('agent');
                          setInviteOpen(true);
                        }}
                        className="mt-3 px-4 py-2 rounded-lg bg-black text-white font-semibold hover:bg-gray-900"
                      >
                        Invitar primer agente
                      </button>
                    </div>
                  ) : (
                    <div className="mt-5 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-gray-500 border-b">
                            <th className="py-2 pr-3">Nombre</th>
                            <th className="py-2 pr-3">Email</th>
                            <th className="py-2 pr-3">Rol</th>
                            <th className="py-2 pr-3">Estado</th>
                            <th className="py-2 pr-3">Último acceso</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.slice(0, 8).map((m: any) => (
                            <tr key={m.id} className="border-b last:border-b-0">
                              <td className="py-3 pr-3 font-semibold text-gray-900">{m.name ?? '—'}</td>
                              <td className="py-3 pr-3 text-gray-700">{m.email ?? '—'}</td>
                              <td className="py-3 pr-3 text-gray-700">{m.role}</td>
                              <td className="py-3 pr-3 text-gray-700">
                                {m.status === 'invited' ? 'Invitación pendiente' : m.status === 'suspended' ? 'Suspendido' : m.status}
                              </td>
                              <td className="py-3 pr-3 text-gray-700">{formatMaybeDate(m.last_seen_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Zona 4: capacidad y límites */}
                <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="text-sm font-semibold text-gray-900">Capacidad y lugares disponibles</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Separado por gobernanza (supervisores) vs operación (agentes).
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Supervisores</div>
                      <ProgressBar used={data.limits?.supervisors?.used ?? 0} limit={data.limits?.supervisors?.limit ?? null} />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Agentes</div>
                      <ProgressBar used={data.limits?.agents?.used ?? 0} limit={data.limits?.agents?.limit ?? null} />
                    </div>
                  </div>
                </div>

                {/* Mini actividad reciente */}
                <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="text-sm font-semibold text-gray-900">Actividad reciente</div>
                  <div className="text-xs text-gray-500 mt-1">Lo mínimo para dar confianza (sin log infinito).</div>
                  <div className="mt-4 space-y-2">
                    {activity.slice(0, 6).map((a: any, idx: number) => (
                      <div key={`${a.type}-${idx}`} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                        <div className="text-sm text-gray-900">{a.message}</div>
                        <div className="text-xs text-gray-500 whitespace-nowrap">{formatMaybeDate(a.at)}</div>
                      </div>
                    ))}
                    {activity.length === 0 && (
                      <div className="text-sm text-gray-600">Todavía no hay actividad registrada.</div>
                    )}
                  </div>
                </div>

                {/* Zona 5: plan/billing abajo */}
                <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="text-sm font-semibold text-gray-900">Plan (abajo a propósito)</div>
                  <div className="text-sm text-gray-700 mt-2">
                    Esto no es lo primero que mirás, pero no lo escondemos.
                  </div>
                  {trialEndsAt && (
                    <div className="mt-3 text-sm text-gray-700">
                      Trial vence: <span className="font-semibold">{formatMaybeDate(trialEndsAt)}</span>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => setNav('billing')}
                      className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Ver plan y facturación
                    </button>
                    {isEnterprise && (
                      <div className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-500 bg-gray-50">
                        Enterprise: permisos / grupos (pronto)
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {data && nav === 'team' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Equipo</div>
                    <div className="text-xs text-gray-500 mt-1">Gestioná accesos y estado operativo del equipo.</div>
                    {actorRole && (
                      <div className="text-xs text-gray-500 mt-1">
                        Tu rol: <span className="font-semibold text-gray-900">{actorRole}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setInviteOpen(true)}
                    className="px-4 py-2 rounded-lg bg-black text-white font-semibold hover:bg-gray-900"
                  >
                    Enviar invitación
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Buscar por email o nombre…"
                  />
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="all">Todos los roles</option>
                    <option value="owner_supervisor">Owner supervisor</option>
                    <option value="supervisor_admin">Supervisor admin</option>
                    <option value="agent">Agente</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="active">Activo</option>
                    <option value="invited">Invitación pendiente</option>
                    <option value="suspended">Suspendido</option>
                  </select>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b">
                        <th className="py-2 pr-3">Nombre</th>
                        <th className="py-2 pr-3">Email</th>
                        <th className="py-2 pr-3">Rol</th>
                        <th className="py-2 pr-3">Estado</th>
                        <th className="py-2 pr-3">Último acceso</th>
                        <th className="py-2 pr-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((m: any) => (
                        <tr key={m.id} className="border-b last:border-b-0">
                          <td className="py-3 pr-3 font-semibold text-gray-900">{m.name ?? '—'}</td>
                          <td className="py-3 pr-3 text-gray-700">{m.email ?? '—'}</td>
                          <td className="py-3 pr-3 text-gray-700">{m.role}</td>
                          <td className="py-3 pr-3 text-gray-700">
                            {m.status === 'invited' ? 'Invitación pendiente' : m.status === 'suspended' ? 'Suspendido' : m.status}
                          </td>
                          <td className="py-3 pr-3 text-gray-700">{formatMaybeDate(m.last_seen_at)}</td>
                          <td className="py-3 pr-3">
                            <div className="flex flex-wrap gap-2">
                              {m.status === 'invited' && (
                                <button
                                  onClick={() => memberAction(m.id, 'resend_invite')}
                                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold hover:bg-gray-50"
                                >
                                  Reenviar invitación
                                </button>
                              )}
                              {m.status === 'invited' && (
                                <button
                                  onClick={() => memberAction(m.id, 'remove_invite')}
                                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold hover:bg-gray-50"
                                >
                                  Eliminar invitación
                                </button>
                              )}
                              {m.status === 'active' && (
                                <button
                                  onClick={() => memberAction(m.id, 'suspend')}
                                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold hover:bg-gray-50"
                                >
                                  Suspender
                                </button>
                              )}
                              {m.status === 'suspended' && (
                                <button
                                  onClick={() => memberAction(m.id, 'activate')}
                                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold hover:bg-gray-50"
                                >
                                  Activar
                                </button>
                              )}
                              <select
                                value={m.role}
                                onChange={(e) => memberAction(m.id, 'change_role', { role: e.target.value })}
                                className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold bg-white"
                              >
                                <option value="agent">Agente</option>
                                <option value="supervisor_admin">Supervisor admin</option>
                                <option value="owner_supervisor" disabled>Owner supervisor</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredMembers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-6 text-sm text-gray-600">
                            No hay resultados para los filtros actuales.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {inviteOpen && (
                  <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-lg w-full max-w-md p-5">
                      <div className="text-sm font-semibold text-gray-900">Invitar usuario</div>
                      <div className="text-xs text-gray-500 mt-1">Esto envía un email con un link para aceptar. No “crea” el usuario.</div>

                      <div className="mt-4 space-y-3">
                        <input
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          type="email"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          placeholder="email@empresa.com"
                        />
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                          <option value="agent">Agente</option>
                          <option value="supervisor_admin">Supervisor admin</option>
                        </select>
                      </div>

                      <div className="mt-5 flex items-center justify-end gap-2">
                        <button
                          onClick={() => setInviteOpen(false)}
                          className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={invite}
                          disabled={inviteBusy || !inviteEmail}
                          className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-900 disabled:opacity-60"
                        >
                          {inviteBusy ? 'Enviando invitación…' : 'Enviar invitación'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {data && nav === 'limits' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="text-sm font-semibold text-gray-900">Uso y límites</div>
                <div className="text-xs text-gray-500 mt-1">Indicadores concretos (sin gráficos de humo).</div>
                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Supervisores</div>
                    <ProgressBar used={data.limits?.supervisors?.used ?? 0} limit={data.limits?.supervisors?.limit ?? null} />
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Agentes</div>
                    <ProgressBar used={data.limits?.agents?.used ?? 0} limit={data.limits?.agents?.limit ?? null} />
                  </div>
                </div>
                <div className="mt-6 text-sm text-gray-700">
                  Próximo: agregar “Operaciones este mes” y “Firmantes invitados” (cuando lo conectemos a workspace de forma completa).
                </div>
              </div>
            )}

            {data && (nav === 'billing' || nav === 'settings') && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="text-sm font-semibold text-gray-900">
                  {nav === 'billing' ? 'Plan y facturación' : 'Configuración'}
                </div>
                <div className="text-sm text-gray-700 mt-2">
                  Esto queda abajo a propósito. El foco del supervisor es operativo.
                </div>
                {data.plan?.trial_ends_at && (
                  <div className="mt-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
                    <div className="text-sm font-semibold text-gray-900">Trial</div>
                    <div className="text-sm text-gray-700 mt-1">Vence: {formatMaybeDate(data.plan.trial_ends_at)}</div>
                    <div className="text-xs text-gray-500 mt-2">
                      Al terminar el trial, el plan transiciona según la oferta configurada.
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
      <FooterInternal />
    </div>
  );
}
