import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { globalLimiter } from './config/rateLimiter';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import roomRoutes from './routes/room.routes';
import messageRoutes from './routes/message.routes';
import mediaRoutes from './routes/media.routes';
import adminRoutes from './routes/admin.routes';
import { errorHandler } from './middlewares/error.middleware';
import { notFound } from './middlewares/notFound.middleware';
import { sentryRequestHandler } from './config/sentry';
import { env, isDevelopment } from './config/env';
import { sanitizeBody } from './middlewares/sanitize.middleware';

const app: Application = express();

app.set('trust proxy', 1);

app.use(sentryRequestHandler());

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        // Pure API — no content should load from our responses
        defaultSrc: ["'none'"],

        // Allow API calls back to self + frontend origin + Supabase storage
        connectSrc: [
          "'self'",
          env.CLIENT_URL,
          env.SUPABASE_URL,
          // Allow ngrok tunnels in development
          ...(isDevelopment ? ['*.ngrok-free.app', '*.ngrok.app'] : []),
        ],

        // Allow avatars/media served from Supabase storage
        imgSrc: ["'self'", 'data:', env.SUPABASE_URL],

        // No scripts, styles, frames, objects, or forms should ever
        // load from this API server's responses
        scriptSrc:     ["'none'"],
        styleSrc:      ["'none'"],
        frameSrc:      ["'none'"],
        objectSrc:     ["'none'"],
        formAction:    ["'none'"],
        frameAncestors:["'none'"],

        // Force HTTPS in production
        ...(isDevelopment ? {} : { upgradeInsecureRequests: [] }),
      },
    },

    // Already helmet defaults — stating explicitly for auditability
    crossOriginEmbedderPolicy: false, // Would break Supabase media if true
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow media cross-origin reads
  })
);

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

// Body Parsing
// JSON API endpoints never need 10mb — that limit is for media uploads (Supabase handles those).
// 100kb covers the largest legitimate JSON payloads with room to spare.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Sanitize all incoming body fields — strips HTML, blocks MongoDB operators and prototype keys
app.use(sanitizeBody);

// Rate Limiting
app.use('/api/', globalLimiter);

// Health Check
app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

// ⚠️ TEMPORARY — delete after Sentry test
app.get('/debug-sentry', (_req, res) => {
  throw new Error('Sentry integration test — delete me');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/admin', adminRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

export default app;