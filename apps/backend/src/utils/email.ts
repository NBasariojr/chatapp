import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { email } from '../config';

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { 
      user: email.user, 
      pass: email.pass 
    },
    pool: true,
    maxConnections: email.maxConnections,
    maxMessages: email.maxMessages,
  });

  return transporter;
};

// Send helper
interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  const mailer = getTransporter();

  await mailer.sendMail({
    from: email.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
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