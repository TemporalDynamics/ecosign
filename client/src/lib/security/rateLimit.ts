interface RateLimitConfig {
  maxRequests: number;
  windowMinutes: number;
  blockMinutes?: number;
}

interface RateRecord {
  count: number;
  windowStart: number;
  blockedUntil?: number;
}

const store = new Map<string, RateRecord>();

function getKey(identifier: string, endpoint: string): string {
  return `${identifier}:${endpoint}`;
}

export function resetRateLimits() {
  store.clear();
}

export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining?: number; resetAt?: number }> {
  const key = getKey(identifier, endpoint);
  const now = Date.now();
  const windowMs = config.windowMinutes * 60 * 1000;
  const record = store.get(key) || { count: 0, windowStart: now };

  if (record.blockedUntil && record.blockedUntil > now) {
    return { allowed: false, resetAt: record.blockedUntil };
  }

  if (now - record.windowStart >= windowMs) {
    record.count = 0;
    record.windowStart = now;
    record.blockedUntil = undefined;
  }

  if (record.count >= config.maxRequests) {
    if (config.blockMinutes) {
      record.blockedUntil = now + config.blockMinutes * 60 * 1000;
      store.set(key, record);
      return { allowed: false, resetAt: record.blockedUntil };
    }
    return { allowed: false };
  }

  record.count += 1;
  store.set(key, record);
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetAt: record.windowStart + windowMs
  };
}
