import dotenv from 'dotenv';

import path from 'node:path';



// Load environment variables based on NODE_ENV

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });



import http from 'node:http';

import { Server as SocketServer } from 'socket.io';

import app from './app';

import { connectDB } from './config/database';

import { connectRedis } from './config/redis';

import { initSocketHandlers } from './services/socket.service';



const PORT = process.env.PORT || 4000;



const httpServer = http.createServer(app);



// Socket.IO CORS — mirrors app.ts to cover all dev origins

const allowedSocketOrigins = [

  process.env.CLIENT_URL || 'http://localhost:3000',

  process.env.NGROK_URL,

  'http://localhost:3000',

  'http://localhost:5173',

  'http://localhost:5174',

  'http://127.0.0.1:5173',

  'http://127.0.0.1:5174',

].filter(Boolean) as string[];



// Socket.IO setup

const io = new SocketServer(httpServer, {

  cors: {

    origin: (origin, callback) => {

      // Allow requests with no origin (Postman, mobile apps, curl)

      if (!origin) return callback(null, true);



      if (

        allowedSocketOrigins.some(

          (o) =>

            o === origin ||

            origin.endsWith('.ngrok-free.app') ||

            origin.endsWith('.ngrok.app')

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



// Initialize socket event handlers

initSocketHandlers(io);



const startServer = async (): Promise<void> => {

  try {

    await connectDB();

    await connectRedis();



    httpServer.listen(PORT, () => {

      console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);

      console.log(`📡 Socket.IO ready`);

      console.log(`🌐 Allowed socket origins:`, allowedSocketOrigins);

    });

  } catch (error) {

    console.error('❌ Failed to start server:', error);

    process.exit(1);

  }

};



// Graceful shutdown

process.on('SIGTERM', () => {

  console.log('SIGTERM received. Shutting down gracefully...');

  httpServer.close(() => {

    console.log('Server closed.');

    process.exit(0);

  });

});



startServer();



export { io };