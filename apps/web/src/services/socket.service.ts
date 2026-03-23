import { io, Socket } from 'socket.io-client';
import { store } from '../redux/store';
import { addMessage, removeMessage, updateMessage, setTyping, updateUserStatus } from '../redux/slices/chatSlice';
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
let socketToken: string | null = null;

export const connectSocket = (token: string): Socket => {
  if (socket?.active && socketToken === token) {
    console.log('⚡ Socket already active with same token, reusing existing connection');
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    socketToken = null;
  }

  socketToken = token;
  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,  // Cap at 10s between retries
    reconnectionAttempts: Infinity, // Keep trying forever — handles Render cold starts
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

  // ← ADD: receives batch of messages missed while offline
  // Each message is dispatched individually through the same addMessage path.
  // The existing dedup guard in chatSlice (alreadyExists check) prevents
  // duplicates if the same message was already loaded via fetchMessages.
  socket.on('messages:queued', (messages: Message[]) => {
    messages.forEach((message) => {
      store.dispatch(addMessage({ roomId: message.roomId, message }));
    });
    console.log(`📬 Received ${messages.length} queued message(s)`);
  });

  // ← ADDED: server emits this when someone edits a message
  // Updates the content in the Redux store so all clients see the change
  socket.on('message:updated', (payload: {
    messageId: string;
    roomId: string;
    content: string;
  }) => {
    store.dispatch(updateMessage({
      roomId:    payload.roomId,
      messageId: payload.messageId,
      content:   payload.content,
    }));
  });

  // ← ADDED: server emits this when someone deletes a message
  // Removes it from the Redux store so all clients stop showing it
  socket.on('message:deleted', (payload: {
    messageId: string;
    roomId: string;
  }) => {
    store.dispatch(removeMessage({
      roomId:    payload.roomId,
      messageId: payload.messageId,
    }));
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
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    socketToken = null;
  }
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

// ─── Message send with acknowledgment ─────────────────────────────────────────
//
// Emits via socket instead of HTTP, with a 10s timeout guard.
// Returns the server-confirmed message on success.
// Rejects with a descriptive error on failure or timeout.
//
type SendAckResponse = { success: boolean; message?: Message; error?: string };

export const sendMessageWithAck = (payload: {
  roomId: string;
  content: string;
  type?: string;
  replyTo?: string;
}): Promise<Message> => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error('Socket is not connected'));
      return;
    }

    // Guard against a server that never calls the ack
    const timeout = setTimeout(() => {
      reject(new Error('Message acknowledgment timed out after 10s'));
    }, 10_000);

    socket.emit(
      'message:send',
      payload,
      (response: SendAckResponse) => {
        clearTimeout(timeout);
        if (response.success && response.message) {
          resolve(response.message);
        } else {
          reject(new Error(response.error ?? 'Failed to send message'));
        }
      },
    );
  });
};