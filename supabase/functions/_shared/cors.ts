const DEFAULT_HEADERS =
  'authorization, x-client-info, apikey, content-type';
const DEFAULT_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return value ? value.trim() : null;
  }
}

function getAllowedOrigins(): string[] {
  const raw =
    Deno.env.get('ALLOWED_ORIGINS') ||
    Deno.env.get('ALLOWED_ORIGIN') ||
    '';

  const values = raw
    .split(',')
    .map((entry) => normalizeOrigin(entry))
    .filter((entry): entry is string => Boolean(entry));

  const fallback = [];
  if (values.length === 0) {
    const siteUrl = normalizeOrigin(Deno.env.get('SITE_URL') || '');
    const frontendUrl = normalizeOrigin(Deno.env.get('FRONTEND_URL') || '');
    if (siteUrl) fallback.push(siteUrl);
    if (frontendUrl) fallback.push(frontendUrl);
  }

  return Array.from(new Set([...values, ...fallback]));
}

export function getCorsHeaders(origin?: string) {
  const allowedOrigins = getAllowedOrigins();
  const normalizedOrigin = origin ? normalizeOrigin(origin) : null;
  const isNullOrigin = normalizedOrigin === 'null';
  const isAllowed =
    !normalizedOrigin ||
    isNullOrigin ||
    allowedOrigins.includes(normalizedOrigin);

  // In some contexts (file://, sandboxed iframes, opaque origins), browsers use Origin: null.
  // Using '*' here avoids brittle mismatches while still requiring auth for protected endpoints.
  const allowOrigin =
    !normalizedOrigin || isNullOrigin
      ? '*'
      : (isAllowed ? normalizedOrigin : 'null');

  return {
    isAllowed,
    headers: {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Headers': DEFAULT_HEADERS,
      'Access-Control-Allow-Methods': DEFAULT_METHODS,
      'Vary': 'Origin',
    } as Record<string, string>,
  };
}
