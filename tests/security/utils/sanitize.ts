// netlify/functions/utils/sanitize.ts
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

/**
 * Sanitizes an HTML string, removing dangerous tags and attributes.
 * @param dirty The untrusted HTML string.
 * @returns A sanitized HTML string.
 */
export function sanitizeHTML(dirty: string): string {
  return purify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['iframe', 'script', 'style'],
    FORBID_ATTR: ['onclick', 'onerror', 'onload', 'onmouseover', 'onfocus', 'onformchange'],
  });
}

/**
 * Sanitizes a string intended for a database search query.
 * @param query The raw search query.
 * @returns A sanitized and truncated query string.
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';
  
  // 1. Limit length
  let sanitized = query.substring(0, 100);
  
  // 2. Remove characters that are highly problematic in SQL or FTS
  sanitized = sanitized.replace(/['";\\]/g, '');

  // 3. Escape FTS operators and wildcards if they are part of the literal search
  // Note: This is a simple replacement. A real implementation might need more context.
  sanitized = sanitized.replace(/[%_*]/g, (match) => `\\${match}`);
  
  return sanitized;
}

/**
 * Sanitizes a filename to prevent path traversal and remove unsafe characters.
 * @param filename The raw filename.
 * @returns A sanitized filename.
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return '';

  // 1. Prevent path traversal
  let sanitized = filename.replace(/\.\.\//g, '').replace(/\.\.\\/g, '');
  
  // 2. Replace unsafe characters with underscore
  sanitized = sanitized.replace(/[\/\?<>\\:\*\|":]/g, '_');
  
  // 3. Limit length (e.g., 255 chars)
  sanitized = sanitized.substring(0, 255);
  
  return sanitized;
}

/**
 * Validates if a string is a valid v4 UUID.
 * @param uuid The string to validate.
 * @returns True if the string is a valid v4 UUID.
 */
export function isValidUUID(uuid: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

/**
 * Validates if a string is a plausible email address.
 * @param email The string to validate.
 * @returns True if the string looks like an email.
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) {
    return false;
  }
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}
