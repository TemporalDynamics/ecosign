/**
 * Custom Error Classes para API Client
 * Permite manejar diferentes tipos de errores de forma específica
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends ApiError {
  constructor(message: string = 'Error de conexión. Verifica tu internet.') {
    super(message, 0, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'No autenticado. Por favor inicia sesión.') {
    super(message, 401, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'No tienes permisos para esta acción.') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends ApiError {
  constructor(
    message: string = 'Demasiadas solicitudes. Intenta en unos minutos.',
    public retryAfter?: number
  ) {
    super(message, 429, 'RATE_LIMIT');
    this.name = 'RateLimitError';
  }
}

export class ServerError extends ApiError {
  constructor(message: string = 'Error del servidor. Intenta más tarde.') {
    super(message, 500, 'SERVER_ERROR');
    this.name = 'ServerError';
  }
}

/**
 * Parsear error de API response
 */
export function parseApiError(error: any, statusCode?: number): ApiError {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new NetworkError();
  }

  // HTTP status code errors
  if (statusCode) {
    switch (statusCode) {
      case 401:
        return new AuthenticationError(error.message || error.error);
      case 403:
        return new AuthorizationError(error.message || error.error);
      case 400:
        return new ValidationError(
          error.message || error.error || 'Datos inválidos',
          error.details
        );
      case 429:
        return new RateLimitError(
          error.message || error.error,
          error.retryAfter
        );
      case 500:
      case 502:
      case 503:
      case 504:
        return new ServerError(error.message || error.error);
      default:
        return new ApiError(
          error.message || error.error || 'Error desconocido',
          statusCode,
          error.code
        );
    }
  }

  // Generic error
  return new ApiError(
    error.message || error.error || 'Error desconocido',
    statusCode,
    error.code,
    error.details
  );
}

/**
 * Verificar si un error es recuperable (retry-able)
 */
export function isRetryableError(error: ApiError): boolean {
  // Network errors son retry-able
  if (error instanceof NetworkError) {
    return true;
  }

  // Server errors 5xx son retry-able
  if (error.statusCode && error.statusCode >= 500) {
    return true;
  }

  // Rate limit con retryAfter es retry-able
  if (error instanceof RateLimitError && error.retryAfter) {
    return true;
  }

  return false;
}

/**
 * Calcular delay para retry con exponential backoff
 */
export function getRetryDelay(attemptNumber: number, baseDelay: number = 1000): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, ...
  const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);

  // Agregar jitter (variación aleatoria ±20%)
  const jitter = exponentialDelay * 0.2 * (Math.random() - 0.5);

  // Max 30 segundos
  return Math.min(exponentialDelay + jitter, 30000);
}
