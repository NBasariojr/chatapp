// backend/src/models/room.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom extends Document {
  name?: string;
  isGroup: boolean;
  participants: mongoose.Types.ObjectId[];
  lastMessage?: mongoose.Types.ObjectId;
  avatar?: string;
  createdBy: mongoose.Types.ObjectId;
}

const roomSchema = new Schema<IRoom>(
  {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Room name cannot exceed 100 characters'],
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    avatar: {
      type: String,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Index for fast participant lookup
roomSchema.index({ participants: 1 });
roomSchema.index({ createdBy: 1 });

export const Room = mongoose.model<IRoom>('Room', roomSchema);