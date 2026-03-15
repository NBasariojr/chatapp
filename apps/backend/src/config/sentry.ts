/**
 * Sentry Node.js initialization module.
 *
 * IMPORT ORDER CONTRACT (enforced in server.ts):
 *   1. dotenv.config()
 *   2. import { initSentry } from './config/sentry'  ← this file
 *   3. import app from './app'
 *
 * Importing this file after app.ts means Express is already constructed
 * and Sentry's auto-instrumentation will miss the initial module graph.
 */
import * as Sentry from '@sentry/node';

// ─── PII Filter ──────────────────────────────────────────────────────────────

const SENSITIVE_KEYS = new Set([
  'password', 'confirmPassword', 'currentPassword', 'newPassword',
  'token', 'refreshToken', 'accessToken', 'idToken',
  'id_token', 'access_token', 'refresh_token',
  'code',           // OAuth authorization code
  'secret', 'apiKey', 'api_key',
  'authorization',  // HTTP header value
]);

function scrubObject(obj: Record<string, unknown>, depth = 0): void {
  if (depth > 4) return;
  for (const key of Object.keys(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      obj[key] = '[Filtered]';
    } else if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      scrubObject(obj[key] as Record<string, unknown>, depth + 1);
    }
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

let _initialized = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';

  if (!dsn) {
    const msg = isProduction
      ? '[Sentry] ⚠️  SENTRY_DSN missing in production — errors will NOT be tracked!'
      : '[Sentry] SENTRY_DSN not set — skipping (OK for local dev)';
    isProduction ? console.error(msg) : console.info(msg);
    return;
  }

  if (_initialized) return; // Guard against accidental double-init

  Sentry.init({
    dsn,
    environment: nodeEnv,

    // Release: set SENTRY_RELEASE in your Render env to the git SHA.
    // Fallback: npm_package_version from package.json.
    release:
      process.env.SENTRY_RELEASE ??
      `chatapp-backend@${process.env.npm_package_version ?? '0.0.0'}`,

    // ─── Performance ───────────────────────────────────────────────────────
    // 10% of requests in production. Set to 1.0 temporarily during profiling.
    tracesSampleRate: isProduction ? 0.1 : 0.0,

    // ─── Integrations ──────────────────────────────────────────────────────
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Mongo({ useMongoose: true }), // Traces MongoDB queries
    ],

    // ─── Privacy ───────────────────────────────────────────────────────────
    beforeSend(event) {
      // 1. Scrub POST body
      const body = event.request?.data;
      if (body && typeof body === 'object') {
        scrubObject(body as Record<string, unknown>);
      }

      // 2. Drop user email (keep ID only — GDPR-friendly)
      if (event.user?.email) {
        delete event.user.email;
      }

      return event;
    },

    // ─── Noise Reduction ───────────────────────────────────────────────────
    // These are handled as operational errors and should never reach Sentry.
    // If they do, something is wrong with the error classification, not Sentry.
    ignoreErrors: [
      'ECONNRESET',        // Client disconnected mid-request
      'EPIPE',             // Write after client disconnect
      'JsonWebTokenError', // Invalid JWT — returns 401
      'TokenExpiredError', // Expired JWT — returns 401
    ],
  });

  _initialized = true;
  console.log(`[Sentry] ✓ Initialized | env: ${nodeEnv}`);
}

// ─── Middleware Factories ─────────────────────────────────────────────────────

/**
 * Enriches every request's Sentry scope with HTTP context.
 * Register BEFORE all routes in app.ts.
 */
export const sentryRequestHandler = (): ReturnType<typeof Sentry.Handlers.requestHandler> =>
  Sentry.Handlers.requestHandler();

/**
 * Sets the current user context on the Sentry scope.
 * Call this in auth.middleware.ts AFTER validating the JWT.
 *
 * @example
 * setSentryUser({ id: user._id.toString(), role: user.role });
 */
export function setSentryUser(user: { id: string; role?: string }): void {
  if (_initialized) {
    Sentry.setUser(user);
  }
}

/**
 * Captures an exception with enriched context.
 * Used in error.middleware.ts and socket.service.ts.
 */
export function captureException(
  error: unknown,
  context?: {
    userId?: string;
    roomId?: string;
    event?: string;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  },
): void {
  if (!_initialized) return;

  Sentry.withScope((scope) => {
    if (context?.userId) scope.setUser({ id: context.userId });
    if (context?.roomId) scope.setTag('roomId', context.roomId);
    if (context?.event) scope.setTag('socketEvent', context.event);
    if (context?.tags) {
      for (const [k, v] of Object.entries(context.tags)) scope.setTag(k, v);
    }
    if (context?.extra) {
      for (const [k, v] of Object.entries(context.extra)) scope.setExtra(k, v);
    }
    Sentry.captureException(error);
  });
}

export * from '@sentry/node';