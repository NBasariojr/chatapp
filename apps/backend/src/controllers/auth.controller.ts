import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/user.model';
import { cacheSet, cacheDel, getRedis } from '../config/redis';
import { generateResetToken, hashToken } from '../utils/token';
import { sendEmail, buildPasswordResetEmail } from '../utils/email';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least 1 uppercase letter and 1 number',
  }),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const tokenParamsSchema = z.object({
  token: z.string().length(64, 'Invalid token format'),
});

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateToken = (id: string, role: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return jwt.sign({ id, role }, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as unknown as number,
  });
};

// Always return this exact message for forgot-password — prevents user enumeration
const GENERIC_RESET_RESPONSE = {
  success: true,
  message: 'If that email is registered, a password reset link has been sent.',
} as const;

// ─── Existing handlers (unchanged) ───────────────────────────────────────────

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }
    const { username, email, password } = parsed.data;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: existingUser.email === email ? 'Email already in use' : 'Username already taken',
      });
      return;
    }
    const user = await User.create({ username, email, password });
    const token = generateToken(user._id.toString(), user.role);
    await cacheSet(`session:${user._id}`, { userId: user._id, role: user.role }, 7 * 24 * 60 * 60);
    res.status(201).json({
      success: true,
      data: { user, token },
      message: 'Account created successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid email or password format' });
      return;
    }
    const { email, password } = parsed.data;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }
    const token = generateToken(user._id.toString(), user.role);
    await User.findByIdAndUpdate(user._id, { isOnline: true, lastSeen: new Date() });
    await cacheSet(`session:${user._id}`, { userId: user._id, role: user.role }, 7 * 24 * 60 * 60);
    res.json({ success: true, data: { user, token }, message: 'Login successful' });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request & { user?: { _id: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (userId) {
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
      await cacheDel(`session:${userId}`);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: Request & { user?: { _id: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// ─── Password Reset handlers ──────────────────────────────────────────────────

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const { email } = parsed.data;
    const user = await User.findOne({ email });

    // No user found, or OAuth-only account (password field absent) — return
    // the generic message either way to prevent account enumeration.
    if (!user || !user.password) {
      res.json(GENERIC_RESET_RESPONSE);
      return;
    }

    const { rawToken, hashedToken } = generateResetToken();
    const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

    // Overwrite any existing token atomically — only one valid token at a time.
    await User.findByIdAndUpdate(user._id, {
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(Date.now() + FIFTEEN_MINUTES_MS),
    });

    const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:3000';
    const resetUrl = `${clientUrl}/reset-password/${rawToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request — ChatApp',
        html: buildPasswordResetEmail(resetUrl, user.username),
      });
    } catch (emailError) {
      // Roll back the token so the user can retry with a clean state.
      await User.findByIdAndUpdate(user._id, {
        $unset: { passwordResetToken: '', passwordResetExpires: '' },
      });
      console.error('[forgotPassword] Email send error:', emailError);
      res.status(500).json({
        success: false,
        message: 'Failed to send reset email. Please try again.',
      });
      return;
    }

    res.json(GENERIC_RESET_RESPONSE);
  } catch (error) {
    next(error);
  }
};

export const validateResetToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = tokenParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      res
        .status(400)
        .json({ success: false, data: { valid: false }, message: 'Invalid token format' });
      return;
    }

    const hashedToken = hashToken(parsed.data.token);

    // One query: hash match + expiry check together — no race window
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('_id');

    if (!user) {
      res.status(400).json({
        success: false,
        data: { valid: false },
        message: 'Token is invalid or has expired.',
      });
      return;
    }

    res.json({ success: true, data: { valid: true } });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const paramsResult = tokenParamsSchema.safeParse(req.params);
    if (!paramsResult.success) {
      res.status(400).json({ success: false, message: 'Invalid or missing token' });
      return;
    }

    const bodyResult = resetPasswordSchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ success: false, message: bodyResult.error.errors[0].message });
      return;
    }

    const { token } = paramsResult.data;
    const { password } = bodyResult.data;
    const hashedToken = hashToken(token);

    // Re-validate the token at submission time — the page-load check is just UX
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('_id');

    if (!user) {
      res.status(400).json({ success: false, message: 'Token is invalid or has expired.' });
      return;
    }

    // Hash manually here so we can use findByIdAndUpdate (bypasses the pre-save
    // hook which only runs on .save()). Keeps the update atomic — password hash,
    // passwordChangedAt, and token cleanup all land in one write.
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Subtract 1s to handle the edge case where Date.now() in seconds equals
    // the JWT iat field (both issued within the same second).
    const passwordChangedAt = new Date(Date.now() - 1000);

    await User.findByIdAndUpdate(user._id, {
      $set: { password: hashedPassword, passwordChangedAt },
      $unset: { passwordResetToken: '', passwordResetExpires: '' },
    });

    // ─── Session invalidation (best-effort) ───────────────────────────────
    // Redis failure here is intentionally non-fatal. The passwordChangedAt
    // guard in auth.middleware.ts is the authoritative fallback.
    try {
      await cacheDel(`session:${user._id}`);
      const redis = getRedis();
      await redis.publish(
        `user:logout:${user._id}`,
        JSON.stringify({ reason: 'password_reset' })
      );
    } catch {
      // Swallowed — stale JWT will be rejected by auth middleware on next request
    }
    // ─────────────────────────────────────────────────────────────────────

    res.json({ success: true, message: 'Password has been reset. Please log in.' });
  } catch (error) {
    next(error);
  }
};