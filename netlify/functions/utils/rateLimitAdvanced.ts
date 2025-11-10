/**
 * Advanced Rate Limiting con Sliding Window
 *
 * Mejoras sobre rate limiting básico:
 * - Sliding window (más preciso que fixed window)
 * - Rate limit por IP + por usuario autenticado
 * - Blacklist temporal automática
 * - Métricas para monitoring
 */

interface RequestTimestamp {
  timestamp: number;
  userId?: string;
}

interface RateLimitMetrics {
  totalRequests: number;
  blockedRequests: number;
  uniqueIps: number;
  blacklistedIps: number;
}

// Store en memoria
const requestsByIp = new Map<string, RequestTimestamp[]>();
const requestsByUser = new Map<string, RequestTimestamp[]>();
const blacklist = new Map<string, number>(); // IP -> unblockAt timestamp
const metrics: RateLimitMetrics = {
  totalRequests: 0,
  blockedRequests: 0,
  uniqueIps: 0,
  blacklistedIps: 0
};

export interface AdvancedRateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blacklistThreshold?: number; // Bloquear IP después de N violaciones
  blacklistDuration?: number; // Duración del bloqueo (ms)
}

export interface AdvancedRateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining: number;
  isBlacklisted?: boolean;
  reason?: string;
}

/**
 * Verificar si IP está en blacklist
 */
function isBlacklisted(ip: string): boolean {
  const unblockAt = blacklist.get(ip);
  if (!unblockAt) return false;

  const now = Date.now();
  if (now > unblockAt) {
    // Expiró el bloqueo, remover de blacklist
    blacklist.delete(ip);
    metrics.blacklistedIps--;
    return false;
  }

  return true;
}

/**
 * Agregar IP a blacklist temporal
 */
function addToBlacklist(ip: string, durationMs: number): void {
  const unblockAt = Date.now() + durationMs;
  blacklist.set(ip, unblockAt);
  metrics.blacklistedIps++;
  console.warn(`⚠️ IP ${ip} blacklisted until ${new Date(unblockAt).toISOString()}`);
}

/**
 * Limpiar timestamps antiguos (sliding window)
 */
function cleanupOldTimestamps(
  timestamps: RequestTimestamp[],
  windowMs: number
): RequestTimestamp[] {
  const cutoff = Date.now() - windowMs;
  return timestamps.filter(t => t.timestamp > cutoff);
}

/**
 * Rate limit avanzado con sliding window
 */
export function checkAdvancedRateLimit(
  ip: string,
  userId: string | null,
  config: AdvancedRateLimitConfig
): AdvancedRateLimitResult {
  metrics.totalRequests++;

  const {
    maxRequests,
    windowMs,
    blacklistThreshold = 5,
    blacklistDuration = 15 * 60 * 1000 // 15 minutos default
  } = config;

  // 1. Verificar blacklist
  if (isBlacklisted(ip)) {
    metrics.blockedRequests++;
    const unblockAt = blacklist.get(ip)!;
    const retryAfter = Math.ceil((unblockAt - Date.now()) / 1000);
    return {
      allowed: false,
      retryAfter,
      remaining: 0,
      isBlacklisted: true,
      reason: 'IP temporarily blocked due to rate limit violations'
    };
  }

  // 2. Rate limit por IP (más estricto)
  let ipTimestamps = requestsByIp.get(ip) || [];
  ipTimestamps = cleanupOldTimestamps(ipTimestamps, windowMs);

  if (ipTimestamps.length >= maxRequests) {
    metrics.blockedRequests++;

    // Si superó el threshold, agregar a blacklist
    if (ipTimestamps.length >= maxRequests + blacklistThreshold) {
      addToBlacklist(ip, blacklistDuration);
    }

    const oldestTimestamp = ipTimestamps[0].timestamp;
    const retryAfter = Math.ceil((oldestTimestamp + windowMs - Date.now()) / 1000);

    return {
      allowed: false,
      retryAfter,
      remaining: 0,
      reason: 'IP rate limit exceeded'
    };
  }

  // 3. Rate limit por usuario autenticado (si aplica)
  if (userId) {
    let userTimestamps = requestsByUser.get(userId) || [];
    userTimestamps = cleanupOldTimestamps(userTimestamps, windowMs);

    // Usuarios autenticados tienen límite más generoso (2x)
    const userMaxRequests = maxRequests * 2;

    if (userTimestamps.length >= userMaxRequests) {
      metrics.blockedRequests++;
      const oldestTimestamp = userTimestamps[0].timestamp;
      const retryAfter = Math.ceil((oldestTimestamp + windowMs - Date.now()) / 1000);

      return {
        allowed: false,
        retryAfter,
        remaining: 0,
        reason: 'User rate limit exceeded'
      };
    }

    // Agregar timestamp
    userTimestamps.push({ timestamp: Date.now(), userId });
    requestsByUser.set(userId, userTimestamps);
  }

  // 4. Permitir request
  ipTimestamps.push({ timestamp: Date.now(), userId: userId || undefined });
  requestsByIp.set(ip, ipTimestamps);

  // Actualizar métricas
  if (ipTimestamps.length === 1) {
    metrics.uniqueIps++;
  }

  const remaining = maxRequests - ipTimestamps.length;

  return {
    allowed: true,
    remaining,
    reason: 'OK'
  };
}

/**
 * Cleanup periódico
 */
export function cleanupExpiredData(): void {
  const now = Date.now();

  // Limpiar blacklist expirada
  for (const [ip, unblockAt] of blacklist.entries()) {
    if (now > unblockAt) {
      blacklist.delete(ip);
      metrics.blacklistedIps--;
    }
  }

  // Limpiar timestamps viejos (más de 1 hora)
  const oneHourAgo = now - 60 * 60 * 1000;

  for (const [ip, timestamps] of requestsByIp.entries()) {
    const cleaned = timestamps.filter(t => t.timestamp > oneHourAgo);
    if (cleaned.length === 0) {
      requestsByIp.delete(ip);
    } else {
      requestsByIp.set(ip, cleaned);
    }
  }

  for (const [userId, timestamps] of requestsByUser.entries()) {
    const cleaned = timestamps.filter(t => t.timestamp > oneHourAgo);
    if (cleaned.length === 0) {
      requestsByUser.delete(userId);
    } else {
      requestsByUser.set(userId, cleaned);
    }
  }

  console.log('🧹 Rate limit cleanup:', {
    ipsTracked: requestsByIp.size,
    usersTracked: requestsByUser.size,
    blacklisted: blacklist.size
  });
}

/**
 * Obtener métricas de rate limiting
 */
export function getRateLimitMetrics(): RateLimitMetrics {
  return { ...metrics };
}

/**
 * Resetear métricas (útil para testing)
 */
export function resetMetrics(): void {
  metrics.totalRequests = 0;
  metrics.blockedRequests = 0;
  metrics.uniqueIps = requestsByIp.size;
  metrics.blacklistedIps = blacklist.size;
}

// Ejecutar cleanup cada 10 minutos
setInterval(cleanupExpiredData, 10 * 60 * 1000);

// Resetear métricas cada hora (opcional)
setInterval(resetMetrics, 60 * 60 * 1000);
