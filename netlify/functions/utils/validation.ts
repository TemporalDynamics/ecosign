/**
 * Utilidades de validación para inputs de API
 */

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const sanitizeString = (str: string, maxLength: number = 255): string => {
  return str.trim().substring(0, maxLength);
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateRequired = (
  fields: Record<string, any>,
  requiredFields: string[]
): { valid: boolean; missing?: string[] } => {
  const missing = requiredFields.filter(field => {
    const value = fields[field];
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    return { valid: false, missing };
  }

  return { valid: true };
};

/**
 * Validar parámetros de generación de link
 */
export interface GenerateLinkParams {
  document_id: string;
  recipient_email: string;
  expires_in_hours?: number;
  require_nda?: boolean;
}

export const validateGenerateLinkParams = (
  params: any
): { valid: boolean; error?: string; data?: GenerateLinkParams } => {
  const { document_id, recipient_email, expires_in_hours, require_nda } = params;

  // Validar campos requeridos
  const required = validateRequired(params, ['document_id', 'recipient_email']);
  if (!required.valid) {
    return { valid: false, error: `Missing fields: ${required.missing?.join(', ')}` };
  }

  // Validar UUID
  if (!isValidUUID(document_id)) {
    return { valid: false, error: 'Invalid document_id format' };
  }

  // Validar email
  if (!isValidEmail(recipient_email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Validar expires_in_hours (opcional)
  if (expires_in_hours !== undefined) {
    const hours = Number(expires_in_hours);
    if (isNaN(hours) || hours < 1 || hours > 8760) {
      return { valid: false, error: 'expires_in_hours must be between 1 and 8760 (1 year)' };
    }
  }

  return {
    valid: true,
    data: {
      document_id,
      recipient_email: sanitizeString(recipient_email, 255),
      expires_in_hours: expires_in_hours ? Number(expires_in_hours) : 24,
      require_nda: require_nda !== undefined ? Boolean(require_nda) : true
    }
  };
};

/**
 * Validar parámetros de verificación de acceso
 */
export interface VerifyAccessParams {
  token: string;
  otp?: string;
}

export const validateVerifyAccessParams = (
  params: any
): { valid: boolean; error?: string; data?: VerifyAccessParams } => {
  const { token, otp } = params;

  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token is required' };
  }

  // Token debe ser hex de 64 caracteres
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return { valid: false, error: 'Invalid token format' };
  }

  // OTP opcional, si existe debe ser numérico de 6 dígitos
  if (otp !== undefined && !/^\d{6}$/.test(otp)) {
    return { valid: false, error: 'Invalid OTP format (must be 6 digits)' };
  }

  return {
    valid: true,
    data: { token, otp }
  };
};

/**
 * Validar parámetros de log de eventos
 */
export interface LogEventParams {
  recipient_id: string;
  event_type: 'view' | 'download' | 'forward';
  session_id?: string;
}

export const validateLogEventParams = (
  params: any
): { valid: boolean; error?: string; data?: LogEventParams } => {
  const { recipient_id, event_type, session_id } = params;

  // Validar campos requeridos
  const required = validateRequired(params, ['recipient_id', 'event_type']);
  if (!required.valid) {
    return { valid: false, error: `Missing fields: ${required.missing?.join(', ')}` };
  }

  // Validar UUID
  if (!isValidUUID(recipient_id)) {
    return { valid: false, error: 'Invalid recipient_id format' };
  }

  // Validar event_type
  const validEventTypes = ['view', 'download', 'forward'];
  if (!validEventTypes.includes(event_type)) {
    return {
      valid: false,
      error: `Invalid event_type. Must be one of: ${validEventTypes.join(', ')}`
    };
  }

  return {
    valid: true,
    data: {
      recipient_id,
      event_type,
      session_id: session_id ? sanitizeString(session_id, 255) : undefined
    }
  };
};
