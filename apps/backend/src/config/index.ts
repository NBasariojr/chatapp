// apps/backend/src/config/index.ts
// Layer 4: Application Config - Single source of truth aggregating all layers

import { env, isDevelopment, isStaging, isProduction } from "./env";
import { runtimeConfig } from "./runtime";
import { serviceConfig } from "./services";

// Application Config (Layer 4)
// Aggregates all configuration layers into single source of truth

export const config = {
  // Environment (Layer 1)
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  clientUrl: env.CLIENT_URL,
  
  // Environment Helpers
  isDevelopment,
  isStaging,
  isProduction,
  
  // Runtime (Layer 2)
  runtime: runtimeConfig,
  
  // Services (Layer 3)
  services: serviceConfig,
} as const;

// Type Exports
export type Config = typeof config;

// Backward Compatibility
// Export commonly used direct access patterns for convenience

export const {
  nodeEnv,
  port,
  clientUrl,
  isDevelopment: isDev,
  isStaging: isStg,
  isProduction: isProd,
} = config;

// Service shortcuts
export const db = config.services.database;
export const jwt = config.services.jwt;
export const email = config.services.email;
export const oauth = config.services.oauth;
export const redis = config.services.redis;
export const socket = config.services.socket;
export const media = config.services.media;
export const rateLimit = config.services.rateLimit;

// Runtime shortcuts
export const features = config.runtime;
