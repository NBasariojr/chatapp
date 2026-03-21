import { Request } from 'express';
import { AuditLog, AuditAction } from '../models/audit-log.model';
import { captureException } from '../config/sentry';

interface AuditEventPayload {
  action:   AuditAction;
  req:      Request;
  userId?:  string;
  email?:   string;
  metadata?: Record<string, unknown>;
}

/**
 * Write a security audit event to MongoDB.
 *
 * FIRE-AND-FORGET — this function never throws and never awaits.
 * A failed audit write must never block or reject the parent request.
 * If the write fails, the error is sent to Sentry for monitoring.
 *
 * Usage:
 *   logAuditEvent({ action: 'auth.login.success', req, userId, email });
 *   // no await — intentional
 */
export const logAuditEvent = (payload: AuditEventPayload): void => {
  const { action, req, userId, email, metadata } = payload;

  // Extract real IP — respects express 'trust proxy' setting in app.ts
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    'unknown';

  const userAgent = req.headers['user-agent'] || 'unknown';

  // Intentionally not awaited — fire and forget
  AuditLog.create({ action, userId, email, ip, userAgent, metadata }).catch(
    (err) => {
      // Audit write failure is an infrastructure error → Sentry
      captureException(err, {
        tags: { component: 'audit-service' },
        extra: { action, userId, email },
      });
      // Never rethrow — the parent request must not be affected
    },
  );
};
