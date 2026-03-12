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
} from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router: Router = Router();

// ─── Rate limiter for forgot-password ─────────────────────────────────────────
// 3 requests per 15 minutes, keyed by email (falls back to IP if body is absent).
// express-rate-limit is already in package.json — no new dependency.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Key by submitted email so rate limit is per-account, not per-IP
  keyGenerator: (req) => (req.body?.email as string | undefined) ?? req.ip ?? 'unknown',
});

// ─── Existing routes (unchanged) ─────────────────────────────────────────────
router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

// ─── Password reset routes ────────────────────────────────────────────────────
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.get('/reset-password/:token', validateResetToken);  // pre-check on page load (read-only)
router.post('/reset-password/:token', resetPassword);      // submit new password

export default router;