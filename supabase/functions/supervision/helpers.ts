// Shared helpers for supervision domain
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'

export async function resolveAuthUser(supabase: any, authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

export async function resolveSupervisorMembership(supabase: any, userId: string, workspaceId: string) {
  const { data } = await supabase
    .from('workspace_members')
    .select('role,status')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('role', ['owner_supervisor', 'supervisor_admin'])
    .maybeSingle()
  if (!data?.role) return null
  return String(data.role) as 'owner_supervisor' | 'supervisor_admin'
}

export async function resolveSupervisorWorkspace(supabase: any, userId: string, workspaceId?: string | null) {
  const base = supabase
    .from('workspace_members')
    .select('workspace_id,role,status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('role', ['owner_supervisor', 'supervisor_admin'])

  const query = workspaceId ? base.eq('workspace_id', workspaceId) : base
    .order('created_at', { ascending: true })
    .limit(1)

  const { data, error } = await query.maybeSingle()
  if (error || !data?.workspace_id) return null
  return { workspaceId: String(data.workspace_id), role: String(data.role) as 'owner_supervisor' | 'supervisor_admin' }
}

export async function recordMemberAccess(supabase: any, userId: string, workspaceId: string) {
  const nowIso = new Date().toISOString()
  await supabase
    .from('workspace_members')
    .update({ last_seen_at: nowIso, updated_at: nowIso })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .neq('status', 'removed')
}

export async function getMonthlyLimits(supabase: any, workspaceId: string, planId: string | null) {
  if (!planId) return { operations_monthly_limit: null, invitations_monthly_limit: null }

  const { data: plan, error: planErr } = await supabase
    .from('plans')
    .select('operations_monthly_limit,invitations_monthly_limit')
    .eq('id', planId)
    .maybeSingle()

  const { data: override, error: overrideErr } = await supabase
    .from('workspace_limits')
    .select('operations_monthly_limit,invitations_monthly_limit,source')
    .eq('workspace_id', workspaceId)
    .in('source', ['override', 'enterprise'])
    .limit(1)
    .maybeSingle()

  if (planErr || overrideErr) return { operations_monthly_limit: null, invitations_monthly_limit: null }

  const operations = (override?.operations_monthly_limit ?? plan?.operations_monthly_limit ?? null) as number | null
  const invitations = (override?.invitations_monthly_limit ?? plan?.invitations_monthly_limit ?? null) as number | null
  return { operations_monthly_limit: operations, invitations_monthly_limit: invitations }
}

export async function getPlanAndTrialInfo(supabase: any, workspaceId: string) {
  const { data: planRow } = await supabase
    .from('workspace_plan')
    .select('status,started_at,trial_ends_at,plan_id')
    .eq('workspace_id', workspaceId)
    .in('status', ['active', 'trialing'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: effectiveRows } = await supabase.rpc('compute_workspace_effective_limits_v2', { p_workspace_id: workspaceId })
  const effective = Array.isArray(effectiveRows) && effectiveRows.length > 0 ? effectiveRows[0] as any : null
  const monthly = await getMonthlyLimits(supabase, workspaceId, (planRow?.plan_id ?? effective?.plan_id ?? null) as string | null)

  return {
    plan_status: planRow?.status ?? null,
    trial_ends_at: planRow?.trial_ends_at ?? null,
    plan_started_at: planRow?.started_at ?? null,
    plan_key: effective?.plan_key ?? null,
    agent_seats_limit: effective?.agent_seats_limit ?? effective?.seats_limit ?? null,
    supervisor_seats_limit: effective?.supervisor_seats_limit ?? null,
    operations_monthly_limit: monthly.operations_monthly_limit,
    invitations_monthly_limit: monthly.invitations_monthly_limit,
  }
}

export async function listMembers(supabase: any, workspaceId: string) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('id,user_id,member_email,member_name,role,status,last_seen_at,invited_at,invited_by,created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`members_query_failed:${error.message}`)
  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    user_id: String(row.user_id),
    email: row.member_email ?? null,
    name: row.member_name ?? null,
    role: String(row.role),
    status: String(row.status),
    last_seen_at: row.last_seen_at ?? null,
    invited_at: row.invited_at ?? null,
  }))
}

