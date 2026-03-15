import { z } from 'zod';

export const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().transform(Number),

  // Database
  MONGODB_URI: z.string(),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_KEY: z.string(),
  SUPABASE_BUCKET: z.string(),

  // JWT
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Email
  EMAIL_FROM: z.string().email(),
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().transform(Number).optional(),
  EMAIL_USER: z.string(),
  EMAIL_PASS: z.string(),

  // Redis (optional)
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().optional().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),

  // Client
  CLIENT_URL: z.string().url(),

  // OAuth
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),

  // Sentry (optional — app runs without it, but warn in production)
  SENTRY_DSN: z.string().url().optional(),
  // Set to git SHA in CI/CD: SENTRY_RELEASE=$(git rev-parse --short HEAD)
  SENTRY_RELEASE: z.string().optional(),

  // Feature Flags
  ENABLE_NEW_CHAT: z.string().transform(Boolean).default('false'),
  MESSAGE_RETENTION_DAYS: z.string().transform(Number).default('30'),
  RATE_LIMIT_STRICT: z.string().transform(Boolean).default('false'),
});

export const env = envSchema.parse(process.env);

export const isDevelopment = env.NODE_ENV === 'development';
export const isStaging = env.NODE_ENV === 'staging';
export const isProduction = env.NODE_ENV === 'production';