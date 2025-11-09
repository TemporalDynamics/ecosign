/**
 * Rate Limiting simple en memoria
 *
 * NOTA: Esta implementación es básica y se perderá al reiniciar la función.
 * Para producción, usar Redis o Supabase para persistir contadores.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// Store en memoria (temporal)
const requests = new Map<string, RateLimitRecord>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// Configuraciones por endpoint
export const RATE_LIMITS = {
  default: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 req/min
  'generate-link': { maxRequests: 10, windowMs: 60 * 1000 }, // 10 req/min
  'verify-access': { maxRequests: 30, windowMs: 60 * 1000 }, // 30 req/min
  'log-event': { maxRequests: 100, windowMs: 60 * 1000 } // 100 req/min
};

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining?: number;
}

/**
 * Verificar rate limit para una IP
 */
export const checkRateLimit = (
  ip: string,
  config: RateLimitConfig = RATE_LIMITS.default
): RateLimitResult => {
  const now = Date.now();
  const key = `${ip}`;

  // Obtener o crear registro
  let record = requests.get(key);

  // Resetear si expiró la ventana
  if (record && now > record.resetAt) {
    requests.delete(key);
    record = undefined;
  }

  // Crear nuevo registro si no existe
  if (!record) {
    record = {
      count: 0,
      resetAt: now + config.windowMs
    };
  }

  // Verificar límite
  if (record.count >= config.maxRequests) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Incrementar contador
  record.count += 1;
  requests.set(key, record);

  const remaining = config.maxRequests - record.count;

  return { allowed: true, remaining };
};

/**
 * Obtener IP del request (considera proxies)
 */
export const getClientIp = (headers: Record<string, string | undefined>): string => {
  // Prioridad: client-ip > x-forwarded-for > x-real-ip > fallback
  const clientIp = headers['client-ip'];
  if (clientIp) return clientIp;

  const forwardedFor = headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for puede tener múltiples IPs, tomar la primera
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers['x-real-ip'];
  if (realIp) return realIp;

  return 'unknown';
};

/**
 * Cleanup periódico de registros expirados
 * Ejecutar cada 5 minutos para liberar memoria
 */
export const cleanupExpiredRecords = () => {
  const now = Date.now();
  for (const [key, record] of requests.entries()) {
    if (now > record.resetAt) {
      requests.delete(key);
    }
  }
};

// Ejecutar cleanup cada 5 minutos
setInterval(cleanupExpiredRecords, 5 * 60 * 1000);