export async function listRecentDocuments(supabase: any, workspaceId: string) {
  const { data } = await supabase
    .from('document_entities')
    .select('id,workspace_id,owner_id,source_name,created_at,lifecycle_status')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(8)
  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    workspace_id: String(row.workspace_id),
    owner_id: String(row.owner_id),
    source_name: row.source_name,
    created_at: row.created_at,
    lifecycle_status: row.lifecycle_status,
  }))
}

export async function countActiveOperations(supabase: any, workspaceId: string) {
  const { count } = await supabase
    .from('signature_workflows')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .in('status', ['draft', 'active', 'paused'])
  return count ?? 0
}

export async function computeWorkspaceUsage(supabase: any, workspaceId: string, periodStartIso: string, periodEndIso: string) {
  const { data, error } = await supabase.rpc('compute_workspace_usage', {
    p_workspace_id: workspaceId,
    p_period_start: periodStartIso,
    p_period_end: periodEndIso,
  })
  if (error || !Array.isArray(data) || data.length === 0) {
    return { operations_active: 0, operations_created: 0, documents_created: 0, signer_invitations_sent: 0 }
  }
  const row = data[0] as any
  return {
    operations_active: Number(row.operations_active ?? 0),
    operations_created: Number(row.operations_created ?? 0),
    documents_created: Number(row.documents_created ?? 0),
    signer_invitations_sent: Number(row.signer_invitations_sent ?? 0),
  }
}

export async function getPlanEffectiveLimits(supabase: any, workspaceId: string) {
  const { data } = await supabase.rpc('compute_workspace_effective_limits_v2', { p_workspace_id: workspaceId })
  const row = Array.isArray(data) && data.length > 0 ? data[0] as any : null
  return {
    agent_seats_limit: row?.agent_seats_limit ?? row?.seats_limit ?? null,
    supervisor_seats_limit: row?.supervisor_seats_limit ?? null,
  }
}

export async function countReserved(supabase: any, workspaceId: string) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('role,status')
    .eq('workspace_id', workspaceId)
    .in('status', ['active', 'invited'])
  if (error) throw new Error(`members_query_failed:${error.message}`)
  let agents = 0
  let supervisors = 0
  for (const row of data ?? []) {
    const role = String((row as any).role)
    if (role === 'agent') agents += 1
    if (role === 'owner_supervisor' || role === 'supervisor_admin') supervisors += 1
  }
  return { agents, supervisors }
}

export async function generateInviteLink(supabase: any, email: string, redirectTo: string) {
  const admin = supabase.auth.admin as any
  const { data, error } = await admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo },
  })
  if (error) throw new Error(`failed_generate_invite_link:${error.message}`)
  const actionLink = data?.properties?.action_link ?? data?.action_link ?? null
  const userId = data?.user?.id ?? data?.user_id ?? null
  if (!actionLink) throw new Error('missing_action_link')
  if (!userId) throw new Error('missing_user_id')
  return { actionLink: String(actionLink), userId: String(userId) }
}

export function randomWrapSaltHex(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function ensureProfileActiveWorkspace(supabase: any, userId: string, workspaceId: string) {
  const wrapSalt = randomWrapSaltHex()
  const { error } = await supabase
    .from('profiles')
    .upsert({
      user_id: userId,
      wrap_salt: wrapSalt,
      active_workspace_id: workspaceId,
    }, { onConflict: 'user_id' })
  if (error) {
    console.warn('ensureProfileActiveWorkspace failed', { userId, message: error.message })
  }
}

export function asIso(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null
  const t = Date.parse(value)
  if (Number.isNaN(t)) return null
  return new Date(t).toISOString()
}

export type ActivityItem = {
  type: string
  message: string
  at: string
}

export function sortByAtDesc(items: ActivityItem[]) {
  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}
