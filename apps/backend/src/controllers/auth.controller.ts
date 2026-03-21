import { Request, Response, NextFunction } from "express";
import jwtLib from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/user.model";
import { cacheSet, cacheDel, getRedis } from "../config/redis";
import { generateResetToken, hashToken } from "../utils/token";
import { sendEmail, buildPasswordResetEmail } from "../utils/email";
import { ObjectIdToString } from "../utils/objectId";
import {
  exchangeAndVerifyGoogleCode,
  upsertGoogleUser,
} from "../services/oauth.service";
import { ValidationError, ConflictError, NotFoundError, UnauthorizedError } from "../utils/errors";
import { config, jwt } from "../config";
import { logAuditEvent } from "../services/audit.service";

// Schemas
const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[A-Z])(?=.*\d)/, {
      message: "Password must contain at least 1 uppercase letter and 1 number",
    }),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const tokenParamsSchema = z.object({
  token: z.string().length(64, "Invalid token format"),
});

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/\d/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const googleAuthSchema = z.object({
  code: z.string().min(1, "Authorization code is required"),
});

// Helpers
const generateToken = (
  id: string,
  role: string,
  authProvider: string,
): string => {
  return jwtLib.sign(
    { id, role, authProvider },
    jwt.secret,
    { expiresIn: jwt.expiresIn }
  );
};

// Always return this exact message for forgot-password — prevents user enumeration
const GENERIC_RESET_RESPONSE = {
  success: true,
  message: "If that email is registered, a password reset link has been sent.",
} as const;

// Existing handlers
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }
    const { username, email, password } = parsed.data;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      throw new ConflictError(
        existingUser.email === email
          ? "Email already in use"
          : "Username already taken"
      );
    }
    const user = await User.create({ username, email, password });
    const token = generateToken(
      ObjectIdToString(user._id),
      user.role,
      user.authProvider,
    );
    await cacheSet(
      `session:${ObjectIdToString(user._id)}`,
      { userId: ObjectIdToString(user._id), role: user.role },
      7 * 24 * 60 * 60,
    );
    logAuditEvent({ action: 'auth.register.success', req, userId: ObjectIdToString(user._id), email });
    res.status(201).json({
      success: true,
      data: { user, token },
      message: "Account created successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid email or password format");
    }
    const { email, password } = parsed.data;

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Google-only account: no password set — give actionable message
    if (user.authProvider === "google" && !user.password) {
      throw new UnauthorizedError(
        "This account uses Google Sign-In. Please continue with Google."
      );
    }

    if (!(await user.comparePassword(password))) {
      logAuditEvent({ action: 'auth.login.failure', req, email, metadata: { reason: 'invalid_password' } });
      throw new UnauthorizedError("Invalid email or password");
    }

    const token = generateToken(
      ObjectIdToString(user._id),
      user.role,
      user.authProvider,
    );
    await User.findByIdAndUpdate(ObjectIdToString(user._id), {
      isOnline: true,
      lastSeen: new Date(),
    });
    await cacheSet(
      `session:${ObjectIdToString(user._id)}`,
      { userId: ObjectIdToString(user._id), role: user.role },
      7 * 24 * 60 * 60,
    );
    logAuditEvent({ action: 'auth.login.success', req, userId: ObjectIdToString(user._id), email });
    res.json({
      success: true,
      data: { user, token },
      message: "Login successful",
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request & { user?: { _id: string } },
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date(),
      });
      await cacheDel(`session:${userId}`);
    }
    logAuditEvent({ action: 'auth.logout', req, userId: userId?.toString() });
    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: Request & { user?: { _id: string } },
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      throw new NotFoundError("User");
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// Password Reset handlers

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const { email } = parsed.data;

    const user = await User.findOne({ email }).select("+password");

    if (!user || !user.password) {
      res.json(GENERIC_RESET_RESPONSE);
      return;
    }

    const { rawToken, hashedToken } = generateResetToken();
    const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

    await User.findByIdAndUpdate(ObjectIdToString(user._id), {
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(Date.now() + FIFTEEN_MINUTES_MS),
    });

    const resetUrl = `${config.clientUrl}/reset-password/${rawToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Password Reset Request — ChatApp",
        html: buildPasswordResetEmail(resetUrl, user.username),
      });
    } catch (emailError) {
      await User.findByIdAndUpdate(ObjectIdToString(user._id), {
        $unset: { passwordResetToken: "", passwordResetExpires: "" },
      });
      console.error("[forgotPassword] Email send error:", emailError);
      throw new Error("Failed to send reset email. Please try again.");
    }

    logAuditEvent({ action: 'auth.password_reset.requested', req, userId: ObjectIdToString(user._id), email: user.email });
    res.json(GENERIC_RESET_RESPONSE);
  } catch (error) {
    next(error);
  }
};

export const validateResetToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = tokenParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      throw new ValidationError("Invalid token format");
    }

    const hashedToken = hashToken(parsed.data.token);

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select("_id");

    if (!user) {
      throw new ValidationError("Token is invalid or has expired.");
    }

    res.json({ success: true, data: { valid: true } });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const paramsResult = tokenParamsSchema.safeParse(req.params);
    if (!paramsResult.success) {
      throw new ValidationError("Invalid or missing token");
    }

    const bodyResult = resetPasswordSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new ValidationError(bodyResult.error.errors[0].message);
    }

    const { token } = paramsResult.data;
    const { password } = bodyResult.data;
    const hashedToken = hashToken(token);

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select("_id");

    if (!user) {
      throw new ValidationError("Token is invalid or has expired.");
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    const passwordChangedAt = new Date(Date.now() - 1000);

    await User.findByIdAndUpdate(ObjectIdToString(user._id), {
      $set: {
        password: hashedPassword,
        passwordChangedAt,
        authProvider: "both",
        isEmailVerified: true,
      },
      $unset: { passwordResetToken: "", passwordResetExpires: "" },
    });
    logAuditEvent({ action: 'auth.password_reset.completed', req, userId: ObjectIdToString(user._id) });
    try {
      await cacheDel(`session:${ObjectIdToString(user._id)}`);
      const redis = getRedis();
      await redis.publish(
        `user:logout:${ObjectIdToString(user._id)}`,
        JSON.stringify({ reason: "password_reset" }),
      );
    } catch {
      // Non-fatal — auth middleware's passwordChangedAt guard is the authoritative fallback
    }

    res.json({
      success: true,
      message: "Password has been reset. Please log in.",
    });
  } catch (error) {
    next(error);
  }
};

// Google OAuth handler
export const googleAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = googleAuthSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const { code } = parsed.data;

    const googleUserInfo = await exchangeAndVerifyGoogleCode(code);

    const user = await upsertGoogleUser(googleUserInfo);

    const token = generateToken(
      ObjectIdToString(user._id),
      user.role,
      user.authProvider,
    );

    try {
      await cacheSet(
        `session:${ObjectIdToString(user._id)}`,
        { userId: ObjectIdToString(user._id), role: user.role },
        7 * 24 * 60 * 60,
      );
    } catch (cacheError) {
      console.error(
        `[googleAuth] Redis session cache failed for user ${ObjectIdToString(user._id)}:`,
        (cacheError as Error).message,
      );
    }

    logAuditEvent({ action: 'auth.google.success', req, userId: ObjectIdToString(user._id), email: user.email });
    res.json({
      success: true,
      data: { user, token },
      message: "Google sign-in successful",
    });
  } catch (error) {
    next(error); // OAuthVerificationError is operational — error middleware handles it correctly
  }
};
