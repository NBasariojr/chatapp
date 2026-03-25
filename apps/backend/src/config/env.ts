import { z } from "zod";

export const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(["development", "staging", "production", "test"])
    .default("development"),
  PORT: z.string().transform(Number),

  // Database
  MONGODB_URI: z.string(),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_KEY: z.string(),
  SUPABASE_BUCKET: z.string(),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // RESEND
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  EMAIL_FROM: z.string().email(), // keep — used as Resend from: field

  // Redis (optional)
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().optional().default("localhost"),
  REDIS_PORT: z.string().transform(Number).default("6379"),

  // Client
  CLIENT_URL: z.string().url(),

  // OAuth
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),

  // Sentry (optional — app runs without it, but warn in production)
  SENTRY_DSN: z.string().url().optional().or(z.literal("")).transform(v => v === "" ? undefined : v),
  // Set to git SHA in CI/CD: SENTRY_RELEASE=$(git rev-parse --short HEAD)
  SENTRY_RELEASE: z.string().optional().or(z.literal("")).transform(v => v === "" ? undefined : v),

  // Feature Flags
  ENABLE_NEW_CHAT: z.coerce.boolean().default(false),
  MESSAGE_RETENTION_DAYS: z.coerce.number().default(30),
  RATE_LIMIT_STRICT: z.coerce.boolean().default(false),

  // Test Environment (only required when NODE_ENV=test)
  TEST_USER_EMAIL: z.string().email().optional(),
  TEST_USER_PASSWORD: z.string().min(1).optional(),
  TEST_ADMIN_EMAIL: z.string().email().optional(),
  TEST_ADMIN_PASSWORD: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);

export const isDevelopment = env.NODE_ENV === "development";
export const isStaging = env.NODE_ENV === "staging";
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

/**
 * Validates test environment configuration
 * Call this in test setup to fail fast if required test vars are missing
 */
export function validateTestEnvironment(): void {
  if (!isTest) return;

  const requiredTestVars = [
    'JWT_SECRET'
  ];

  const missingVars = requiredTestVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required test environment variables: ${missingVars.join(', ')}\n` +
      'Please ensure .env.test is properly configured or run tests with the correct environment.'
    );
  }
}
