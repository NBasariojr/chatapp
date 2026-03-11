import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import roomRoutes from './routes/room.routes';
import messageRoutes from './routes/message.routes';
import mediaRoutes from './routes/media.routes';
import adminRoutes from './routes/admin.routes';
import { errorHandler } from './middlewares/error.middleware';
import { notFound } from './middlewares/notFound.middleware';

const app: Application = express();

// Sentry init (no-op if DSN not set)
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
  app.use(Sentry.Handlers.requestHandler());
}

// Security headers
app.use(helmet());

// CORS
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  process.env.NGROK_URL,        // auto-set by ngrok-start.ps1
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.some(
          (o) =>
            o === origin ||
            origin.endsWith('.ngrok-free.app') ||
            origin.endsWith('.ngrok.app')
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

// Rate limiting — 100 requests per 15 min per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Health check
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
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;