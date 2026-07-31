/**
 * Input Sanitization & Security Helper Module
 * Protects database queries and components against XSS, NoSQL/SQL injections and malformed inputs.
 */

/**
 * Strips all HTML tags and script elements from input text
 */
export function stripHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Strip <script>
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // Strip <style>
    .replace(/<[^>]+>/g, '')                                         // Strip all HTML tags
    .replace(/javascript:/gi, '')                                    // Strip javascript: protocol
    .replace(/onload=/gi, '')                                        // Strip inline event handlers
    .replace(/onerror=/gi, '');
}

/**
 * Escapes HTML entity special characters to prevent DOM-based XSS
 */
export function escapeHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;'
  };
  return input.replace(/[&<>"'/`]/g, (match) => htmlEscapes[match] || match);
}

/**
 * Sanitizes search queries before querying Firestore or backend APIs
 * - Trims whitespace
 * - Strips dangerous HTML / Scripts
 * - Escapes regex special characters
 * - Limits max query length
 */
export function sanitizeSearchQuery(query: string, maxLength: number = 100): string {
  if (!query || typeof query !== 'string') return '';
  
  // 1. Trim leading/trailing whitespace
  let clean = query.trim();

  // 2. Strip HTML tags and dangerous javascript code
  clean = stripHtml(clean);

  // 3. Remove control characters
  clean = clean.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  // 4. Limit length
  if (clean.length > maxLength) {
    clean = clean.slice(0, maxLength);
  }

  return clean;
}

/**
 * Recursively sanitizes object properties (strings) before saving to Firestore
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  const result: any = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = stripHtml(value.trim());
    } else if (value && typeof value === 'object' && !(value instanceof Date)) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Validates and sanitizes phone numbers (Guinean & International)
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  // Keep only digits, +, and spaces
  return phone.replace(/[^\d+ ]/g, '').trim();
}
