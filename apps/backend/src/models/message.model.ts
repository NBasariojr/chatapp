// backend/src/models/message.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  content: string;
  type: 'text' | 'image' | 'video' | 'file';
  status: 'sent' | 'delivered' | 'read';
  sender: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  mediaUrl?: string;
  replyTo?: mongoose.Types.ObjectId;
}

const messageSchema = new Schema<IMessage>(
  {
    content: {
      type: String,
      required: [true, 'Message content is required'],
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'file'],
      default: 'text',
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    mediaUrl: {
      type: String,
      default: null,
    },
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for fast message retrieval
messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);