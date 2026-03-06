import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'

type InternalAuthMethod = 'service_role' | 'cron_secret';

export type InternalAuthResult =
  | { ok: true; method: InternalAuthMethod }
  | { ok: false; reason: string };

export type InternalAuthOptions = {
  allowServiceRole?: boolean;
  allowCronSecret?: boolean;
  serviceRoleEnvVar?: string;
  cronSecretEnvVar?: string;
  cronSecretHeaderNames?: string[];
};

const DEFAULT_CRON_SECRET_HEADERS = ['x-cron-secret', 'x-internal-secret'];

function normalize(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readBearerToken(req: Request): string {
  const authHeader = normalize(req.headers.get('authorization'));
  if (!authHeader) return '';
  const match = authHeader.match(/^bearer\s+(.+)$/i);
  return match ? normalize(match[1]) : '';
}

function hasHeaderMatch(req: Request, headerName: string, expected: string): boolean {
  if (!expected) return false;
  const received = normalize(req.headers.get(headerName));
  return received !== '' && received === expected;
}

export function requireInternalAuth(
  req: Request,
  options: InternalAuthOptions = {},
): InternalAuthResult {
  const allowServiceRole = options.allowServiceRole ?? true;
  const allowCronSecret = options.allowCronSecret ?? false;
  const serviceRoleEnvVar = options.serviceRoleEnvVar ?? 'SUPABASE_SERVICE_ROLE_KEY';
  const cronSecretEnvVar = options.cronSecretEnvVar ?? 'CRON_SECRET';
  const cronSecretHeaderNames = options.cronSecretHeaderNames ?? DEFAULT_CRON_SECRET_HEADERS;

  if (allowServiceRole) {
    const expectedServiceRole = normalize(Deno.env.get(serviceRoleEnvVar));
    if (expectedServiceRole) {
      const bearerToken = readBearerToken(req);
      const apikeyToken = normalize(req.headers.get('apikey'));
      if (bearerToken === expectedServiceRole || apikeyToken === expectedServiceRole) {
        return { ok: true, method: 'service_role' };
      }
    }
  }

  if (allowCronSecret) {
    const expectedCronSecret = normalize(Deno.env.get(cronSecretEnvVar));
    if (expectedCronSecret) {
      for (const headerName of cronSecretHeaderNames) {
        if (hasHeaderMatch(req, headerName, expectedCronSecret)) {
          return { ok: true, method: 'cron_secret' };
        }
      }
    }
  }

  return { ok: false, reason: 'missing_or_invalid_internal_auth' };
}

type InternalAuthViolationInput = {
  req: Request
  source: string
  reason: string
}

async function logInternalAuthViolationBestEffort(input: InternalAuthViolationInput): Promise<void> {
  try {
    const supabaseUrl = normalize(Deno.env.get('SUPABASE_URL'))
    const serviceRoleKey = normalize(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
    if (!supabaseUrl || !serviceRoleKey) return

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    let requestPath: string | null = null
    try {
      requestPath = new URL(input.req.url).pathname
    } catch {
      requestPath = null
    }

    const details = {
      reason: input.reason,
      method: input.req.method,
      has_authorization: normalize(input.req.headers.get('authorization')) !== '',
      has_apikey: normalize(input.req.headers.get('apikey')) !== '',
      has_cron_secret: DEFAULT_CRON_SECRET_HEADERS.some((h) => normalize(input.req.headers.get(h)) !== ''),
      user_agent_present: normalize(input.req.headers.get('user-agent')) !== '',
    }

    const { error } = await supabase.rpc('log_invariant_violation', {
      p_code: 'internal.auth.out_of_channel',
      p_severity: 'warning',
      p_source: input.source,
      p_message: 'Internal endpoint called without valid internal auth',
      p_details: details,
      p_request_path: requestPath,
      p_role_name: null,
      p_entity_id: null,
      p_correlation_id: null,
      p_dedupe_window_seconds: 900,
    })

    if (error) {
      console.warn('internalAuth violation logger failed', {
        source: input.source,
        reason: input.reason,
        message: error.message,
      })
    }
  } catch (error) {
    console.warn('internalAuth violation logger crashed', {
      source: input.source,
      reason: input.reason,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export async function requireInternalAuthLogged(
  req: Request,
  source: string,
  options: InternalAuthOptions = {},
): Promise<InternalAuthResult> {
  const result = requireInternalAuth(req, options)
  if (!result.ok) {
    await logInternalAuthViolationBestEffort({
      req,
      source,
      reason: result.reason,
    })
  }
  return result
}
