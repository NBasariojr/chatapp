// web/src/services/socket.service.ts
import { io, Socket } from 'socket.io-client';
import { store } from '../redux/store';
import { addMessage, setTyping, updateUserStatus } from '../redux/slices/chatSlice';
import type { Message } from '@chatapp/shared';

// Connect to current page origin — Vite proxy forwards /socket.io/* to localhost:4000
// On desktop: connects to http://localhost:3000 → proxied to localhost:4000
// On mobile via ngrok: connects to https://xxx.ngrok-free.dev → proxied to localhost:4000
// This means no separate backend tunnel is needed for mobile web
const SOCKET_URL = globalThis.window === undefined
  ? 'http://localhost:3000'
  : globalThis.window.location.origin;

let socket: Socket | null = null;

export const connectSocket = (token: string): Socket => {
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