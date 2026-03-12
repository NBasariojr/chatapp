import axios from 'axios';
import type { AuthUser, User } from '@chatapp/shared';

// Use relative base URL — Vite proxy forwards /api/* to localhost:4000
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/',
});

// Attach token from localStorage on every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('chatapp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authService = {
  // ─── Existing methods (unchanged) ────────────────────────────────────────

  login: async (credentials: { email: string; password: string }): Promise<AuthUser> => {
    const res = await client.post('/api/auth/login', credentials);
    return { ...res.data.data.user, token: res.data.data.token };
  },

  register: async (data: {
    username: string;
    email: string;
    password: string;
  }): Promise<AuthUser> => {
    const res = await client.post('/api/auth/register', data);
    return { ...res.data.data.user, token: res.data.data.token };
  },

  getMe: async (): Promise<User> => {
    const res = await client.get('/api/auth/me');
    return res.data.data;
  },

  logout: async (): Promise<void> => {
    await client.post('/api/auth/logout');
  },

  // ─── Password reset ───────────────────────────────────────────────────────

  forgotPassword: async (email: string): Promise<void> => {
    // Always resolves — backend returns generic message whether the email exists or not
    await client.post('/api/auth/forgot-password', { email });
  },

  validateResetToken: async (token: string): Promise<{ valid: boolean }> => {
    const res = await client.get(`/api/auth/reset-password/${token}`);
    return res.data.data as { valid: boolean };
  },

  resetPassword: async (
    token: string,
    password: string,
    confirmPassword: string
  ): Promise<void> => {
    await client.post(`/api/auth/reset-password/${token}`, { password, confirmPassword });
  },
};