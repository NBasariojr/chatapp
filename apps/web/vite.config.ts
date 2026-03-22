// apps/web/vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'node:path';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';

  return {
    plugins: [
      react(),
      tsconfigPaths(),
      ...(isProduction && env.SENTRY_AUTH_TOKEN
        ? [
            sentryVitePlugin({
              org: env.SENTRY_ORG,
              project: env.SENTRY_PROJECT_WEB,
              authToken: env.SENTRY_AUTH_TOKEN,
              sourcemaps: {
                filesToDeleteAfterUpload: ['./dist/**/*.map'],
              },
              release: {
                name:
                  env.VITE_SENTRY_RELEASE ??
                  process.env.VERCEL_GIT_COMMIT_SHA ??
                  `chatapp-web@${process.env.npm_package_version ?? '0.0.0'}`,
              },
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      APP_VERSION: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    },
    build: {
      sourcemap: true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-router':    ['react-router-dom'],
            'vendor-redux':     ['@reduxjs/toolkit', 'react-redux'],
            'vendor-oauth':     ['@react-oauth/google'],
            'vendor-socket':    ['socket.io-client'],
            'vendor-utils':     ['zod'],
            'vendor-analytics': ['@vercel/analytics', '@vercel/speed-insights'],
            'vendor-charts':    ['recharts', 'd3'],
            'vendor-motion':    ['framer-motion'],
            'vendor-http':      ['axios'],
            'vendor-date':      ['date-fns'],
            'vendor-ui':        [
              'lucide-react',
              'clsx',
              'tailwind-merge',
              'class-variance-authority',
            ],
            'vendor-forms':     ['react-hook-form', '@hookform/resolvers'],
            'vendor-react':     ['react', 'react-dom'],
            'page-auth': [
              './src/pages/login/index.tsx',
              './src/pages/register/index.tsx',
              './src/pages/forgot-password/index.tsx',
              './src/pages/reset-password/index.tsx',
            ],
          },
        },
      },
    },
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
  };
});