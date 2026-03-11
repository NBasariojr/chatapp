// backend/src/services/socket.service.ts
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { Message } from '../models/message.model';
import { Room } from '../models/room.model';
import { cacheSet, cacheDel } from '../config/redis';

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

    socket.userId = user._id.toString();
    socket.userRole = user.role;
    next();
  } catch (err) {
    console.error('❌ Socket auth error:', err);
    next(new Error('Invalid token'));
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
    rooms.forEach((room) => {
      socket.join(room._id.toString());
    });

    // Handle joining a specific room
    socket.on('room:join', (roomId: string) => {
      socket.join(roomId);
    });

    socket.on('room:leave', (roomId: string) => {
      socket.leave(roomId);
    });

    // Handle sending a message via socket
    socket.on('message:send', async (payload: { roomId: string; content: string; type?: string }) => {
      try {
        const { roomId, content, type = 'text' } = payload;

        if (!content || content.trim().length === 0) return;
        if (content.length > 5000) return;

        // Verify participant
        const room = await Room.findOne({ _id: roomId, participants: userId });
        if (!room) return;

        const message = await Message.create({
          content: content.trim(),
          type,
          sender: userId,
          roomId,
        });

        await message.populate('sender', 'username avatar isOnline');

        // Update room's last message
        await Room.findByIdAndUpdate(roomId, { lastMessage: message._id });

        // Invalidate cache
        await cacheDel(`messages:${roomId}:page1`);

        // Broadcast to all participants in the room
        io.to(roomId).emit('message:received', message);
      } catch (err) {
        console.error('Socket message send error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('user:typing', ({ roomId }: { roomId: string }) => {
      socket.to(roomId).emit('user:typing', { roomId, userId });
    });

    socket.on('user:stop-typing', ({ roomId }: { roomId: string }) => {
      socket.to(roomId).emit('user:stop-typing', { roomId, userId });
    });

    // Handle message read receipts
    socket.on('message:read', async ({ messageId, roomId }: { messageId: string; roomId: string }) => {
      await Message.findByIdAndUpdate(messageId, { status: 'read' });
      io.to(roomId).emit('message:read', { messageId, roomId, readBy: userId });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${userId}`);
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
      await cacheDel(`online:${userId}`);
      socket.broadcast.emit('user:offline', userId);
    });
  });
};