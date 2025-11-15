export function sanitizeHTML(input: string): string {
  if (!input) return input;
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
}

export function sanitizeSearchQuery(input: string): string {
  if (!input) return '';
  let sanitized = input.substring(0, 100);
  sanitized = sanitized.replace(/%/g, '\\%').replace(/_/g, '\\_');
  sanitized = sanitized.replace(/'/g, "''");
  return sanitized;
}

export function sanitizeFilename(input: string): string {
  if (!input) return '';
  let sanitized = input.replace(/\.\.\//g, '').replace(/\.\.\\/g, '').replace(/\.\./g, '');
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }
  return sanitized;
}

export function isValidUUID(input: string): boolean {
  if (!input) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(input);
}

export function isValidEmail(input: string): boolean {
  if (!input || input.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(input);
}
