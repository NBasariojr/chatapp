// apps/backend/src/server.ts
import dotenv from "dotenv";
import path from "node:path";

const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

import { initSentry, captureException } from "./config/sentry";
initSentry();

import http from "node:http";
import { Server as SocketServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import app from "./app";
import { connectDB } from "./config/database";
import {
  connectRedis,
  createAdapterClients,
  closeRedisConnections,
} from "./config/redis";
import { initSocketHandlers } from "./services/socket.service";
import { setIO } from "./config/socket";

const PORT = process.env.PORT || 4000;
const httpServer = http.createServer(app);

const allowedSocketOrigins = [
  process.env.CLIENT_URL || "http://localhost:3000",
  process.env.NGROK_URL,
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
].filter(Boolean) as string[];

// Mirror the same Vercel subdomain restriction applied in app.ts CORS config.
// Only preview deployments of YOUR project are allowed, not all of Vercel.
const clientHost = (process.env.CLIENT_URL || '').replace(/^https?:\/\//, '');
const vercelSubdomain = clientHost.endsWith('.vercel.app') ? `.${clientHost}` : null;

const io = new SocketServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedSocketOrigins.includes(origin) ||
        origin.endsWith('.ngrok-free.app') ||
        origin.endsWith('.ngrok.app') ||
        (vercelSubdomain !== null && origin.endsWith(vercelSubdomain))
      ) {
        return callback(null, true);
      }
      console.warn(`🚫 Socket CORS blocked origin: ${origin}`);
      callback(new Error(`Socket CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  },
  pingTimeout: 60000,
  // Prevent large payload abuse — a client sending a 100MB socket message
  // would exhaust memory without this limit. Default is 1MB; making it
  // explicit ensures it survives any future Socket.IO version changes.
  maxHttpBufferSize: 1e6, // 1MB
});

setIO(io);

const startServer = async (): Promise<void> => {
  try {
    await connectDB();
    await connectRedis();

    // Adapter enabled only in production (or via env var)
    const enableAdapter = process.env.NODE_ENV === 'production' ||
                          process.env.REDIS_ADAPTER_ENABLED === 'true';

    if (enableAdapter) {
      try {
        const { pubClient, subClient } = createAdapterClients();

        // Explicitly connect both clients before handing to adapter
        await Promise.all([pubClient.connect(), subClient.connect()]);

        io.adapter(createAdapter(pubClient, subClient));

        // Optional: Monitor adapter events (debug level)
        io.of("/").adapter.on("create-room", (room) => {
          console.debug(`📦 Adapter: room created — ${room}`);
        });
        io.of("/").adapter.on("delete-room", (room) => {
          console.debug(`🗑️ Adapter: room deleted — ${room}`);
        });
        io.of("/").adapter.on("join-room", (room, id) => {
          console.debug(`➕ Adapter: socket ${id} joined room ${room}`);
        });
        io.of("/").adapter.on("leave-room", (room, id) => {
          console.debug(`➖ Adapter: socket ${id} left room ${room}`);
        });

        console.log('✅ Socket.IO Redis adapter attached — multi-instance mode ACTIVE');
      } catch (adapterErr) {
        // Capture error in Sentry for monitoring
        captureException(adapterErr, {
          tags: { component: 'redis-adapter' }
        });

        // REDIS_ADAPTER_REQUIRED=true in production prevents silent degradation.
        // Without this, a Redis hiccup causes multi-instance deployments to lose
        // socket sync — users stop seeing each other's messages with no visible error.
        const strictAdapter = process.env.REDIS_ADAPTER_REQUIRED === 'true';
        if (strictAdapter) {
          console.error('❌ Redis adapter is REQUIRED but failed. Shutting down to prevent inconsistent cluster state.');
          process.exit(1);
        }

        console.warn(
          '⚠️ Redis adapter failed — falling back to in-memory. ' +
          'Multi-instance sync DISABLED.',
          adapterErr instanceof Error ? adapterErr.message : ''
        );
      }
    } else {
      console.log('ℹ️  Redis adapter disabled (development) — single instance mode');
    }

    initSocketHandlers(io);

    httpServer.listen(PORT, () => {
      console.log('🚀 Server started');
      console.log(`   • Port: ${PORT}`);
      console.log(`   • Environment: ${process.env.NODE_ENV}`);
      console.log(`   • Adapter: ${io.of('/').adapter.constructor.name}`);
      console.log('📡 Socket.IO ready');
      console.log('🌐 Allowed socket origins:', allowedSocketOrigins);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

let isShuttingDown = false;

const gracefulShutdown = async () => {
  if (isShuttingDown) {
    console.log("Shutdown already in progress, ignoring duplicate signal");
    return;
  }

  isShuttingDown = true;
  const forceExit = setTimeout(() => {
    console.error("Forceful shutdown after 10s timeout.");
    process.exit(1);
  }, 10000);
  forceExit.unref();

  const shutdown = async (): Promise<void> => {
    try {
      // Step 1 — stop accepting new socket connections and drain existing ones
      await io.close();
      console.log('🔌 Socket.IO closed.');

      // Step 2 — stop accepting new HTTP connections
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
      console.log('🌐 HTTP server closed.');

      // Step 3 — close Redis connections last (adapter may still need them during step 1)
      await closeRedisConnections();
      console.log('✅ Server shut down cleanly.');
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  };

  await shutdown();
  process.exit(0);
};

// Graceful shutdown with proper order and force timeout
process.once("SIGTERM", gracefulShutdown);

// Handle SIGINT (Ctrl+C) same as SIGTERM
process.once("SIGINT", gracefulShutdown);

startServer();
export { io };