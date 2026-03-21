// backend/src/controllers/message.controller.ts
import { Response, NextFunction } from "express";
import { z } from "zod";
import { Message } from "../models/message.model";
import { Room } from "../models/room.model";
import { cacheGet, cacheSet, cacheDel } from "../config/redis";
import { AuthRequest } from "../middlewares/auth.middleware";
import { getIO } from '../config/socket';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors';

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
    const page = Number.parseInt(req.query.page as string) || 1;
    const limit = Number.parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Verify user is participant
    const room = await Room.findOne({
      _id: roomId,
      participants: req.user?._id,
    });
    if (!room) {
      throw new ForbiddenError("Access denied to this room");
    }

    // Try cache first (only for page 1)
    if (page === 1) {
      const cached = await cacheGet<unknown>(`messages:${roomId}:page1`);
      if (cached) {
        res.json({ success: true, data: cached, fromCache: true });
        return;
      }
    }

    const [messages, total] = await Promise.all([
      Message.find({ roomId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sender", "username avatar isOnline")
        .populate("replyTo", "content sender"),
      Message.countDocuments({ roomId }),
    ]);

    const result = {
      messages: messages.slice().reverse(),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };

    // Cache page 1 for 60 seconds
    if (page === 1) {
      await cacheSet(`messages:${roomId}:page1`, result, 60);
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

    await Room.findByIdAndUpdate(roomId, { lastMessage: String(message._id) });
    await cacheDel(`messages:${roomId.toString()}:page1`);


    getIO().to(roomId.toString()).emit('message:received', message);

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

    await cacheDel(`messages:${String(message.roomId)}:page1`);

    // Emit the updated content to all clients in the room
    getIO().to(String(message.roomId)).emit('message:updated', {
      messageId: String(message._id),
      roomId:    String(message.roomId), // Explicitly convert ObjectId to string
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

    // Sender can delete within 24h; admin can delete any message at any time
    const isSender = message.sender.toString() === req.user?._id.toString();
    const isAdmin = req.user?.role === "admin";
    
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

    const roomId = message.roomId?.toString();
    if (!roomId) {
      throw new Error("Invalid room ID");
    }

    await message.deleteOne();
    await cacheDel(`messages:${roomId}:page1`);

    // Update room's lastMessage if the deleted message was the last one
    const room = await Room.findById(roomId);
    if (room?.lastMessage?.toString() === messageId) {
      const newestMessage = await Message.findOne({ roomId })
        .sort({ createdAt: -1 })
        .limit(1);
      
      if (newestMessage) {
        room.lastMessage = newestMessage._id;
      } else {
        room.lastMessage = undefined;
      }
      await room.save();
      
      // Invalidate room cache and emit updated room
      await cacheDel(`room:${roomId}`);
      await cacheDel(`room:${roomId}:preview`);
      getIO().to(roomId).emit('room:updated', { 
        roomId, 
        lastMessage: newestMessage ? {
          _id: String(newestMessage._id),
          content: newestMessage.content,
          createdAt: newestMessage.createdAt,
          sender: String(newestMessage.sender)
        } : null 
      });
    }

    // Emit deletion to the room — all clients remove the message from their list
    getIO().to(roomId).emit('message:deleted', { messageId, roomId });

    res.json({ success: true, message: "Message deleted" });
  } catch (error) {
    next(error);
  }
};
