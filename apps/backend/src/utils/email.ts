// apps/backend/src/utils/email.ts
import { Resend } from 'resend';
import { email as emailConfig } from '../config';

// Re-export template so callers keep the same import surface
export { buildPasswordResetEmail } from './templates/password-reset.template';

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
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
  if (error) throw new Error(`Resend delivery failed: ${error.message}`);
};