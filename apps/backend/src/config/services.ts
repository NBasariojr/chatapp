// apps/backend/src/config/services.ts
// Layer 3: Service Config - Grouped settings for each service

import { env } from "./env";
import type { SignOptions } from "jsonwebtoken";

export const serviceConfig = {
  // Database Service
  database: {
    uri: env.MONGODB_URI,
    poolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferMaxEntries: 0,
    bufferCommands: false,
  },

  // JWT Service
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    issuer: "chatapp",
    audience: "chatapp-users",
  },

  // Email Service
  email: {
    resendApiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM,
  },

  // OAuth Services
  oauth: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: `${env.CLIENT_URL}/auth/google/callback`,
    },
    // Future: Add other OAuth providers
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      redirectUri: `${env.CLIENT_URL}/auth/github/callback`,
    },
  },

  // Redis Service
redis: {
  url: env.REDIS_URL,
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  connectTimeout: 10000,
  lazyConnect: true,

  // Adapter clients (pub/sub pair — separate from cache client)
  adapter: {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,   // ← ADDED
    retryStrategy: (times: number): number | null =>
      times > 5 ? null : Math.min(times * 500, 3000),
  },
},

  // Socket Service
  socket: {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1 MB
  },

  // Media Service
  media: {
    uploadPath: "./uploads",
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
    ],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  },

  // Rate Limiting Service
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // General limit
    strictMax: env.RATE_LIMIT_STRICT ? 50 : 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
};
