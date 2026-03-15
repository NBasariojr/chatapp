// apps/backend/src/config/runtime.ts
// Layer 2: Runtime Config - Feature flags and thresholds that can change without redeploy

import { env } from "./env";

export const runtimeConfig = {
  // Feature Flags
  enableNewChat: env.ENABLE_NEW_CHAT,
  enableAdvancedSearch: false, // Future feature
  enableFileUpload: true, // Always enabled for now
  enableVoiceMessages: false, // Future feature
  
  // Runtime Thresholds
  messageRetentionDays: env.MESSAGE_RETENTION_DAYS,
  maxRoomSize: 100,
  maxMessageLength: 2000,
  fileUploadMaxSizeMB: 10,
  
  // Rate Limiting Toggles
  strictRateLimiting: env.RATE_LIMIT_STRICT,
  enableBurstProtection: true,
  
  // A/B Testing Flags
  useNewMessageRenderer: false, // Future A/B test
  experimentalUI: false,
  
  // Monitoring & Debugging
  enableDetailedLogging: env.NODE_ENV === "development",
  enablePerformanceMonitoring: env.NODE_ENV === "production",
  
  // Cache TTLs (can be adjusted without redeploy)
  userCacheTTL: 300, // 5 minutes
  roomCacheTTL: 600, // 10 minutes
  messageCacheTTL: 60, // 1 minute
} as const;
