// backend/src/config/database.ts
import mongoose from 'mongoose';
import { db } from './index';

export const connectDB = async (): Promise<void> => {
  mongoose.set('strictQuery', false);

  mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected');
  });

  await mongoose.connect(db.uri, {
    serverSelectionTimeoutMS: db.serverSelectionTimeoutMS,
  });
};