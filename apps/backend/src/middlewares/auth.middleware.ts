import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';

export interface AuthRequest extends Request {
  user?: {
    _id: string;
    role: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured');

    // iat is needed for the passwordChangedAt stale-token check below
    const decoded = jwt.verify(token, secret) as { id: string; role: string; iat: number };

    // Fetch passwordChangedAt alongside the fields auth middleware already needs
    const user = await User.findById(decoded.id).select('_id role passwordChangedAt');
    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    // ─── Stale-JWT guard ───────────────────────────────────────────────────
    // If the user changed their password after this token was issued, reject it.
    // This is the Redis-independent fallback that guarantees session invalidation
    // even when the pub/sub force-logout event could not be delivered.
    if (user.passwordChangedAt) {
      const changedTimestamp = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (decoded.iat < changedTimestamp) {
        res.status(401).json({
          success: false,
          message: 'Password recently changed. Please log in again.',
        });
        return;
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    req.user = { _id: user._id.toString(), role: user.role };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, message: 'Invalid or expired token' });
      return;
    }
    next(error);
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource',
      });
      return;
    }
    next();
  };
};