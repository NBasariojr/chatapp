import mongoose, { Schema, Document } from 'mongoose';

// Security-relevant event categories
export type AuditAction =
  | 'auth.login.success'
  | 'auth.login.failure'
  | 'auth.register.success'
  | 'auth.logout'
  | 'auth.password_reset.requested'
  | 'auth.password_reset.completed'
  | 'auth.google.success'
  | 'auth.token.invalid';

export interface IAuditLog extends Document {
  action:    AuditAction;
  userId?:   string;        // undefined on pre-auth failures (bad token, wrong password)
  email?:    string;        // captured on login/register even before userId is known
  ip:        string;
  userAgent: string;
  metadata?: Record<string, unknown>; // e.g. { reason: 'password_reset' }
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action:    { type: String, required: true },
    userId:    { type: String, default: null },
    email:     { type: String, default: null },
    ip:        { type: String, required: true },
    userAgent: { type: String, required: true },
    metadata:  { type: Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
    // Disable _v field — audit logs are immutable, versioning is irrelevant
    versionKey: false,
  },
);

// Query pattern: "show me all login failures in the last 24h"
auditLogSchema.index({ action: 1, createdAt: -1 });

// Query pattern: "show me all events for this user"
auditLogSchema.index({ userId: 1, createdAt: -1 });

// Auto-expire logs after 90 days — no manual cleanup required.
// MongoDB TTL index runs a background job every 60s to remove expired docs.
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
