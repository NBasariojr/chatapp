// backend/src/controllers/message.controller.ts
import { Response, NextFunction } from "express";
import { z } from "zod";
import { Message } from "../models/message.model";
import { Room } from "../models/room.model";
import { cacheGet, cacheSet, cacheDel } from "../config/redis";
import { AuthRequest } from "../middlewares/auth.middleware";

const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  type: z.enum(["text", "image", "video", "file"]).default("text"),
  replyTo: z.string().optional(),
});

export const getMessages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { roomId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
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
      messages: messages.reverse(),
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
      res
        .status(400)
        .json({ success: false, message: parsed.error.errors[0].message });
      return;
    }

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

    const message = await Message.create({
      ...parsed.data,
      sender: req.user?._id,
      roomId,
    });

    await message.populate("sender", "username avatar");

    // Update last message in room
    await Room.findByIdAndUpdate(roomId, { lastMessage: message._id });

    // Invalidate message cache for this room
    await cacheDel(`messages:${roomId}:page1`);

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

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

    // Only sender or admin can delete
    if (
      message.sender.toString() !== req.user?._id &&
      req.user?.role !== "admin"
    ) {
      res
        .status(403)
        .json({
          success: false,
          message: "Not authorized to delete this message",
        });
      return;
    }

    await message.deleteOne();
    await cacheDel(`messages:${message.roomId}:page1`);

    res.json({ success: true, message: "Message deleted" });
  } catch (error) {
    next(error);
  }
};
