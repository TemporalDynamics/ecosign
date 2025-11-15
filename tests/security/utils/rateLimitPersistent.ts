// netlify/functions/utils/rateLimitPersistent.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RateLimitOptions {
  maxRequests: number;
  windowMinutes: number;
  blockMinutes?: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: Date;
}

export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - options.windowMinutes * 60 * 1000);

  const key = `${identifier}:${endpoint}`;

  // Check for existing block
  if (options.blockMinutes) {
    const { data: block, error: blockError } = await supabase
      .from('rate_limit_blocks')
      .select('blocked_until')
      .eq('key', key)
      .single();

    if (block && new Date(block.blocked_until) > now) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(block.blocked_until),
      };
    }
  }

  // Get recent requests
  const { data: requests, error: selectError } = await supabase
    .from('rate_limits')
    .select('timestamp', { count: 'exact' })
    .eq('key', key)
    .gte('timestamp', windowStart.toISOString());

  if (selectError) {
    console.error('Error fetching rate limits:', selectError);
    // Fail open: allow request if DB fails
    return { allowed: true, remaining: options.maxRequests };
  }

  const requestCount = requests.length;

  if (requestCount >= options.maxRequests) {
    // Exceeded limit, create or update block if configured
    if (options.blockMinutes) {
      const blockedUntil = new Date(now.getTime() + options.blockMinutes * 60 * 1000);
      await supabase
        .from('rate_limit_blocks')
        .upsert({ key, blocked_until: blockedUntil.toISOString() }, { onConflict: 'key' });
      
      return { allowed: false, remaining: 0, resetAt: blockedUntil };
    }
    return { allowed: false, remaining: 0 };
  }

  // Record current request
  const { error: insertError } = await supabase
    .from('rate_limits')
    .insert({ key, timestamp: now.toISOString() });

  if (insertError) {
    console.error('Error inserting rate limit record:', insertError);
    // Fail open
  }

  return {
    allowed: true,
    remaining: options.maxRequests - requestCount - 1,
  };
}
