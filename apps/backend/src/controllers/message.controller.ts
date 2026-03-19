// backend/src/controllers/message.controller.ts
import { Response, NextFunction } from "express";
import { z } from "zod";
import { Message } from "../models/message.model";
import { Room } from "../models/room.model";
import { cacheGet, cacheSet, cacheDel } from "../config/redis";
import { AuthRequest } from "../middlewares/auth.middleware";
import { getIO } from '../config/socket';

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
      res
        .status(403)
        .json({ success: false, message: "Access denied to this room" });
      return;
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
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const room = await Room.findOne({ _id: roomId, participants: req.user?._id });
    if (!room) {
      res.status(403).json({ success: false, message: "Access denied to this room" });
      return;
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

    await Room.findByIdAndUpdate(roomId, { lastMessage: message._id.toString() });
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
      res.status(400).json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

    const message = await Message.findById(messageId).populate("sender", "username avatar isOnline");
    if (!message) {
      res.status(404).json({ success: false, message: "Message not found" });
      return;
    }

    // Only the sender can edit — admins cannot edit others' messages
    if (!message.sender._id.equals(req.user?._id)) {
      res.status(403).json({ success: false, message: "Not authorized to edit this message" });
      return;
    }

    // Enforce the 15-minute edit window — matches the frontend canEdit() guard
    const ageInMinutes = (Date.now() - message.createdAt.getTime()) / 60000;
    if (ageInMinutes > 15) {
      res.status(403).json({ success: false, message: "Message can no longer be edited" });
      return;
    }

    message.content = parsed.data.content;
    await message.save();

    await cacheDel(`messages:${String(message.roomId)}:page1`);

    // Emit the updated content to all clients in the room
    getIO().to(String(message.roomId)).emit('message:updated', {
      messageId: message._id.toString(),
      roomId:    message.roomId.toString(),
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
      res.status(404).json({ success: false, message: "Message not found" });
      return;
    }

    // Sender can delete within 24h; admin can delete any message at any time
    const isSender = message.sender.equals(req.user?._id);
    const isAdmin = req.user?.role === "admin";
    
    if (!isSender && !isAdmin) {
      res.status(403).json({ success: false, message: "Not authorized to delete this message" });
      return;
    }

    // Enforce 24-hour window for non-admin senders
    if (isSender && !isAdmin) {
      const ageInHours = (Date.now() - message.createdAt.getTime()) / (1000 * 60 * 60);
      if (ageInHours > 24) {
        res.status(403).json({ success: false, message: "Not authorized to delete this message" });
        return;
      }
    }

    const roomId = message.roomId.toString();

    await message.deleteOne();
    await cacheDel(`messages:${roomId}:page1`);

    // Emit deletion to the room — all clients remove the message from their list
    getIO().to(roomId).emit('message:deleted', { messageId, roomId });

    res.json({ success: true, message: "Message deleted" });
  } catch (error) {
    next(error);
  }
};
