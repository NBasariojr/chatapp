// apps/backend/src/utils/email.ts
import { Resend } from 'resend';
import { email as emailConfig } from '../config';

let resendClient: Resend | null = null;

const getResend = (): Resend => {
  if (resendClient) return resendClient;
  resendClient = new Resend(emailConfig.resendApiKey);
  return resendClient;
};

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  const client = getResend();
  const { error } = await client.emails.send({
    from: emailConfig.from,
    to:   options.to,
    subject: options.subject,
    html: options.html,
  });
  if (error) throw new Error(`Resend delivery failed: ${error.message}`);
};

// Email templates
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