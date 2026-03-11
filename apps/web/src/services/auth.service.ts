// web/src/services/auth.service.ts
import axios from 'axios';
import type { AuthUser, User } from '@chatapp/shared';

// Use relative base URL — Vite proxy forwards /api/* to localhost:4000
// This works for both desktop (localhost:3000) and mobile (via ngrok tunnel on port 3000)
const client = axios.create({ baseURL: '/' });

// Attach token from localStorage on every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('chatapp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authService = {
  login: async (credentials: { email: string; password: string }): Promise<AuthUser> => {
    const res = await client.post('/api/auth/login', credentials);
    return { ...res.data.data.user, token: res.data.data.token };
  },

  register: async (data: { username: string; email: string; password: string }): Promise<AuthUser> => {
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
};