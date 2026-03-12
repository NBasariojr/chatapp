import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

/**
 * Email utility using Nodemailer with Gmail SMTP.
 *
 * Required env vars:
 *   EMAIL_USER   — your Gmail address, e.g. yourname@gmail.com
 *   EMAIL_PASS   — Gmail App Password (16 chars, NOT your real Gmail password)
 *   EMAIL_FROM   — display sender, e.g. "ChatApp <yourname@gmail.com>"
 *   CLIENT_URL   — frontend base URL, e.g. https://your-app.vercel.app
 *
 * Gmail App Password setup:
 *   1. Enable 2-Step Verification on your Google account
 *   2. Go to Google Account → Security → App Passwords
 *   3. Generate a new app password (select "Mail" + "Other")
 *   4. Copy the 16-character code into EMAIL_PASS (no spaces)
 */

// ─── Transporter singleton ────────────────────────────────────────────────────
// Created once on first use — Nodemailer reuses the SMTP connection pool.
// Lazy init means the server boots fine even if email env vars are missing.

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (transporter) return transporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error('EMAIL_USER and EMAIL_PASS must be set in environment variables');
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    // Pool reuses SMTP connections — avoids opening a new connection per email
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });

  return transporter;
};

// ─── Send helper ──────────────────────────────────────────────────────────────

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error('EMAIL_FROM not configured');

  const mailer = getTransporter();

  await mailer.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
};

// ─── Email templates ──────────────────────────────────────────────────────────

export const buildPasswordResetEmail = (resetUrl: string, username: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password</title>
</head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;background:#ffffff;">
  <h2 style="margin-top:0;">Password Reset Request</h2>
  <p>Hi <strong>${username}</strong>,</p>
  <p>We received a request to reset your ChatApp password. Click the button below to choose a new one.</p>
  <p style="color:#666;font-size:14px;">This link expires in <strong>15 minutes</strong>.</p>

  <a
    href="${resetUrl}"
    style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6366f1;
           color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;"
  >
    Reset Password
  </a>

  <p style="color:#666;font-size:14px;margin-top:24px;">
    If you didn't request this, you can safely ignore this email — your password won't change.
  </p>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

  <p style="color:#9ca3af;font-size:12px;line-height:1.6;">
    Link not working? Copy and paste this URL into your browser:<br />
    <span style="color:#6366f1;word-break:break-all;">${resetUrl}</span>
  </p>
</body>
</html>
`;