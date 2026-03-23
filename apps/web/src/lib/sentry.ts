/**
 * Sentry React initialization.
 *
 * IMPORT ORDER CONTRACT (enforced in main.tsx):
 *   import './lib/sentry'   ← this file, FIRST import
 *   import React from 'react'
 *   ...
 */
import * as Sentry from "@sentry/react";
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import { useEffect } from "react";

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const environment = import.meta.env.MODE; // 'development' | 'production'
const release = import.meta.env.VITE_SENTRY_RELEASE as string | undefined;

export function initSentry(): void {
  if (!dsn) {
    if (environment === "production") {
      console.error("[Sentry] ⚠️ VITE_SENTRY_DSN missing in production build!");
    }
    return;
  }

  Sentry.init({
    dsn,
    environment,
    release: release ?? `chatapp-web@${APP_VERSION}`, // APP_VERSION injected by Vite
    tunnel: environment === 'production' 
      ? `${import.meta.env.VITE_API_URL}/api/sentry-tunnel`
      : '/api/sentry-tunnel', // Proxy through backend to avoid ad blockers

    // ─── Performance ───────────────────────────────────────────────────────
    tracesSampleRate: environment === "production" ? 0.1 : 0,

    // ─── Session Replay ────────────────────────────────────────────────────
    // Records a video-like replay of user actions when an error occurs.
    // IMPORTANT: mask all text and block all media to avoid capturing PII.
    replaysSessionSampleRate: 0, // Don't record normal sessions
    replaysOnErrorSampleRate: 1, // Record 100% of sessions with errors

    // ─── Integrations ──────────────────────────────────────────────────────
    integrations: [
      // Traces page navigations as performance transactions
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      // Session replay (requires @sentry/replay — already bundled in @sentry/react 7.x)
      new Sentry.Replay({
        maskAllText: true, // Mask all text content (PII protection)
        blockAllMedia: true, // Block images/video from replay
      }),
    ],

    // ─── Noise Reduction ───────────────────────────────────────────────────
    ignoreErrors: [
      // Non-error browser events
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      // Network errors the user should see in UI, not Sentry
      "Network Error",
      "Failed to fetch",
      "Load failed",
      // Expected auth errors
      "Request failed with status code 401",
    ],

    // ─── Privacy ───────────────────────────────────────────────────────────
    beforeSend(event) {
      // Drop client-side 4xx (these are already shown to the user in UI)
      const statusCode = event.extra?.statusCode as number | undefined;
      if (statusCode && statusCode >= 400 && statusCode < 500) return null;
      return event;
    },
  });

  console.log(
    `[Sentry] ✓ Initialized | env: ${environment} | release: ${release ?? "unknown"}`,
  );
}

/**
 * Set the current user context on Sentry.
 * Call this in your auth Redux slice after successful login.
 *
 * @example
 * // In authSlice.ts after login:
 * setSentryUser({ id: user._id, role: user.role });
 */
export function setSentryUser(user: { id: string; role?: string }): void {
  Sentry.setUser(user);
}

/**
 * Clear user context on logout.
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Add a breadcrumb for important user actions.
 * Breadcrumbs appear in the Sentry issue timeline.
 *
 * @example
 * addBreadcrumb('chat', 'Joined room', { roomId });
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  Sentry.addBreadcrumb({ category, message, data, level: "info" });
}

export * as Sentry from "@sentry/react";

// Injected by Vite define plugin (see vite.config.ts)
declare const APP_VERSION: string;
