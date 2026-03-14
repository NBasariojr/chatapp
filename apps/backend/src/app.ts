// apps/backend/src/app.ts
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { globalLimiter } from './config/rateLimiter';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import roomRoutes from './routes/room.routes';
import messageRoutes from './routes/message.routes';
import mediaRoutes from './routes/media.routes';
import adminRoutes from './routes/admin.routes';
import { errorHandler } from './middlewares/error.middleware';
import { notFound } from './middlewares/notFound.middleware';

// Optional Sentry integration
let Sentry: any = null;
if (process.env.SENTRY_DSN) {
  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV ?? 'development',
      beforeSend(event: Record<string, unknown>) {
        const req = event.request as Record<string, unknown> | undefined;
        if (req?.data) {
          const data = req.data as Record<string, unknown>;
          const SENSITIVE_FIELDS = ['code', 'accessToken', 'idToken', 'id_token', 'access_token'];
          for (const field of SENSITIVE_FIELDS) {
            if (field in data) data[field] = '[REDACTED]';
          }
        }
        return event;
      },
    });
  } catch {
    console.warn(
      '[app] @sentry/node not installed — error monitoring disabled. Run: pnpm add @sentry/node --filter @chatapp/backend'
    );
    Sentry = null;
  }
}

const app: Application = express();

app.set('trust proxy', 1);

if (Sentry) app.use(Sentry.Handlers.requestHandler());

app.use(helmet());

// CORS
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  process.env.NGROK_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.some(
          (o) =>
            o === origin ||
            origin.endsWith('.ngrok-free.app') ||
            origin.endsWith('.ngrok.app') ||
            origin.endsWith('.vercel.app')
        )
      ) {
        return callback(null, true);
      }
      console.warn(`🚫 HTTP CORS blocked origin: ${origin}`);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP request logging (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Global rate limiter for all API routes
app.use('/api/', globalLimiter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/admin', adminRoutes);

// Sentry error handler
if (Sentry) app.use(Sentry.Handlers.errorHandler());

// 404 + global error handler
app.use(notFound);
app.use(errorHandler);

export default app;