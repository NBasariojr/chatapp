import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  validateResetToken,
  resetPassword,
  googleAuth,
} from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router: Router = Router();

// Rate limiter: forgot-password
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.body?.email as string | undefined) ?? req.ip ?? 'unknown',
});

// Rate limiter: Google OAuth
const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many sign-in attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip ?? 'unknown';
    const ua = (req.headers['user-agent'] ?? '').slice(0, 64);
    return `${ip}:${ua}`;
  },
});

// Local auth routes (unchanged)
router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

// Password reset routes
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.get('/reset-password/:token', validateResetToken);
router.post('/reset-password/:token', resetPassword);

// Google OAuth route
router.post('/google', oauthLimiter, googleAuth);

export default router;