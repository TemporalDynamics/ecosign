/**
 * Rate Limiting Helper using Upstash Redis
 *
 * This module provides rate limiting functionality for Supabase Edge Functions
 * using Upstash Redis with sliding window algorithm.
 */

import { Ratelimit } from 'https://esm.sh/@upstash/ratelimit@1.0.0';
import { Redis } from 'https://esm.sh/@upstash/redis@1.28.0';
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { getCorsHeaders } from './cors.ts';

/**
 * Rate limit configuration per endpoint type
 */
const RATE_LIMITS = {
  verify: 20,      // 20 requests per minute for verification
  generate: 10,    // 10 requests per minute for link generation
  invite: 5,       // 5 requests per minute for invitations
  accept: 10,      // 10 requests per minute for NDA acceptance
  workflow: 5,     // 5 requests per minute for workflow operations
  record: 20,      // 20 requests per minute for event recording
  default: 30,     // 30 requests per minute for other operations
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;
export type RateLimitIdentityKind = 'workspace' | 'user' | 'ip';
export type RateLimitIdentity = { kind: RateLimitIdentityKind; key: string };
type UserLike = {
  id?: string;
  app_metadata?: Record<string, unknown>;
};

/**
 * Initialize Redis client (lazy initialization)
 */
let redis: Redis | null = null;
let redisWarningLogged = false;
const memoryBuckets = new Map<string, { count: number; reset: number }>();
let authClient: ReturnType<typeof createClient> | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

    if (!url || !token) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set');
    }

    redis = new Redis({ url, token });
  }
  return redis;
}

function getAuthClient(): ReturnType<typeof createClient> | null {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!authClient) {
    authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: { 'X-Client-Info': 'ecosign-ratelimit' },
      },
    });
  }
  return authClient;
}

function checkMemoryRateLimit(key: string, limit: number) {
  const now = Date.now();
  const windowMs = 60_000;
  const existing = memoryBuckets.get(key);
  const bucket = existing && existing.reset > now
    ? existing
    : { count: 0, reset: now + windowMs };

  bucket.count += 1;
  memoryBuckets.set(key, bucket);

  const remaining = Math.max(0, limit - bucket.count);
  return {
    success: bucket.count <= limit,
    limit,
    remaining,
    reset: bucket.reset,
  };
}

export function deriveRateLimitIdentity(input: {
  workspaceId?: string | null;
  userId?: string | null;
  ip?: string | null;
}): RateLimitIdentity {
  const workspaceId = typeof input.workspaceId === 'string' ? input.workspaceId.trim() : '';
  if (workspaceId) {
    return { kind: 'workspace', key: `workspace:${workspaceId}` };
  }
  const userId = typeof input.userId === 'string' ? input.userId.trim() : '';
  if (userId) {
    return { kind: 'user', key: `user:${userId}` };
  }
  const ip = typeof input.ip === 'string' && input.ip.trim().length > 0
    ? input.ip.trim()
    : 'anonymous';
  return { kind: 'ip', key: `ip:${ip}` };
}

async function resolveUserFromRequest(
  req: Request,
  resolveUser?: (token: string) => Promise<UserLike | null>
): Promise<UserLike | null> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  if (resolveUser) {
    return resolveUser(token);
  }

  const client = getAuthClient();
  if (!client) return null;

  const { data, error } = await client.auth.getUser(token);
  if (error) return null;
  return (data?.user as UserLike) ?? null;
}

export async function resolveRateLimitIdentity(
  req: Request,
  options?: { resolveUser?: (token: string) => Promise<UserLike | null> }
): Promise<RateLimitIdentity> {
  const ip = req.headers.get('x-forwarded-for') ||
    req.headers.get('x-real-ip') ||
    'anonymous';

  try {
    const user = await resolveUserFromRequest(req, options?.resolveUser);
    const workspaceId = typeof user?.app_metadata?.workspace_id === 'string'
      ? (user?.app_metadata?.workspace_id as string)
      : null;
    const userId = typeof user?.id === 'string' ? user?.id : null;

    return deriveRateLimitIdentity({ workspaceId, userId, ip });
  } catch (error) {
    console.warn('Rate limit identity resolution failed, fallback to IP', error);
    return deriveRateLimitIdentity({ ip });
  }
}

/**
 * Check if request is within rate limit
 * 
 * @param req - The incoming request
 * @param type - Type of rate limit to apply
 * @returns Promise<{success: boolean, limit: number, remaining: number, reset: number}>
 */
export async function checkRateLimit(
  req: Request,
  type: RateLimitType = 'default'
) {
  const limit = RATE_LIMITS[type] ?? RATE_LIMITS.default;
  const identity = await resolveRateLimitIdentity(req);
  const key = `${type}:${identity.key}`;

  try {
    const redis = getRedis();

    // Create rate limiter with sliding window
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, '1 m'),
      analytics: true,
    });

    // Check rate limit
    const result = await ratelimit.limit(key);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // Fail closed using memory fallback if Redis is unavailable.
    if (!redisWarningLogged) {
      console.warn('Rate limiting fallback to memory:', error);
      redisWarningLogged = true;
    }
    return checkMemoryRateLimit(key, limit);
  }
}

/**
 * Create a rate limit response (429 Too Many Requests)
 */
export function rateLimitResponse(
  limit: number,
  remaining: number,
  reset: number,
  corsHeaders: Record<string, string> = {}
): Response {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000);
  const safeLimit = Number.isFinite(limit) ? limit : RATE_LIMITS.default;
  const safeRemaining = Number.isFinite(remaining) ? remaining : 0;
  const safeReset = Number.isFinite(reset) ? reset : Date.now() + 60_000;

  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': safeLimit.toString(),
        'X-RateLimit-Remaining': safeRemaining.toString(),
        'X-RateLimit-Reset': safeReset.toString(),
        'Retry-After': retryAfter.toString(),
      },
    }
  );
}

/**
 * Middleware function to add rate limiting to any Edge Function
 * 
 * @example
 * ```typescript
 * import { withRateLimit } from '../_shared/ratelimit.ts';
 * 
 * Deno.serve(withRateLimit('verify', async (req) => {
 *   // Your function logic here
 *   return new Response('OK');
 * }));
 * ```
 */
export function withRateLimit(
  type: RateLimitType,
  handler: (req: Request) => Promise<Response> | Response
) {
  return async (req: Request): Promise<Response> => {
    // Get CORS headers early for error responses
    const { headers: corsHeaders } = getCorsHeaders(req.headers.get('origin') ?? undefined);

    // OPTIONS requests bypass rate limiting (CORS preflight)
    if (req.method === 'OPTIONS') {
      return handler(req);
    }

    try {
      // Check rate limit
      const { success, limit, remaining, reset } = await checkRateLimit(req, type);

      // If rate limit exceeded, return 429 with CORS headers
      if (!success) {
        return rateLimitResponse(limit, remaining, reset, corsHeaders);
      }

      // Execute the original handler
      const response = await handler(req);

      // Add rate limit headers to successful responses
      response.headers.set('X-RateLimit-Limit', limit.toString());
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      response.headers.set('X-RateLimit-Reset', reset.toString());

      return response;
    } catch (error) {
      // If any error occurs in rate limiting, return 500 with CORS headers
      console.error('Error in rate limit middleware:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  };
}
