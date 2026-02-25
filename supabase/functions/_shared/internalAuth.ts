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
