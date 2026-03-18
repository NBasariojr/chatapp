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

const io = new SocketServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedSocketOrigins.some(
          (o) =>
            o === origin ||
            origin.endsWith(".ngrok-free.app") ||
            origin.endsWith(".ngrok.app") ||
            origin.endsWith(".vercel.app"),
        )
      ) {
        return callback(null, true);
      }
      console.warn(`🚫 Socket CORS blocked origin: ${origin}`);
      callback(new Error(`Socket CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  },
  pingTimeout: 60000,
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

const gracefulShutdown = async () => {
  const forceExit = setTimeout(() => {
    console.error("Forceful shutdown after 10s timeout.");
    process.exit(1);
  }, 10000);
  forceExit.unref();

  const shutdown = async () => {
    return new Promise<void>((resolve) => {
      httpServer.close(async () => {
        try {
          await io.close();
          await closeRedisConnections();
          console.log("Server closed.");
          resolve();
        } catch (error) {
          console.error("Error during shutdown:", error);
          resolve();
        }
      });
    });
  };

  await shutdown();
  process.exit(0);
};

// Graceful shutdown with proper order and force timeout
process.on("SIGTERM", gracefulShutdown);

// Handle SIGINT (Ctrl+C) same as SIGTERM
process.on("SIGINT", gracefulShutdown);

startServer();
export { io };