// Handler: get_dashboard
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import {
  resolveAuthUser,
  resolveSupervisorWorkspace,
  recordMemberAccess,
  getPlanAndTrialInfo,
  listMembers,
  listRecentDocuments,
  countActiveOperations,
  computeWorkspaceUsage,
  asIso,
  sortByAtDesc,
  ActivityItem,
} from '../helpers.ts'

export async function handleGetDashboard(req: Request, corsHeaders: Record<string, string>) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const authUser = await resolveAuthUser(supabase, req.headers.get('Authorization'))
  if (!authUser?.id) {
    return { ok: false, error: 'unauthorized', status: 401 }
  }

  let workspaceIdFromBody: string | null = null
  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}))
    workspaceIdFromBody = typeof body?.workspace_id === 'string' ? body.workspace_id : null
  }

  const membership = await resolveSupervisorWorkspace(supabase, authUser.id, workspaceIdFromBody)
  if (!membership) {
    return { ok: false, error: 'not_supervisor', status: 403 }
  }

  const { data: ws } = await supabase
    .from('workspaces')
    .select('id,name,created_at,owner_id')
    .eq('id', membership.workspaceId)
    .maybeSingle()
  if (!ws?.id) {
    return { ok: false, error: 'workspace_not_found', status: 404 }
  }

  await recordMemberAccess(supabase, authUser.id, membership.workspaceId).catch(() => {})

  const plan = await getPlanAndTrialInfo(supabase, membership.workspaceId)
  const members = await listMembers(supabase, membership.workspaceId)

  const reservedAgents = members.filter((m) =>
    m.role === 'agent' && (m.status === 'active' || m.status === 'invited' || m.status === 'suspended')
  ).length
  const reservedSupervisors = members.filter((m) =>
    (m.role === 'owner_supervisor' || m.role === 'supervisor_admin')
    && (m.status === 'active' || m.status === 'invited' || m.status === 'suspended')
  ).length

  const activeUsers = members.filter((m) => m.status === 'active').length
  const pendingInvites = members.filter((m) => m.status === 'invited').length

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

  return {
    ok: true,
    status: 200,
    data: {
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
    },
  }
}
