import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../utils/errors';

// ─── Dangerous key patterns ────────────────────────────────────────────────────
// MongoDB operators start with $ — allowing them in body fields enables
// NoSQL injection attacks (e.g. { "email": { "$gt": "" } } bypasses auth queries).
// Prototype pollution keys let attackers mutate Object.prototype for all objects.
const BLOCKED_KEY_PATTERN = /^\$|^__proto__$|^constructor$|^prototype$/;

// ─── HTML tag pattern ─────────────────────────────────────────────────────────
// Strips <...> tags from strings before storage.
// React escapes HTML by default, but this protects non-React clients
// (desktop app, mobile app, future integrations) from stored XSS.
const HTML_TAG_PATTERN = /<[^>]*>/g;

/**
 * Recursively walks an object and:
 *  1. Rejects any key matching a MongoDB operator or prototype pollution pattern
 *  2. Strips HTML tags from string values
 *  3. Trims leading/trailing whitespace from string values
 *
 * Throws BadRequestError on the first blocked key found — fails fast
 * rather than silently dropping the field, so callers know their payload
 * was rejected.
 *
 * @param value  - The value to sanitize (any JSON-parsed type)
 * @param depth  - Current recursion depth (guard against deeply nested bombs)
 * @returns        Sanitized value with the same structure
 */
function sanitizeValue(value: unknown, depth = 0): unknown {
  // Guard against pathological nesting (e.g. 1000-level deep JSON objects)
  if (depth > 10) return value;

  if (typeof value === 'string') {
    return value.replace(HTML_TAG_PATTERN, '').trim();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};

    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (BLOCKED_KEY_PATTERN.test(key)) {
        // Throw immediately — don't silently drop, surface the attack attempt
        throw new BadRequestError(`Invalid field name: "${key}"`);
      }
      sanitized[key] = sanitizeValue(
        (value as Record<string, unknown>)[key],
        depth + 1,
      );
    }

    return sanitized;
  }

  // Numbers, booleans, null — pass through unchanged
  return value;
}

/**
 * Express middleware that sanitizes req.body before it reaches any controller.
 * Applied globally in app.ts, after body parsing, before routes.
 */
export const sanitizeBody = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeValue(req.body);
    }
    next();
  } catch (error) {
    next(error);
  }
};
