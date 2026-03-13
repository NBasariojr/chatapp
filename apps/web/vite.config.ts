// apps/web/vite.config.ts
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

  // Bundle Splitting
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — almost never changes between your deploys
          'vendor-react': ['react', 'react-dom'],

          // Routing
          'vendor-router': ['react-router-dom'],

          // Redux + state management
          'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],

          // Google OAuth library
          'vendor-oauth': ['@react-oauth/google'],

          // Socket.IO client
          'vendor-socket': ['socket.io-client'],

          // UI utilities (zod, etc.)
          'vendor-utils': ['zod'],
        },
      },
    },
  },

  // Dev Server (unchanged from your original)
  server: {
    host: true,
    port: 3000,
    allowedHosts: [
      'localhost',
      '.ngrok-free.dev',
      '.ngrok-free.app',
      '.ngrok.app',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});