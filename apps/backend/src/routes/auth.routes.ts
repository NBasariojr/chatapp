// apps/backend/src/routes/auth.routes.ts

import { Router } from "express";
import {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  validateResetToken,
  resetPassword,
  googleAuth,
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordIpLimiter,
  forgotPasswordEmailLimiter,
  resetTokenGetLimiter,
  resetTokenPostLimiter,
  oauthLimiter,
} from "../config/rateLimiter";

const router: Router = Router();

// Local Auth
router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getMe);

// Password Reset
router.post(
  "/forgot-password",
  forgotPasswordIpLimiter,
  forgotPasswordEmailLimiter,
  forgotPassword,
);
router.get("/reset-password/:token", resetTokenGetLimiter, validateResetToken);
router.post("/reset-password/:token", resetTokenPostLimiter, resetPassword);

// Google OAuth
router.post("/google", oauthLimiter, googleAuth);

export default router;
