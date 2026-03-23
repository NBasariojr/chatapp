// backend/src/services/socket.service.ts
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { Message } from '../models/message.model';
import { Room } from '../models/room.model';
import { cacheSet, cacheDel } from '../config/redis';
import { captureException } from '../config/sentry';
import { ObjectIdToString } from '../utils/objectId';

interface AuthSocket extends Socket {
  userId?: string;
  userRole?: string;
}

/**
 * Authenticate socket connection via JWT
 */
const authenticateSocket = async (socket: AuthSocket, next: (err?: Error) => void): Promise<void> => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) return next(new Error('Server configuration error'));

    const decoded = jwt.verify(token, secret) as { id: string; role: string };
    const user = await User.findById(decoded.id).select('_id role');

    if (!user) return next(new Error('User not found'));

    socket.userId = ObjectIdToString(user._id);
    socket.userRole = user.role;
    next();
  } catch (err) {
    console.error('❌ Socket auth error:', err);
    next(new Error('Invalid token'));
  }
};

/**
 * Delivers messages sent to the user's rooms while they were offline.
 * Uses lastSeen as the cursor — fetches all messages created after that timestamp.
 * Emits directly to the reconnecting socket only, not the whole room.
 *
 * Why MongoDB and not Redis: messages are already persisted in MongoDB.
 * A separate Redis queue would be a second source of truth with no benefit
 * at this scale. MongoDB with the existing { roomId, createdAt } index
 * makes this query fast even with large message histories.
 */
const deliverQueuedMessages = async (
  socket: AuthSocket,
  userId: string,
  roomIds: string[],
): Promise<void> => {
  try {
    const user = await User.findById(userId).select('lastSeen');
    if (!user?.lastSeen || roomIds.length === 0) return;

    // Fetch all messages sent to user's rooms after they went offline.
    // Limit 100 per reconnect — prevents flooding on long offline periods.
    // The existing compound index { roomId: 1, createdAt: -1 } covers this query.
    const missed = await Message.find({
      roomId: { $in: roomIds },
      createdAt: { $gt: user.lastSeen },
      sender: { $ne: userId }, // don't re-deliver the user's own messages
    })
      .sort({ createdAt: 1 }) // oldest first — correct chronological order
      .limit(100)
      .populate('sender', 'username avatar isOnline')
      .populate({
        path: 'replyTo',
        select: 'content type sender',
        populate: { path: 'sender', select: 'username' },
      });

    if (missed.length === 0) return;

    // Emit as a batch — one event, not N individual message:received events.
    // Frontend handles dedup via the existing addMessage guard in chatSlice.
    socket.emit('messages:queued', missed);

    console.log(`📬 Delivered ${missed.length} queued message(s) to user ${userId}`);
  } catch (error) {
    captureException(error, {
      userId,
      event: 'deliverQueuedMessages',
    });
    // Non-fatal — user will see messages on next manual refresh
  }
};

export const initSocketHandlers = (io: SocketServer): void => {
  // Auth middleware for all socket connections
  io.use(authenticateSocket);

  io.on('connection', async (socket: AuthSocket) => {
    const userId = socket.userId!;
    console.log(`🔌 User connected: ${userId}`);

    // Mark user online
    await User.findByIdAndUpdate(userId, { isOnline: true });
    await cacheSet(`online:${userId}`, true, 3600);

    // Broadcast online status to all connected clients
    socket.broadcast.emit('user:online', userId);

    // Join user to their rooms
    const rooms = await Room.find({ participants: userId }).select('_id');
    const roomIds = rooms.map((room) => {
      const id = ObjectIdToString(room._id);
      socket.join(id);
      return id;
    });

    // Deliver messages missed while offline - run in background
    // Don't await this to avoid blocking socket handler registration
    deliverQueuedMessages(socket, userId, roomIds).catch((error) => {
      captureException(error, {
        userId,
        event: 'deliverQueuedMessages',
      });
    });

    // Handle joining a specific room
    socket.on('room:join', (roomId: string) => {
      try {
        socket.join(roomId);
      } catch (error) {
        captureException(error, {
          userId: socket.userId,
          roomId,
          event: 'room:join',
        });
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on('room:leave', (roomId: string) => {
      try {
        socket.leave(roomId);
      } catch (error) {
        captureException(error, {
          userId: socket.userId,
          roomId,
          event: 'room:leave',
        });
        socket.emit('error', { message: 'Failed to leave room' });
      }
    });

    // Handle sending a message via socket
    socket.on(
      'message:send',
      async (
        payload: { roomId: string; content: string; type?: string; replyTo?: string },
        ack?: (res: { success: boolean; message?: unknown; error?: string }) => void,
      ) => {
        try {
          const { roomId, content, type = 'text', replyTo } = payload;

          if (!content || content.trim().length === 0) {
            ack?.({ success: false, error: 'Message content is empty' });
            return;
          }
          if (content.length > 5000) {
            ack?.({ success: false, error: 'Message exceeds maximum length' });
            return;
          }

          // Verify participant
          const room = await Room.findOne({ _id: roomId, participants: userId });
          if (!room) {
            ack?.({ success: false, error: 'Room not found or access denied' });
            return;
          }

          const message = await Message.create({
            content: content.trim(),
            type,
            sender: userId,
            roomId,
            ...(replyTo ? { replyTo } : {}),
          });

          await message.populate('sender', 'username avatar isOnline');

          await Room.findByIdAndUpdate(roomId, { lastMessage: message._id });

          await cacheDel(`messages:${roomId}:page1`);

          io.to(roomId).emit('message:received', message);

          ack?.({ success: true, message });
        } catch (error) {
          captureException(error, {
            userId: socket.userId,
            roomId: payload.roomId,
            event: 'message:send',
          });
          ack?.({ success: false, error: 'Failed to send message' });
          socket.emit('error', { message: 'Failed to send message' });
        }
      },
    );

    // Handle typing indicators
    socket.on('user:typing', ({ roomId }: { roomId: string }) => {
      try {
        socket.to(roomId).emit('user:typing', { roomId, userId });
      } catch (error) {
        captureException(error, {
          userId: socket.userId,
          roomId,
          event: 'user:typing',
        });
        socket.emit('error', { message: 'Failed to send typing indicator' });
      }
    });

    socket.on('user:stop-typing', ({ roomId }: { roomId: string }) => {
      try {
        socket.to(roomId).emit('user:stop-typing', { roomId, userId });
      } catch (error) {
        captureException(error, {
          userId: socket.userId,
          roomId,
          event: 'user:stop-typing',
        });
        socket.emit('error', { message: 'Failed to send stop typing indicator' });
      }
    });

    // Handle message read receipts
    socket.on('message:read', async ({ messageId, roomId }: { messageId: string; roomId: string }) => {
      try {
        await Message.findByIdAndUpdate(messageId, { status: 'read' });
        io.to(roomId).emit('message:read', { messageId, roomId, readBy: userId });
      } catch (error) {
        captureException(error, {
          userId: socket.userId,
          roomId,
          event: 'message:read',
          extra: { messageId },
        });
        socket.emit('error', { message: 'Failed to mark message as read' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      try {
        console.log(`🔌 User disconnected: ${userId}`);
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
        await cacheDel(`online:${userId}`);
        socket.broadcast.emit('user:offline', userId);
      } catch (error) {
        captureException(error, {
          userId: socket.userId,
          event: 'disconnect',
        });
        console.error('Error handling disconnect:', error);
      }
    });
  });
};