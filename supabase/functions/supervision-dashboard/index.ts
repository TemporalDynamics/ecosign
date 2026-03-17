import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { getCorsHeaders } from '../_shared/cors.ts'

const jsonResponse = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })

async function resolveAuthUser(supabase: any, authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

async function resolveSupervisorWorkspace(supabase: any, userId: string, workspaceId?: string | null) {
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

async function getMonthlyLimits(supabase: any, workspaceId: string, planId: string | null) {
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

  // If columns don't exist yet (partial deploy), fail closed with nulls.
  if (planErr || overrideErr) return { operations_monthly_limit: null, invitations_monthly_limit: null }

  const operations = (override?.operations_monthly_limit ?? plan?.operations_monthly_limit ?? null) as number | null
  const invitations = (override?.invitations_monthly_limit ?? plan?.invitations_monthly_limit ?? null) as number | null
  return { operations_monthly_limit: operations, invitations_monthly_limit: invitations }
}

async function getPlanAndTrialInfo(supabase: any, workspaceId: string) {
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

async function listMembers(supabase: any, workspaceId: string) {
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

async function listRecentDocuments(supabase: any, workspaceId: string) {
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

type ActivityItem = {
  type: string
  message: string
  at: string
}

function asIso(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null
  const t = Date.parse(value)
  if (Number.isNaN(t)) return null
  return new Date(t).toISOString()
}

function sortByAtDesc(items: ActivityItem[]) {
  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}

async function countActiveOperations(supabase: any, workspaceId: string) {
  const { count } = await supabase
    .from('signature_workflows')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .in('status', ['draft', 'active', 'paused'])
  return count ?? 0
}

async function computeWorkspaceUsage(supabase: any, workspaceId: string, periodStartIso: string, periodEndIso: string) {
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

serve(async (req) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined)

  if (req.method === 'OPTIONS') {
    if (!isAllowed) return new Response('Forbidden', { status: 403, headers: corsHeaders })
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  if (!isAllowed) return jsonResponse({ ok: false, error: 'origin_not_allowed' }, 403, corsHeaders)
  if (req.method !== 'GET' && req.method !== 'POST') return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405, corsHeaders)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ ok: false, error: 'missing_supabase_env' }, 500, corsHeaders)

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const authUser = await resolveAuthUser(supabase, req.headers.get('Authorization'))
    if (!authUser?.id) return jsonResponse({ ok: false, error: 'unauthorized' }, 401, corsHeaders)

    let workspaceIdFromBody: string | null = null
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      workspaceIdFromBody = typeof body?.workspace_id === 'string' ? body.workspace_id : null
    }

    const membership = await resolveSupervisorWorkspace(supabase, authUser.id, workspaceIdFromBody)
    if (!membership) return jsonResponse({ ok: false, error: 'not_supervisor' }, 403, corsHeaders)

    const { data: ws } = await supabase
      .from('workspaces')
      .select('id,name,created_at,owner_id')
      .eq('id', membership.workspaceId)
      .maybeSingle()
    if (!ws?.id) return jsonResponse({ ok: false, error: 'workspace_not_found' }, 404, corsHeaders)

    const plan = await getPlanAndTrialInfo(supabase, membership.workspaceId)
    const members = await listMembers(supabase, membership.workspaceId) as Array<{
      id: string
      user_id: string
      email: string | null
      name: string | null
      role: string
      status: string
      last_seen_at: string | null
      invited_at: string | null
    }>

    // Seat reservation policy (frozen for now):
    // active + invited + suspended consume a place; removed does not.
    const reservedAgents = members.filter((m) =>
      m.role === 'agent' && (m.status === 'active' || m.status === 'invited' || m.status === 'suspended')
    ).length
    const reservedSupervisors = members.filter((m) =>
      (m.role === 'owner_supervisor' || m.role === 'supervisor_admin')
      && (m.status === 'active' || m.status === 'invited' || m.status === 'suspended')
    ).length

    const activeUsers = members.filter((m) => m.status === 'active').length
    const pendingInvites = members.filter((m) => m.status === 'invited').length

    const ownerIds: string[] = Array.from(new Set(members.map((m) => m.user_id)))

    // Workspace truth
    const operationsActive = await countActiveOperations(supabase, membership.workspaceId)
    const recentDocuments = await listRecentDocuments(supabase, membership.workspaceId)

    const now = new Date()
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)).toISOString()
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0)).toISOString()
    const usage = await computeWorkspaceUsage(supabase, membership.workspaceId, periodStart, periodEnd)
    usage.operations_active = operationsActive

    const nextCycle = plan.plan_status === 'trialing' ? plan.trial_ends_at : null

    const activity: ActivityItem[] = []
    if (plan.plan_status === 'trialing' && plan.plan_started_at) {
      const at = asIso(plan.plan_started_at)
      if (at) activity.push({ type: 'trial_started', message: 'Trial activado', at })
    }

    for (const m of members) {
      const invitedAt = asIso(m.invited_at)
      if (m.status === 'invited' && invitedAt) {
        activity.push({
          type: 'invite_sent',
          message: `Invitación enviada a ${m.email ?? 'un usuario'}`,
          at: invitedAt,
        })
      }
      const lastSeenAt = asIso(m.last_seen_at)
      if (m.status === 'active' && lastSeenAt) {
        activity.push({
          type: 'member_seen',
          message: `Acceso reciente: ${m.email ?? 'un usuario'}`,
          at: lastSeenAt,
        })
      }
    }

    for (const d of recentDocuments.slice(0, 5)) {
      const at = asIso(d.created_at)
      if (at) {
        activity.push({
          type: 'document_created',
          message: `Documento reciente: ${d.source_name}`,
          at,
        })
      }
    }

    const activityTop = sortByAtDesc(activity).slice(0, 8)

    return jsonResponse({
      ok: true,
      actor: {
        user_id: String(authUser.id),
        role: membership.role,
      },
      workspace: {
        id: String(ws.id),
        name: String(ws.name),
        owner_id: String(ws.owner_id),
        created_at: ws.created_at ?? null,
      },
      plan,
      usage: {
        period_start: periodStart,
        period_end: periodEnd,
        operations_active: usage.operations_active,
        operations_created: usage.operations_created,
        documents_created: usage.documents_created,
        signer_invitations_sent: usage.signer_invitations_sent,
      },
      summary: {
        active_users: activeUsers,
        pending_invites: pendingInvites,
        operations_active: usage.operations_active,
        documents_recent: recentDocuments.length,
        next_cycle_at: nextCycle,
      },
      limits: {
        supervisors: { used: reservedSupervisors, limit: plan.supervisor_seats_limit },
        agents: { used: reservedAgents, limit: plan.agent_seats_limit },
      },
      members,
      recent_documents: recentDocuments,
      activity: activityTop,
    }, 200, corsHeaders)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ ok: false, error: 'internal_error', message }, 500, corsHeaders)
  }
})
