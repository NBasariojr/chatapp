// backend/src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/user.model';
import { cacheSet, cacheDel } from '../config/redis';

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

const generateToken = (id: string, role: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return jwt.sign({ id, role }, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as unknown as number,
  });
};

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

    // Cache user session
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

    // Update online status
    await User.findByIdAndUpdate(user._id, { isOnline: true, lastSeen: new Date() });
    await cacheSet(`session:${user._id}`, { userId: user._id, role: user.role }, 7 * 24 * 60 * 60);

    res.json({
      success: true,
      data: { user, token },
      message: 'Login successful',
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request & { user?: { _id: string } }, res: Response, next: NextFunction): Promise<void> => {
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

export const getMe = async (req: Request & { user?: { _id: string } }, res: Response, next: NextFunction): Promise<void> => {
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