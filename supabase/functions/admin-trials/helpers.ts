// Shared helpers for admin-trials domain
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'

export function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

export function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

export function toPositiveInt(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  const i = Math.floor(n)
  return i > 0 ? i : fallback
}

export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

export function addMonthsUtc(now: Date, months: number): Date {
  const d = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds(),
  ))
  d.setUTCMonth(d.getUTCMonth() + months)
  return d
}

export function parseAdminEmailsEnv(): string[] {
  const raw = (Deno.env.get('ADMIN_EMAILS') ?? '').trim()
  if (!raw) return []
  return raw.split(',').map((v) => normalizeEmail(v)).filter(Boolean)
}

export async function resolveAuthUser(supabase: any, authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

export async function requireAdminOrInternal(req: Request, functionName: string): Promise<
  | { ok: true; mode: 'internal' | 'cron' }
  | { ok: true; mode: 'admin_user'; userId: string; userEmail: string }
  | { ok: false; reason: string; status: number }
> {
  // Try internal auth first (service_role or cron secret)
  const internal = await import('../_shared/internalAuth.ts').then(m => m.requireInternalAuthLogged(req, functionName, {
    allowServiceRole: true,
    allowCronSecret: true,
  }))
  
  if (internal.ok) {
    return { ok: true, mode: internal.authType === 'cron' ? 'cron' : 'internal' }
  }

  // Fall back to admin user auth
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  if (!supabaseUrl || !anonKey) {
    return { ok: false, reason: 'missing_supabase_env', status: 500 }
  }

  const adminEmails = parseAdminEmailsEnv()
  if (adminEmails.length === 0) {
    return { ok: false, reason: 'admin_emails_not_configured', status: 403 }
  }

  const token = req.headers.get('authorization') ?? ''
  if (!token) {
    return { ok: false, reason: 'missing_authorization', status: 401 }
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: token } },
  })

  const { data, error } = await userClient.auth.getUser()
  if (error || !data?.user?.email || !data.user.id) {
    return { ok: false, reason: 'invalid_user_session', status: 401 }
  }

  const email = normalizeEmail(data.user.email)
  if (!adminEmails.includes(email)) {
    return { ok: false, reason: 'not_admin', status: 403 }
  }

  return { ok: true, mode: 'admin_user', userId: String(data.user.id), userEmail: email }
}

export async function getPlanIdByKey(supabase: any, planKey: string): Promise<string> {
  const { data, error } = await supabase
    .from('plans')
    .select('id')
    .eq('key', planKey)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !data?.id) {
    throw new Error(`plan_not_found:${planKey}`)
  }
  return data.id
}

export async function ensureWorkspaceForOwner(supabase: any, ownerId: string): Promise<{ id: string; created: boolean }> {
  const { data: existing, error } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`failed_to_read_workspaces:${error.message}`)
  if (existing?.id) return { id: existing.id, created: false }

  const { data: inserted, error: insertErr } = await supabase
    .from('workspaces')
    .insert({ name: 'Personal Workspace', owner_id: ownerId })
    .select('id')
    .maybeSingle()

  if (insertErr || !inserted?.id) {
    throw new Error(`failed_to_create_workspace:${insertErr?.message ?? 'unknown'}`)
  }

  return { id: inserted.id, created: true }
}

export async function getUserIdByEmailBestEffort(supabase: any, email: string): Promise<string | null> {
  const normalized = normalizeEmail(email)
  if (!normalized) return null

  const perPage = 200
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`failed_to_list_users:${error.message}`)
    const users: Array<any> = Array.isArray(data?.users) ? data.users : []
    const match = users.find((u) => normalizeEmail(u?.email) === normalized)
    if (match?.id) return String(match.id)
    if (users.length < perPage) break
  }
  return null
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

export async function updateUserMetadataPlan(supabase: any, userId: string, patch: Record<string, unknown>) {
  const { data: userRes, error: getErr } = await supabase.auth.admin.getUserById(userId)
  if (getErr || !userRes?.user) {
    throw new Error(`failed_to_fetch_user:${getErr?.message ?? 'unknown'}`)
  }
  const existing = (userRes.user.user_metadata && typeof userRes.user.user_metadata === 'object')
    ? userRes.user.user_metadata
    : {}

  const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { ...existing, ...patch },
  })
  if (updateErr) {
    throw new Error(`failed_to_update_user_metadata:${updateErr.message}`)
  }
}

export async function updateUserMetadataWorkspace(supabase: any, userId: string, workspaceId: string) {
  const { data: userRes, error: getErr } = await supabase.auth.admin.getUserById(userId)
  if (getErr || !userRes?.user) return
  const existing = (userRes.user.user_metadata && typeof userRes.user.user_metadata === 'object')
    ? userRes.user.user_metadata
    : {}
  await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { ...existing, workspace_id: workspaceId },
  })
}

export async function getActiveOfferForWorkspace(supabase: any, workspaceId: string) {
  const { data, error } = await supabase
    .from('workspace_trial_offers')
    .select('id,next_plan_key,discount_percent,discount_months')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data ?? null
}

export async function getPlanEffectiveLimits(supabase: any, workspaceId: string) {
  const { data, error } = await supabase.rpc('compute_workspace_effective_limits_v2', {
    p_workspace_id: workspaceId,
  })
  if (error || !Array.isArray(data) || data.length === 0) {
    return { agent_seats_limit: null, supervisor_seats_limit: null }
  }
  const row = data[0] as any
  return {
    agent_seats_limit: row.agent_seats_limit ?? row.seats_limit ?? null,
    supervisor_seats_limit: row.supervisor_seats_limit ?? null,
  }
}

export async function countActiveMembers(supabase: any, workspaceId: string) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('role,status')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
  if (error) throw new Error(`failed_list_members:${error.message}`)

  let supervisors = 0
  let agents = 0
  for (const row of data ?? []) {
    const role = String((row as any).role)
    if (role === 'agent') agents += 1
    if (role === 'owner_supervisor' || role === 'supervisor_admin') supervisors += 1
  }
  return { supervisors, agents }
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
