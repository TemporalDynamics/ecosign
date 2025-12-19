/**
 * Rate Limiting Helper using Upstash Redis
 * 
 * This module provides rate limiting functionality for Supabase Edge Functions
 * using Upstash Redis with sliding window algorithm.
 */

import { Ratelimit } from 'https://esm.sh/@upstash/ratelimit@1.0.0';
import { Redis } from 'https://esm.sh/@upstash/redis@1.28.0';

/**
 * Rate limit configuration per endpoint type
 */
const RATE_LIMITS = {
  verify: 20,      // 20 requests per minute for verification
  generate: 10,    // 10 requests per minute for link generation
  invite: 5,       // 5 requests per minute for invitations
  accept: 10,      // 10 requests per minute for NDA acceptance
  workflow: 5,     // 5 requests per minute for workflow operations
  default: 30,     // 30 requests per minute for other operations
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

/**
 * Initialize Redis client (lazy initialization)
 */
let redis: Redis | null = null;

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
  try {
    const redis = getRedis();
    const limit = RATE_LIMITS[type];

    // Create rate limiter with sliding window
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, '1 m'),
      analytics: true,
    });

    // Get identifier (IP address or fallback to anonymous)
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               'anonymous';

    // Check rate limit
    const result = await ratelimit.limit(ip);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // If rate limiting fails, allow the request (fail open)
    console.error('Rate limiting error:', error);
    return {
      success: true,
      limit: RATE_LIMITS[type],
      remaining: RATE_LIMITS[type],
      reset: Date.now() + 60000,
    };
  }
}

/**
 * Create a rate limit response (429 Too Many Requests)
 */
export function rateLimitResponse(
  limit: number,
  remaining: number,
  reset: number
): Response {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
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
    // Check rate limit
    const { success, limit, remaining, reset } = await checkRateLimit(req, type);

    // If rate limit exceeded, return 429
    if (!success) {
      return rateLimitResponse(limit, remaining, reset);
    }

    // Execute the original handler
    const response = await handler(req);

    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', reset.toString());

    return response;
  };
}
