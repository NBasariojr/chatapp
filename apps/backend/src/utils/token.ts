import crypto from 'node:crypto';

/**
 * Generates a cryptographically secure password reset token.
 * - rawToken:    64-char hex string sent in the reset email URL (never stored)
 * - hashedToken: SHA-256 hash stored in MongoDB (never expose raw)
 */
export const generateResetToken = (): { rawToken: string; hashedToken: string } => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashToken(rawToken);
  return { rawToken, hashedToken };
};

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');