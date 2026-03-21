// backend/src/controllers/message.controller.ts
import { Response, NextFunction } from "express";
import { z } from "zod";
import { Message } from "../models/message.model";
import { Room } from "../models/room.model";
import { cacheGet, cacheSet, cacheDel } from "../config/redis";
import { AuthRequest } from "../middlewares/auth.middleware";
import { getIO } from '../config/socket';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors';
import { ObjectIdToString } from '../utils/objectId';

const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  type: z.enum(["text", "image", "video", "file"]).default("text"),
  replyTo: z.string().optional(),
});

const editMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const getMessages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { roomId } = req.params;
    const limit = Math.min(Number.parseInt(req.query.limit as string) || 50, 100);

    // `before` is an ISO timestamp — fetch messages older than this cursor.
    // Absent on initial load; present on "load more" requests.
    const before = req.query.before as string | undefined;

    // Verify user is participant
    const room = await Room.findOne({ _id: roomId, participants: req.user?._id });
    if (!room) {
      throw new ForbiddenError("Access denied to this room");
    }

    // Initial load only (no cursor) — check Redis cache
    const cacheKey = `messages:${roomId}:initial`;
    if (!before) {
      const cached = await cacheGet<unknown>(cacheKey);
      if (cached) {
        res.json({ success: true, data: cached, fromCache: true });
        return;
      }
    }

    // Build cursor filter — if `before` is provided, only fetch older messages.
    // The existing compound index { roomId: 1, createdAt: -1 } covers this query
    // exactly — MongoDB jumps to the cursor position without scanning skipped docs.
    const filter: Record<string, unknown> = { roomId };
    if (before) {
      const cursorDate = new Date(before);
      if (Number.isNaN(cursorDate.getTime())) {
        throw new TypeError('Invalid before cursor — expected ISO date string');
      }
      filter.createdAt = { $lt: cursorDate };
    }

    // Fetch limit + 1 to determine hasMore without a separate countDocuments call
    const raw = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate('sender', 'username avatar isOnline')
      .populate({
        path: 'replyTo',
        select: 'content type sender',
        populate: { path: 'sender', select: 'username' },
      });

    // If we got limit+1 back, there are more messages before this batch
    const hasMore = raw.length > limit;
    const messages = raw.slice(0, limit).reverse(); // oldest → newest for display

    const result = { messages, hasMore };

    // Cache only the initial load — cursor-based pages are not worth caching
    // (each client's cursor differs, cache hit rate would be near zero)
    if (!before) {
      await cacheSet(cacheKey, result, 60);
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { roomId } = req.params;
    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const room = await Room.findOne({ _id: roomId, participants: req.user?._id });
    if (!room) {
      throw new ForbiddenError("Access denied to this room");
    }

    const message = await Message.create({
      ...parsed.data,
      sender: req.user?._id,
      roomId,
    });

    await message.populate("sender", "username avatar isOnline");
    await message.populate({
      path: "replyTo",
      select: "content type sender",
      populate: { path: "sender", select: "username" },
    });

    await Room.findByIdAndUpdate(roomId, { lastMessage: ObjectIdToString(message._id) });
    await cacheDel(`messages:${ObjectIdToString(roomId)}:initial`);


    getIO().to(ObjectIdToString(roomId)).emit('message:received', message);

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

// ─── EDIT MESSAGE ─────────────────────────────────────────────────────────────
// Only the original sender can edit, and only within 15 minutes of sending.
// Emits message:updated to the room so all clients update their UI in real-time.

export const editMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { messageId } = req.params;

    const parsed = editMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const message = await Message.findById(messageId).populate("sender", "username avatar isOnline");
    if (!message) {
      throw new NotFoundError("Message");
    }

    // Only the sender can edit — admins cannot edit others' messages
    if (!message.sender._id.equals(req.user?._id)) {
      throw new ForbiddenError("Not authorized to edit this message");
    }

    // Enforce the 15-minute edit window — matches the frontend canEdit() guard
    const ageInMinutes = (Date.now() - message.createdAt.getTime()) / 60000;
    if (ageInMinutes > 15) {
      throw new ForbiddenError("Message can no longer be edited");
    }

    message.content = parsed.data.content;
    await message.save();

    await cacheDel(`messages:${ObjectIdToString(message.roomId)}:initial`);

    // Emit the updated content to all clients in the room
    getIO().to(ObjectIdToString(message.roomId)).emit('message:updated', {
      messageId: ObjectIdToString(message._id),
      roomId:    ObjectIdToString(message.roomId), // Explicitly convert ObjectId to string
      content:   message.content,
    });

    res.json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE MESSAGE ───────────────────────────────────────────────────────────
// FIX: now emits message:deleted so all clients remove it from their UI.
// Previously deleted from DB but never notified other clients in the room.

export const deleteMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);

    if (!message) {
      throw new NotFoundError("Message");
    }

    validateDeletePermission(req.user, message);

    const roomId = ObjectIdToString(message.roomId);
    if (!roomId) {
      throw new Error("Invalid room ID");
    }

    await message.deleteOne();
    await cacheDel(`messages:${roomId}:initial`);

    await updateRoomLastMessage(roomId, messageId);

    // Emit deletion to the room — all clients remove the message from their list
    getIO().to(roomId).emit('message:deleted', { messageId, roomId });

    res.json({ success: true, message: "Message deleted" });
  } catch (error) {
    next(error);
  }
};

const validateDeletePermission = (user: any, message: any): void => {
  const isSender = user?._id && ObjectIdToString(message.sender) === ObjectIdToString(user._id);
  const isAdmin = user?.role === "admin";
  
  if (!isSender && !isAdmin) {
    throw new ForbiddenError("Not authorized to delete this message");
  }

  // Enforce 24-hour window for non-admin senders
  if (isSender && !isAdmin) {
    const ageInHours = (Date.now() - message.createdAt.getTime()) / (1000 * 60 * 60);
    if (ageInHours > 24) {
      throw new ForbiddenError("Not authorized to delete this message");
    }
  }
};

const updateRoomLastMessage = async (roomId: string, deletedMessageId: string): Promise<void> => {
  const room = await Room.findById(roomId);
  if (!room?.lastMessage || ObjectIdToString(room.lastMessage) !== deletedMessageId) {
    return;
  }

  const newestMessage = await Message.findOne({ roomId })
    .sort({ createdAt: -1 })
    .limit(1);
  
  room.lastMessage = newestMessage?._id;
  await room.save();
  
  // Invalidate room cache and emit updated room
  await cacheDel(`room:${roomId}`);
  await cacheDel(`room:${roomId}:preview`);
  
  getIO().to(roomId).emit('room:updated', { 
    roomId, 
    lastMessage: newestMessage ? {
      _id: ObjectIdToString(newestMessage._id),
      content: newestMessage.content,
      createdAt: newestMessage.createdAt,
      sender: ObjectIdToString(newestMessage.sender)
    } : null 
  });
};
