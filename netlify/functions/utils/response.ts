/**
 * Helpers para respuestas HTTP estandarizadas
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export const successResponse = <T>(data: T, statusCode: number = 200) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    },
    body: JSON.stringify({
      success: true,
      data
    } as ApiResponse<T>)
  };
};

export const errorResponse = (
  error: string,
  statusCode: number = 400,
  code?: string
) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    },
    body: JSON.stringify({
      success: false,
      error,
      code
    } as ApiResponse)
  };
};

export const validationError = (message: string) => {
  return errorResponse(message, 400, 'VALIDATION_ERROR');
};

export const unauthorizedError = (message: string = 'Unauthorized') => {
  return errorResponse(message, 401, 'UNAUTHORIZED');
};

export const forbiddenError = (message: string = 'Forbidden') => {
  return errorResponse(message, 403, 'FORBIDDEN');
};

export const notFoundError = (message: string = 'Not found') => {
  return errorResponse(message, 404, 'NOT_FOUND');
};

export const rateLimitError = (retryAfter: number) => {
  return {
    statusCode: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfter)
    },
    body: JSON.stringify({
      success: false,
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter
    } as ApiResponse)
  };
};

export const serverError = (message: string = 'Internal server error') => {
  return errorResponse(message, 500, 'INTERNAL_ERROR');
};
