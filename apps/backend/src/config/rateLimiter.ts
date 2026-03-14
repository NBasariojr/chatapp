// apps/backend/src/config/rateLimiter.ts

import rateLimit, { RateLimitRequestHandler, Options } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedis } from './redis';
import { Request } from 'express';

// ─── Redis Store Factory ───────────────────────────────────────────────────────
// Lazily creates a RedisStore backed by the shared ioredis client.
// Falls back to MemoryStore if Redis is unavailable (non-fatal degradation).
// This is intentionally lazy (called at first-request time, not import time)
// so it runs AFTER connectRedis() has initialised the client in server.ts.

function createRedisStore(prefix: string): RedisStore | undefined {
  try {
    const client = getRedis();
    return new RedisStore({
      // ioredis sendCommand adapter — required by rate-limit-redis v3
      sendCommand: (...args: string[]) =>
        client.call(args[0], ...args.slice(1)) as Promise<any>,
      prefix,
    });
  } catch {
    // Redis not yet initialised or unavailable
    // express-rate-limit falls back to MemoryStore — safe for single-instance dev,
    // but cloud deployments should ensure Redis is up before traffic hits
    console.warn(
      `[rateLimiter] Redis store unavailable for prefix "${prefix}" — falling back to MemoryStore`
    );
    return undefined;
  }
}

// ─── Limiter Factory ──────────────────────────────────────────────────────────
// All limiters share the same sane defaults. Only endpoint-specific values are
// overridden, keeping configuration DRY and auditable in one place.

function createLimiter(
  overrides: Partial<Options> & {
    prefix: string;
    keyGenerator?: (req: Request) => string;
  }
): RateLimitRequestHandler {
  const { prefix, keyGenerator, ...opts } = overrides;

  return rateLimit({
    // ── Shared defaults ────────────────────────────────────────────────────
    standardHeaders: true,        // Send RateLimit-* headers (RFC 6585)
    legacyHeaders: false,         // Suppress deprecated X-RateLimit-* headers
    skipFailedRequests: false,    // Count ALL requests, including 4xx/5xx
    skipSuccessfulRequests: false,

    // Redis-backed store — falls back to MemoryStore if unavailable
    store: createRedisStore(prefix),

    // ── Per-limiter overrides ──────────────────────────────────────────────
    ...opts,

    // Key generator — default is IP; override per limiter
    keyGenerator: keyGenerator ?? ((req: Request) => req.ip ?? 'unknown'),

    // Consistent JSON error response across all limiters
    handler: (req, res, _next, options) => {
      const msg =
        typeof options.message === 'object'
          ? (options.message as { message: string }).message
          : String(options.message);

      res.status(options.statusCode).json({
        success: false,
        message: msg,
        retryAfter: Math.ceil(options.windowMs / 1000 / 60), // in minutes
      });
    },
  });
}

// ─── IP Extractor Helper ──────────────────────────────────────────────────────
// req.ip is already de-proxied because app.ts sets `trust proxy = 1`.
// This reads the real client IP from X-Forwarded-For on Railway/Render/AWS.

const getIp = (req: Request): string => req.ip ?? 'unknown';

// ─── Global Limiter ───────────────────────────────────────────────────────────
// Broad baseline applied to all /api/* routes in app.ts.
// High ceiling — this is a last-resort DDoS guard, not a security control.
// Individual endpoint limiters below provide the real protection.

export const globalLimiter = createLimiter({
  prefix: 'rl:global:',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

// ─── Login Limiter ────────────────────────────────────────────────────────────
// Prevents credential stuffing and brute force attacks.
// Keyed by IP only — keying by email would leak user existence via timing.

export const loginLimiter = createLimiter({
  prefix: 'rl:login:',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  keyGenerator: (req) => getIp(req),
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
});

// ─── Register Limiter ─────────────────────────────────────────────────────────
// Prevents automated spam account creation.
// Wider window (1hr) — legitimate users almost never register more than once.

export const registerLimiter = createLimiter({
  prefix: 'rl:register:',
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => getIp(req),
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again in an hour.',
  },
});

// ─── Forgot Password — IP Limiter ─────────────────────────────────────────────
// Layer 1: limits by source IP.
// Stops a single IP from hammering the endpoint across many email targets.
// Applied BEFORE the email limiter in the route chain.

export const forgotPasswordIpLimiter = createLimiter({
  prefix: 'rl:forgot-pw-ip:',
  windowMs: 15 * 60 * 1000,
  max: 5, // Slightly higher than email limit to allow for fat-finger retries
  keyGenerator: (req) => getIp(req),
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again in 15 minutes.',
  },
});

// ─── Forgot Password — Email Limiter ─────────────────────────────────────────
// Layer 2: limits by normalised email address.
// Stops distributed attacks (many IPs) targeting one victim's inbox.
// DESIGN NOTE: returning 429 here does reveal "this email was rate-limited",
// but that's acceptable — the attacker already knows which email they're targeting.
// The controller still returns GENERIC_RESET_RESPONSE for 200 paths.

export const forgotPasswordEmailLimiter = createLimiter({
  prefix: 'rl:forgot-pw-email:',
  windowMs: 15 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => {
    // Normalise to lowercase to prevent "User@Example.com" bypass
    const email = (req.body?.email as string | undefined)?.toLowerCase().trim();
    return email ?? getIp(req); // Fall back to IP if email is missing/invalid
  },
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again in 15 minutes.',
  },
});

// ─── Reset Token — GET Limiter ────────────────────────────────────────────────
// Limits token validation probing (GET /reset-password/:token).
// Higher ceiling — users may refresh the page or navigate back legitimately.

export const resetTokenGetLimiter = createLimiter({
  prefix: 'rl:reset-get:',
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => getIp(req),
  message: {
    success: false,
    message: 'Too many requests. Please try again in 15 minutes.',
  },
});

// ─── Reset Token — POST Limiter ───────────────────────────────────────────────
// Limits actual password reset submissions.
// Stricter than GET — this writes to the database and invalidates sessions.
// Token entropy (256-bit hex) already makes brute force infeasible,
// but we still limit to prevent mass-scanning / token-guessing attempts.

export const resetTokenPostLimiter = createLimiter({
  prefix: 'rl:reset-post:',
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => getIp(req),
  message: {
    success: false,
    message: 'Too many reset attempts. Please try again in 15 minutes.',
  },
});

// ─── Google OAuth Limiter ─────────────────────────────────────────────────────
// Limits OAuth code exchange attempts.
// Keyed by IP + truncated User-Agent to slightly harden against simple IP rotation.
// Replaces the existing in-memory oauthLimiter in auth.routes.ts.

export const oauthLimiter = createLimiter({
  prefix: 'rl:google:',
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    const ip = getIp(req);
    const ua = (req.headers['user-agent'] ?? '').slice(0, 64);
    return `${ip}:${ua}`;
  },
  message: {
    success: false,
    message: 'Too many sign-in attempts. Please try again in 15 minutes.',
  },
});