// backend/src/models/user.model.ts
import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  username: string;
  email: string;
  password?: string;
  avatar?: string;
  role: 'user' | 'admin' | 'moderator';
  isOnline: boolean;
  lastSeen: Date;
  friends: mongoose.Types.ObjectId[];
  friendRequestsSent: mongoose.Types.ObjectId[];
  friendRequestsReceived: mongoose.Types.ObjectId[];
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      unique: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      unique: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never return password in queries
    },
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'moderator'],
      default: 'user',
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    friends: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    friendRequestsSent: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    friendRequestsReceived: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.password; // Never expose password
        return ret;
      },
    },
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

// Indexes
userSchema.index({ isOnline: 1 });

export const User = mongoose.model<IUser>('User', userSchema);