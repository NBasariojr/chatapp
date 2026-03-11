// web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 3000,
    allowedHosts: [
      'localhost',
      '.ngrok-free.dev',  // free tier
      '.ngrok-free.app',  // free tier alternate
      '.ngrok.app',       // paid plans
    ],
    proxy: {
      // HTTP API calls → backend
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // Socket.IO WebSocket → backend
      // This is the key fix for mobile: socket connects to ngrok:3000,
      // Vite proxies it server-side to localhost:4000
      '/socket.io': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        ws: true,  // ← enable WebSocket proxying
      },
    },
  },
});