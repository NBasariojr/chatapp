import { io, Socket } from 'socket.io-client';
import { store } from '../redux/store';
import { addMessage, setTyping, updateUserStatus } from '../redux/slices/chatSlice';
import type { Message } from '@chatapp/shared';

// ─── Socket URL resolution ────────────────────────────────────────────────────
//
// Dev:  VITE_API_URL is unset → falls back to localhost:4000
//       Socket connects directly to the local backend
//
// Prod: VITE_API_URL = https://chatapp-backend.onrender.com (set in Vercel dashboard)
//       Socket connects directly to Render backend
//
// WHY NOT window.location.origin:
//   On Vercel, window.location.origin = https://your-app.vercel.app
//   Vercel is a static file host — it has no WebSocket server.
//   Socket.IO would get a 404 and fail silently on every connection attempt.
//   All real-time features (messages, typing, presence) would be broken.
//
const SOCKET_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;

export const connectSocket = (token: string): Socket => {
  if (socket?.connected) {
    console.log('⚡ Socket already connected, reusing existing connection');
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  socket.on('message:received', (message: Message) => {
    store.dispatch(addMessage({ roomId: message.roomId, message }));
  });

  socket.on('user:typing', ({ roomId, userId }: { roomId: string; userId: string }) => {
    store.dispatch(setTyping({ roomId, userId, isTyping: true }));
  });

  socket.on('user:stop-typing', ({ roomId, userId }: { roomId: string; userId: string }) => {
    store.dispatch(setTyping({ roomId, userId, isTyping: false }));
  });

  socket.on('user:online', (userId: string) => {
    store.dispatch(updateUserStatus({ userId, isOnline: true }));
  });

  socket.on('user:offline', (userId: string) => {
    store.dispatch(updateUserStatus({ userId, isOnline: false }));
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

  return socket;
};

export const disconnectSocket = (): void => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = (): Socket | null => socket;

export const joinRoom = (roomId: string): void => {
  socket?.emit('room:join', roomId);
};

export const leaveRoom = (roomId: string): void => {
  socket?.emit('room:leave', roomId);
};

export const sendTyping = (roomId: string): void => {
  socket?.emit('user:typing', { roomId });
};

export const stopTyping = (roomId: string): void => {
  socket?.emit('user:stop-typing', { roomId });
};